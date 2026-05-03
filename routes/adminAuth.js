const express = require("express");
const {
  clearAdminCookie,
  createAdminToken,
  setAdminCookie,
  verifyAdminToken
} = require("../utils/adminAuth");

const router = express.Router();

function getExpectedCredentials() {
  return {
    username: process.env.ADMIN_USERNAME || "admin",
    password: process.env.ADMIN_PASSWORD || "admin123"
  };
}

router.post("/admin/login", (req, res) => {
  const { username, password } = req.body;
  const expected = getExpectedCredentials();

  if (username !== expected.username || password !== expected.password) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const token = createAdminToken(username);
  setAdminCookie(res, token);

  return res.json({ message: "Login successful" });
});

router.post("/admin/logout", (req, res) => {
  clearAdminCookie(res);
  return res.json({ message: "Logged out" });
});

router.get("/admin/session", (req, res) => {
  const admin = verifyAdminToken(req);

  if (!admin) {
    return res.status(401).json({ authenticated: false });
  }

  return res.json({
    authenticated: true,
    username: admin.username
  });
});

module.exports = router;
