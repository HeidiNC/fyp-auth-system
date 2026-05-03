const crypto = require("crypto");

function getRequiredEnv(name, fallback) {
  const value = process.env[name] || fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getQrSecret() {
  return getRequiredEnv("QR_HMAC_SECRET", "change-me-in-env");
}

function signPayload(qrId, issuedAt) {
  return crypto
    .createHmac("sha256", getQrSecret())
    .update(`${qrId}.${issuedAt}`)
    .digest("hex");
}

function buildSignedPayload(qrId, issuedAt = new Date().toISOString()) {
  const payload = {
    qr_id: qrId,
    issued_at: issuedAt,
    sig: signPayload(qrId, issuedAt)
  };

  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function verifySignedPayload(encodedPayload) {
  if (!encodedPayload) {
    return { valid: false, reason: "Missing QR payload" };
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    );
    const { qr_id: qrId, issued_at: issuedAt, sig } = parsed;

    if (!qrId || !issuedAt || !sig) {
      return { valid: false, reason: "Incomplete QR payload" };
    }

    const expectedSig = signPayload(qrId, issuedAt);
    const isValid =
      sig.length === expectedSig.length &&
      crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));

    if (!isValid) {
      return { valid: false, reason: "Invalid QR signature" };
    }

    return {
      valid: true,
      qrId,
      issuedAt
    };
  } catch (err) {
    return { valid: false, reason: "Malformed QR payload" };
  }
}

function buildVerificationUrl(baseUrl, qrId, issuedAt) {
  const payload = buildSignedPayload(qrId, issuedAt);
  return {
    payload,
    qrUrl: `${baseUrl}/verify.html?payload=${encodeURIComponent(payload)}`
  };
}

module.exports = {
  buildSignedPayload,
  buildVerificationUrl,
  verifySignedPayload
};
