-- Bounded deletion retry diagnostics. Never store Clerk responses, secrets or email.
CREATE TABLE IF NOT EXISTS lab_studio_identity_cleanup_attempts (
  customer_id TEXT PRIMARY KEY REFERENCES lab_customers(id),
  attempted_at INTEGER NOT NULL,
  issue TEXT
);
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0035-studio-identity-cleanup-attempts',CAST(strftime('%s','now') AS INTEGER)*1000);
