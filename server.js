require("dotenv").config();
const express = require("express");
const app = express();
const { getLocalIpv4Address } = require("./utils/publicUrl");

app.use(express.static("public"));
app.use(express.json());

const cors = require("cors");
app.use(cors());

app.get("/", (req, res) => {
  res.json({ message: "FYP Auth System Running" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const verifyRoute = require("./routes/verify");
app.use("/api", verifyRoute);

const productRoute = require("./routes/product");
app.use("/api", productRoute);

const ledgerRoutes = require('./utils/ledger');
app.use('/api', ledgerRoutes.router); 

const pool = require("./config/db");

pool.connect()
  .then(() => console.log("Database connected successfully"))
  .catch((err) => console.error("Database connection error:", err));

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);

  const lanIp = getLocalIpv4Address();

  console.log(`Local URL: http://localhost:${PORT}/dashboard.html`);

  if (lanIp) {
    console.log(`Phone URL (same Wi-Fi): http://${lanIp}:${PORT}/dashboard.html`);
  }

  if (process.env.PUBLIC_URL) {
    console.log(`Cloudflare URL: ${process.env.PUBLIC_URL}/dashboard.html`);
  }
});


// cloudflared tunnel --url http://localhost:3000

