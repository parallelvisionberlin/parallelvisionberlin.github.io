-- PV LAB transactional account-creation email. No email addresses or content in this queue.
CREATE TABLE IF NOT EXISTS lab_signup_welcome_emails (
  customer_id TEXT PRIMARY KEY REFERENCES lab_customers(id),
  state TEXT NOT NULL DEFAULT 'pending'
    CHECK(state IN ('pending','sending','sent','failed','uncertain','skipped')),
  queued_at INTEGER NOT NULL,
  attempted_at INTEGER,
  sent_at INTEGER,
  provider_message_id TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);
CREATE INDEX IF NOT EXISTS lab_signup_welcome_emails_pending
  ON lab_signup_welcome_emails(state,queued_at);
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0031-signup-welcome-email',CAST(strftime('%s','now') AS INTEGER)*1000);
