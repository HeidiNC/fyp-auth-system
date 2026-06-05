const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { insertLedger } = require("../utils/ledger");
const { verifySignedPayload } = require("../utils/qrSecurity");

const SCAN_WINDOW_MINUTES = Number(process.env.CLONE_WINDOW_MINUTES || 10);
const SCAN_HIGH_RISK_COUNT = Number(process.env.CLONE_MAX_SCANS || 3);
const SCAN_MEDIUM_RISK_COUNT = Number(process.env.CLONE_NORMAL_THRESHOLD || 2);
const DISTANCE_THRESHOLD_KM = Number(process.env.CLONE_DISTANCE_KM || 50);
const MAX_TRAVEL_MINUTES = Number(process.env.CLONE_MAX_TRAVEL_MINUTES || 10);
const MEDIUM_RISK_SCORE = Number(process.env.CLONE_MEDIUM_RISK_SCORE || 25);
const HIGH_RISK_SCORE = Number(process.env.CLONE_HIGH_RISK_SCORE || 50);
const VERY_HIGH_RISK_SCORE = Number(process.env.CLONE_VERY_HIGH_RISK_SCORE || 80);

function parseLocation(rawLocation) {
  if (!rawLocation) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawLocation);

    if (
      typeof parsed.latitude === "number" &&
      typeof parsed.longitude === "number"
    ) {
      return parsed;
    }
  } catch (err) {
    return null;
  }

  return null;
}

function haversineDistanceKm(a, b) {
  const toRadians = value => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine));
}

function minutesBetween(first, second) {
  return Math.abs(new Date(second) - new Date(first)) / 60000;
}

function getScanContext(scans) {
  const locations = new Set();

  scans.forEach(scan => {
    const location = parseLocation(scan.scan_location);
    if (location) {
      locations.add(`${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}`);
    }
  });

  return {
    locationCount: locations.size,
    hasDifferentLocation: locations.size > 1
  };
}

function getScanSpanMinutes(scans) {
  if (scans.length < 2) {
    return 0;
  }

  return minutesBetween(scans[0].scan_time, scans[scans.length - 1].scan_time);
}

function classifyRisk(score, reasons) {
  if (score >= VERY_HIGH_RISK_SCORE) {
    return {
      risk: "Very High",
      score,
      message:
        "Severe clone-risk indicators detected. Administrator review and possible revocation are recommended.",
      reasons
    };
  }

  if (score >= HIGH_RISK_SCORE) {
    return {
      risk: "High",
      score,
      message: "Strong indicators of possible QR code cloning were detected.",
      reasons
    };
  }

  if (score >= MEDIUM_RISK_SCORE) {
    return {
      risk: "Medium",
      score,
      message: "Unusual scan behaviour detected. Further monitoring is recommended.",
      reasons
    };
  }

  return {
    risk: "Low",
    score,
    message: "Product verified successfully",
    reasons
  };
}

function analyzeScanHistory(scans) {
  let score = 0;
  const reasons = [];

  for (let index = 1; index < scans.length; index += 1) {
    const previous = scans[index - 1];
    const current = scans[index];
    const previousLocation = parseLocation(previous.scan_location);
    const currentLocation = parseLocation(current.scan_location);

    if (!previousLocation || !currentLocation) {
      continue;
    }

    const distanceKm = haversineDistanceKm(previousLocation, currentLocation);
    const travelMinutes = minutesBetween(previous.scan_time, current.scan_time);

    if (
      distanceKm > DISTANCE_THRESHOLD_KM &&
      travelMinutes < MAX_TRAVEL_MINUTES
    ) {
      score += 60;
      reasons.push("Geographically distant scans occurred within an unrealistic timeframe");
      break;
    }
  }

  const scanContext = getScanContext(scans);
  const scanSpanMinutes = getScanSpanMinutes(scans);

  if (scanContext.locationCount > 1 && scans.length > SCAN_HIGH_RISK_COUNT) {
    score += 30;
    reasons.push("High scan frequency from different approximate locations");
  } else if (
    scanContext.locationCount > 1 &&
    scans.length > SCAN_MEDIUM_RISK_COUNT
  ) {
    score += 15;
    reasons.push("Repeated scans from different approximate locations");
  }

  if (scanContext.locationCount > 1) {
    score += 10;
    reasons.push("Scans were recorded from more than one approximate location");
  }

  if (
    scanContext.locationCount > 1 &&
    scans.length > SCAN_HIGH_RISK_COUNT &&
    scanSpanMinutes <= Math.max(2, SCAN_WINDOW_MINUTES / 2)
  ) {
    score += 20;
    reasons.push("Sudden scan spike detected within a short period");
  }

  return classifyRisk(score, reasons);
}

router.post("/verify", async (req, res) => {
  const { payload } = req.body;
  let client;
  let transactionStarted = false;

  try {
    console.log("VERIFY HIT");

    const validatedPayload = verifySignedPayload(payload);

    if (!validatedPayload.valid) {
      return res.json({
        status: "Invalid",
        message: validatedPayload.reason
      });
    }

    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    const result = await client.query(
      `SELECT q.qr_id, q.qr_value, q.is_active,
              p.product_id, p.product_name, p.serial_number, p.product_status,
              p.revoke_reason
       FROM qr_code q
       JOIN product p ON q.product_id = p.product_id
       WHERE q.qr_value = $1`,
      [validatedPayload.qrId]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.json({
        status: "Invalid",
        message: "QR payload does not match a registered product"
      });
    }

    const data = result.rows[0];
    const ip =
      (req.headers["x-forwarded-for"] || "").split(",")[0] ||
      req.socket.remoteAddress;
    const device = req.headers["user-agent"];

    let location = JSON.stringify({
      label: "Unknown",
      latitude: null,
      longitude: null
    });

    try {
      const geoRes = await fetch(`http://ip-api.com/json/${ip}`);
      const geoData = await geoRes.json();

      if (geoData.status === "success") {
        location = JSON.stringify({
          label:
            [geoData.city, geoData.country].filter(Boolean).join(", ") ||
            "Unknown",
          latitude: Number(geoData.lat),
          longitude: Number(geoData.lon)
        });
      }
    } catch (err) {
      console.log("Geo lookup failed");
    }

    await client.query(
      `INSERT INTO scan_log (qr_id, ip_address, device_type, scan_location)
       VALUES ($1, $2, $3, $4)`,
      [data.qr_id, ip, device, location]
    );

    await insertLedger("VERIFY", data.qr_id, client);

    if (data.product_status === "revoked" || data.is_active === false) {
      await client.query("COMMIT");
      transactionStarted = false;

      return res.json({
        status: "Revoked",
        reason: data.revoke_reason,
        message: "This product has been revoked"
      });
    }

    const scanCountResult = await client.query(
      `SELECT COUNT(*) FROM scan_log WHERE qr_id = $1`,
      [data.qr_id]
    );
    const scanCount = parseInt(scanCountResult.rows[0].count, 10);

    const recentScanResult = await client.query(
      `SELECT scan_time, scan_location
       FROM scan_log
       WHERE qr_id = $1
         AND scan_time >= NOW() - ($2::text || ' minutes')::interval
       ORDER BY scan_time ASC`,
      [data.qr_id, SCAN_WINDOW_MINUTES]
    );

    const riskAssessment = analyzeScanHistory(recentScanResult.rows);

    await client.query(
      `INSERT INTO clone_risk (qr_id, risk_level)
       VALUES ($1, $2)
       ON CONFLICT (qr_id)
       DO UPDATE SET risk_level = EXCLUDED.risk_level`,
      [data.qr_id, riskAssessment.risk]
    );

    let status = "Authentic";
    if (riskAssessment.risk !== "Low") {
      status = "Suspicious";
    }

    await client.query("COMMIT");
    transactionStarted = false;

    return res.json({
      status,
      product: data.product_name,
      serial: data.serial_number,
      scans: scanCount,
      risk: riskAssessment.risk,
      risk_score: riskAssessment.score,
      risk_reasons: riskAssessment.reasons,
      message: riskAssessment.message
    });
  } catch (err) {
    if (client && transactionStarted) {
      await client.query("ROLLBACK");
    }

    console.error("ERROR:", err.message);
    res.status(500).json({ error: "Server error" });
  } finally {
    if (client) {
      client.release();
    }
  }
});

module.exports = router;
