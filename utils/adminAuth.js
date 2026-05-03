const jwt = require("jsonwebtoken");

const COOKIE_NAME = "admin_token";

function getCookie(req, name) {
  const cookies = req.headers.cookie || "";
  const parts = cookies.split(";").map(part => part.trim());
  const cookie = parts.find(part => part.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.split("=").slice(1).join("=")) : "";
}

function getAdminSecret() {
  return (
    process.env.ADMIN_JWT_SECRET ||
    process.env.JWT_SECRET ||
    process.env.QR_HMAC_SECRET ||
    "change-this-admin-secret"
  );
}

function createAdminToken(username) {
  return jwt.sign({ role: "admin", username }, getAdminSecret(), {
    expiresIn: "8h"
  });
}

function verifyAdminToken(req) {
  const token = getCookie(req, COOKIE_NAME);

  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, getAdminSecret());
  } catch (err) {
    return null;
  }
}

function requireAdminPage(req, res, next) {
  if (verifyAdminToken(req)) {
    return next();
  }

  return res.redirect(`/login.html?next=${encodeURIComponent(req.originalUrl)}`);
}

function requireAdminApi(req, res, next) {
  if (verifyAdminToken(req)) {
    return next();
  }

  return res.status(401).json({ error: "Admin login required" });
}

function setAdminCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 8 * 60 * 60 * 1000
  });
}

function clearAdminCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
}

module.exports = {
  clearAdminCookie,
  createAdminToken,
  requireAdminApi,
  requireAdminPage,
  setAdminCookie,
  verifyAdminToken
};
