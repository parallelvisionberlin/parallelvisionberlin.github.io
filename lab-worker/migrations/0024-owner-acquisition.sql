-- PV LAB-only, forward-looking checkout and verified cash receipt ledger.
-- No card information, personal details, media or client-supplied prices.
CREATE TABLE IF NOT EXISTS lab_checkout_attempts (
  session_id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES lab_customers(id),
  sku TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK(amount_cents >= 0),
  created_at INTEGER NOT NULL,
  paid_at INTEGER
);
CREATE INDEX IF NOT EXISTS lab_checkout_attempts_created ON lab_checkout_attempts(created_at);
CREATE INDEX IF NOT EXISTS lab_checkout_attempts_customer ON lab_checkout_attempts(customer_id,created_at);
CREATE TABLE IF NOT EXISTS lab_revenue_events (
  reference TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES lab_customers(id),
  amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lab_revenue_events_created ON lab_revenue_events(created_at);
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0024-owner-acquisition',CAST(strftime('%s','now') AS INTEGER)*1000);
