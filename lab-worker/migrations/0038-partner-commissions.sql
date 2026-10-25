-- PV LAB only. Signed-payment timing for the approved partner commission policy.
-- No payouts, promotional allocations or wallet changes.
CREATE INDEX IF NOT EXISTS lab_revenue_events_customer ON lab_revenue_events(customer_id,created_at);
CREATE TABLE IF NOT EXISTS lab_payment_context (
  reference TEXT PRIMARY KEY REFERENCES lab_revenue_events(reference),
  paid_at INTEGER NOT NULL CHECK(paid_at>0),
  kind TEXT NOT NULL CHECK(kind IN ('purchase','subscription')),
  subscription_id TEXT
);
CREATE TABLE IF NOT EXISTS lab_partner_links (
  slug TEXT PRIMARY KEY CHECK(slug='vitolas'),
  customer_id TEXT NOT NULL REFERENCES lab_customers(id),
  created_at INTEGER NOT NULL
);
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
  VALUES('0038-partner-commissions',CAST(strftime('%s','now') AS INTEGER)*1000);
