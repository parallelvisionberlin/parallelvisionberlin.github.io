-- PV LAB only. Owner reviews are for active unpaid promotional-abuse holds.
-- This table stores metadata only: no creative prompts, images or network identifiers.
CREATE TABLE IF NOT EXISTS lab_owner_generation_review_audit (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  customer_id TEXT NOT NULL REFERENCES lab_customers(id),
  job_id TEXT,
  action TEXT NOT NULL CHECK(action IN ('gallery_opened','thumbnail_requested')),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lab_owner_generation_review_audit_date
  ON lab_owner_generation_review_audit(created_at);
CREATE INDEX IF NOT EXISTS lab_owner_generation_review_audit_customer
  ON lab_owner_generation_review_audit(customer_id,created_at DESC);
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0026-generation-review-audit',CAST(strftime('%s','now') AS INTEGER)*1000);
