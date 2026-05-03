const { Pool } = require('pg');

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.DB_SSL === "false"
          ? false
          : { rejectUnauthorized: false }
    }
  : {
      user: process.env.DB_USER || "postgres",
      host: process.env.DB_HOST || "localhost",
      database: process.env.DB_NAME || "fyp_auth",
      password: process.env.DB_PASSWORD || "fyp2026",
      port: Number(process.env.DB_PORT || 5432)
    };

const pool = new Pool(poolConfig);

module.exports = pool;
