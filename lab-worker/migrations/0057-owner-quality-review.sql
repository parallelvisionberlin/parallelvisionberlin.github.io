-- Internal QA access metadata only. Retention is enforced by scheduled cleanup.
CREATE TABLE IF NOT EXISTS lab_owner_quality_review_audit (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  customer_id TEXT NOT NULL REFERENCES lab_customers(id),
  job_id TEXT,
  action TEXT NOT NULL CHECK(action IN ('page_opened','thumbnail_requested','preview_requested')),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lab_owner_quality_review_audit_date
  ON lab_owner_quality_review_audit(created_at);
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0057-owner-quality-review',CAST(strftime('%s','now') AS INTEGER)*1000);
