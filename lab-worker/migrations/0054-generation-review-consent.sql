-- PV LAB: customers choose whether their saved creative outputs may be inspected for quality review.
-- Default is off. Revocation is checked at every owner preview request.
CREATE TABLE IF NOT EXISTS lab_customer_generation_review_consent (
  customer_id TEXT PRIMARY KEY REFERENCES lab_customers(id) ON DELETE CASCADE,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lab_customer_generation_review_consent_updated
  ON lab_customer_generation_review_consent(updated_at);
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0054-generation-review-consent',CAST(strftime('%s','now') AS INTEGER)*1000);
