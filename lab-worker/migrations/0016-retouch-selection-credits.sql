-- PV Lab Retouch customer Magic Select receipts. LAB_DB only; no Nina tables.
-- Provider selections are metered individually and charged before submitting to fal.ai.
-- Same selection ID must never start a second paid call.
CREATE TABLE IF NOT EXISTS lab_precision_selections (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES lab_customers(id),
  source_id TEXT NOT NULL,
  point_x INTEGER NOT NULL,
  point_y INTEGER NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('reserving','submitting','queued','completed','failed','uncertain')),
  provider_id TEXT UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lab_precision_selections_customer
  ON lab_precision_selections(owner_id,created_at DESC);
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0016-retouch-selection-credits',CAST(strftime('%s','now') AS INTEGER)*1000);
