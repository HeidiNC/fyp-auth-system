CREATE TABLE IF NOT EXISTS product (
  product_id SERIAL PRIMARY KEY,
  manufacturer_id INTEGER,
  product_name TEXT NOT NULL,
  serial_number TEXT NOT NULL UNIQUE,
  product_status TEXT NOT NULL DEFAULT 'active',
  revoke_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qr_code (
  qr_id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES product(product_id) ON DELETE CASCADE,
  qr_value UUID NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scan_log (
  scan_id SERIAL PRIMARY KEY,
  qr_id INTEGER NOT NULL REFERENCES qr_code(qr_id) ON DELETE CASCADE,
  ip_address TEXT,
  device_type TEXT,
  scan_location TEXT,
  scan_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clone_risk (
  qr_id INTEGER PRIMARY KEY REFERENCES qr_code(qr_id) ON DELETE CASCADE,
  risk_level TEXT NOT NULL DEFAULT 'Low',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ledger_block (
  block_id SERIAL PRIMARY KEY,
  previous_hash TEXT NOT NULL,
  current_hash TEXT NOT NULL,
  data_type TEXT NOT NULL,
  data_reference_id INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_log_qr_time
  ON scan_log(qr_id, scan_time DESC);

CREATE INDEX IF NOT EXISTS idx_product_status
  ON product(product_status);
