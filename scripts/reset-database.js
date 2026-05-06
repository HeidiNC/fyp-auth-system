require("dotenv").config();

const pool = require("../config/db");

const TABLES = [
  "ledger_block",
  "clone_risk",
  "scan_log",
  "qr_code",
  "product"
];

function backupSuffix() {
  return new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 14);
}

async function main() {
  const client = await pool.connect();
  const suffix = backupSuffix();

  try {
    await client.query("BEGIN");

    for (const table of TABLES) {
      await client.query(`CREATE TABLE ${table}_backup_${suffix} AS TABLE ${table}`);
    }

    await client.query(
      `TRUNCATE TABLE product, qr_code, scan_log, clone_risk, ledger_block
       RESTART IDENTITY CASCADE`
    );

    await client.query("COMMIT");

    console.log(`Backup suffix: ${suffix}`);
    console.log("Database reset complete");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
