const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { insertLedger } = require("../utils/ledger");
const QRCode = require("qrcode");
const crypto = require("crypto");
const { buildVerificationUrl } = require("../utils/qrSecurity");
const { buildPublicBaseUrl } = require("../utils/publicUrl");

const DISTANCE_THRESHOLD_KM = Number(process.env.CLONE_DISTANCE_KM || 50);
const MAX_TRAVEL_MINUTES = Number(process.env.CLONE_MAX_TRAVEL_MINUTES || 10);

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

function buildPerScanStatuses(rows) {
  const rowsByQr = new Map();

  rows.forEach(row => {
    if (!rowsByQr.has(row.qr_id)) {
      rowsByQr.set(row.qr_id, []);
    }

    rowsByQr.get(row.qr_id).push(row);
  });

  const suspiciousKeys = new Set();
  const suspiciousReasons = new Map();

  for (const qrRows of rowsByQr.values()) {
    const ordered = [...qrRows].sort(
      (a, b) => new Date(a.scan_time) - new Date(b.scan_time)
    );

    for (let index = 1; index < ordered.length; index += 1) {
      const previous = ordered[index - 1];
      const current = ordered[index];
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
        const key = `${current.qr_id}:${current.scan_time}`;
        suspiciousKeys.add(key);
        suspiciousReasons.set(
          key,
          `Different location detected within ${Math.round(
            travelMinutes
          )} minute(s)`
        );
      }
    }
  }

  return rows.map(row => ({
    ...row,
    display_reason:
      row.product_status === "revoked"
        ? "Product revoked by manufacturer"
        : suspiciousReasons.get(`${row.qr_id}:${row.scan_time}`) ||
          "Normal scan activity",
    display_status:
      row.product_status === "revoked"
        ? "Revoked"
        : suspiciousKeys.has(`${row.qr_id}:${row.scan_time}`)
          ? "Suspicious"
          : "Active"
  }));
}

router.post("/product/register", async (req, res) => {
  const { name, manufacturer_id, serial_number } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const productResult = await client.query(
      `INSERT INTO product (manufacturer_id, product_name, serial_number)
       VALUES ($1, $2, $3) RETURNING *`,
      [manufacturer_id, name, serial_number]
    );

    const product = productResult.rows[0];
    const qr_value = crypto.randomUUID();

    await client.query(
      `INSERT INTO qr_code (product_id, qr_value)
       VALUES ($1, $2)`,
      [product.product_id, qr_value]
    );

    await insertLedger("REGISTER", product.product_id, client);

    const baseUrl = buildPublicBaseUrl(req);
    const { payload, qrUrl } = buildVerificationUrl(baseUrl, qr_value);
    const qrImage = await QRCode.toDataURL(qrUrl);

    await client.query("COMMIT");

    res.json({
      message: "Product registered",
      qr_value,
      qr_payload: payload,
      qr_url: qrUrl,
      qr_image: qrImage
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ERROR:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

router.post("/product/revoke", async (req, res) => {
  const { product_id, reason } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const productResult = await client.query(
      `SELECT product_status FROM product WHERE product_id = $1`,
      [product_id]
    );

    if (productResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Product not found" });
    }

    if (productResult.rows[0].product_status !== "active") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Invalid revocation request. Only active products can be revoked."
      });
    }

    await client.query(
      `UPDATE product
       SET product_status = 'revoked',
           revoke_reason = $2,
           updated_at = NOW()
       WHERE product_id = $1`,
      [product_id, reason]
    );

    await client.query(
      `UPDATE qr_code
       SET is_active = false
       WHERE product_id = $1`,
      [product_id]
    );

    await insertLedger("REVOKE", product_id, client);
    await client.query("COMMIT");

    res.json({ message: "Product revoked with reason" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Revocation failed" });
  } finally {
    client.release();
  }
});

router.get("/product/count", async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) FROM product");
    res.json({ total: result.rows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/product/revoked/count", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) FROM product WHERE product_status = 'revoked'`
    );
    res.json({ total: result.rows[0].count });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/product/list", async (req, res) => {
  const result = await pool.query(
    `SELECT
      p.product_id,
      p.product_name,
      p.serial_number,
      p.product_status,
      q.qr_value,
      p.created_at
    FROM product p
    JOIN qr_code q ON p.product_id = q.product_id
    ORDER BY p.product_id DESC`
  );

  const baseUrl = buildPublicBaseUrl(req);

  res.json(
    result.rows.map(product => {
      const { payload, qrUrl } = buildVerificationUrl(baseUrl, product.qr_value);

      return {
        ...product,
        qr_payload: payload,
        qr_url: qrUrl
      };
    })
  );
});

router.get("/product/suspicious", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        p.product_id,
        p.product_name,
        p.serial_number,
        p.product_status,
        cr.risk_level,
        q.qr_value,
        p.created_at
      FROM product p
      JOIN qr_code q ON p.product_id = q.product_id
      JOIN clone_risk cr ON q.qr_id = cr.qr_id
      WHERE p.product_status <> 'revoked'
        AND cr.risk_level IN ('Medium', 'High', 'Very High')
      ORDER BY
        CASE cr.risk_level
          WHEN 'Very High' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          ELSE 4
        END,
        p.product_id DESC
      `
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/scan/count", async (req, res) => {
  try {
    const result = await pool.query(`SELECT COUNT(*) FROM scan_log`);
    res.json({ total: result.rows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/scan/daily", async (req, res) => {
  const result = await pool.query(`
    SELECT TO_CHAR(scan_time, 'YYYY-MM-DD') as date,
           COUNT(*) as count
    FROM scan_log
    GROUP BY date
    ORDER BY date
  `);
  res.json(result.rows);
});

router.get("/scan/logs", async (req, res) => {
  try {
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "50", 10) || 50, 1),
      200
    );
    const page = Math.max(parseInt(req.query.page || "1", 10) || 1, 1);
    const offset = (page - 1) * limit;

    const totalResult = await pool.query(`SELECT COUNT(*) FROM scan_log`);
    const total = parseInt(totalResult.rows[0].count, 10);
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    const result = await pool.query(
      `
      SELECT
        q.qr_id,
        s.scan_time,
        s.ip_address,
        s.device_type,
        s.scan_location,
        p.product_name,
        p.serial_number,
        p.product_status
      FROM scan_log s
      JOIN qr_code q ON s.qr_id = q.qr_id
      JOIN product p ON q.product_id = p.product_id
      ORDER BY s.scan_time DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    );

    res.json({
      items: buildPerScanStatuses(result.rows),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasPrevious: page > 1,
        hasNext: page < totalPages
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/product/revoked", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        product_name,
        serial_number,
        revoke_reason,
        updated_at
      FROM product
      WHERE product_status = 'revoked'
      ORDER BY updated_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
