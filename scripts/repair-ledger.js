require("dotenv").config();

const crypto = require("crypto");
const pool = require("../config/db");

function generateHash(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function pad(value, size = 2) {
  return String(value).padStart(size, "0");
}

function formatStoredTimestamp(timestamp) {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
    ":",
    pad(date.getSeconds()),
    ".",
    pad(date.getMilliseconds(), 3),
    "Z"
  ].join("");
}

function backupTableName() {
  const suffix = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 14);

  return `ledger_block_backup_${suffix}`;
}

async function main() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const backupTable = backupTableName();
    await client.query(`CREATE TABLE ${backupTable} AS TABLE ledger_block`);

    const blocks = (
      await client.query(
        `SELECT block_id, data_type, data_reference_id, timestamp
         FROM ledger_block
         ORDER BY block_id ASC
         FOR UPDATE`
      )
    ).rows;

    let previousHash = "GENESIS";

    for (const block of blocks) {
      const blockData = [
        block.data_type,
        block.data_reference_id,
        formatStoredTimestamp(block.timestamp),
        previousHash
      ].join("-");
      const currentHash = generateHash(blockData);

      await client.query(
        `UPDATE ledger_block
         SET previous_hash = $1,
             current_hash = $2
         WHERE block_id = $3`,
        [previousHash, currentHash, block.block_id]
      );

      previousHash = currentHash;
    }

    await client.query("COMMIT");

    console.log(`Backup table: ${backupTable}`);
    console.log(`Repaired blocks: ${blocks.length}`);
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
