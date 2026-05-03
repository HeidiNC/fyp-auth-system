const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const crypto = require("crypto");

// 🔐 Generate SHA256 hash
function generateHash(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function buildBlockData(type, refId, timestamp, previousHash) {
  return `${type}-${refId}-${timestamp}-${previousHash}`;
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

// 🔥 Insert ledger block (with proper timestamp + chaining)
async function insertLedger(type, refId, db = pool) {
  const last = await db.query(
    `SELECT current_hash FROM ledger_block ORDER BY block_id DESC LIMIT 1`
  );

  const previous_hash = last.rows.length
    ? last.rows[0].current_hash
    : "GENESIS";

  const timestamp = new Date().toISOString();
  const data = buildBlockData(type, refId, timestamp, previous_hash);
  const current_hash = generateHash(data);

  await db.query(
    `INSERT INTO ledger_block 
     (previous_hash, current_hash, data_type, data_reference_id, timestamp)
     VALUES ($1, $2, $3, $4, $5)`,
    [previous_hash, current_hash, type, refId, timestamp]
  );
}

// 🔍 View blockchain + integrity check
router.get("/ledger", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM ledger_block ORDER BY block_id ASC`
    );

    let isValid = true;
    let previousHash = "GENESIS";

    // 🔗 Validate chain and recompute each block hash
    for (const block of result.rows) {
      const expectedHash = generateHash(
        buildBlockData(
          block.data_type,
          block.data_reference_id,
          formatStoredTimestamp(block.timestamp),
          block.previous_hash
        )
      );

      if (
        block.previous_hash !== previousHash ||
        block.current_hash !== expectedHash
      ) {
        isValid = false;
        break;
      }

      previousHash = block.current_hash;
    }

    // 📦 Format output
    const chain = result.rows.map(block => ({
      block_height: block.block_id,
      hash: block.current_hash,
      previous_hash: block.previous_hash,
      recalculated_hash: generateHash(
        buildBlockData(
          block.data_type,
          block.data_reference_id,
          formatStoredTimestamp(block.timestamp),
          block.previous_hash
        )
      ),
      data_payload: {
        type: block.data_type,
        ref_id: block.data_reference_id
      },
      block_valid:
        block.current_hash ===
        generateHash(
          buildBlockData(
            block.data_type,
            block.data_reference_id,
            formatStoredTimestamp(block.timestamp),
            block.previous_hash
          )
        ),
      timestamp: block.timestamp
    }));

    res.json({
      isValid,
      total_blocks: chain.length,
      chain
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch ledger" });
  }
});

module.exports = {
  router,
  insertLedger
};
