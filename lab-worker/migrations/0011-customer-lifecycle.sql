-- LAB_DB only. Keep financial records; close access before removing creative data.
CREATE TABLE IF NOT EXISTS lab_account_closures (
  customer_id TEXT PRIMARY KEY REFERENCES lab_customers(id),
  state TEXT NOT NULL DEFAULT 'requested' CHECK(state IN ('requested','deleted')),
  requested_at INTEGER NOT NULL,
  completed_at INTEGER
);
CREATE TABLE IF NOT EXISTS lab_billing_reviews (
  event_id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES lab_customers(id),
  object_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'open' CHECK(state IN ('open','resolved')),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lab_billing_reviews_customer ON lab_billing_reviews(customer_id,state);
CREATE TRIGGER IF NOT EXISTS lab_block_closed_jobs BEFORE INSERT ON jobs
WHEN EXISTS(SELECT 1 FROM lab_account_closures WHERE customer_id=NEW.owner_id)
BEGIN SELECT RAISE(ABORT,'PV Lab account is closed'); END;
CREATE TRIGGER IF NOT EXISTS lab_block_held_jobs BEFORE INSERT ON jobs
WHEN NEW.state <> 'draft' AND EXISTS(SELECT 1 FROM lab_billing_reviews WHERE customer_id=NEW.owner_id AND state='open')
BEGIN SELECT RAISE(ABORT,'PV Lab billing review required'); END;
CREATE TRIGGER IF NOT EXISTS lab_block_closed_assets BEFORE INSERT ON assets
WHEN EXISTS(SELECT 1 FROM lab_account_closures WHERE customer_id=NEW.owner_id)
BEGIN SELECT RAISE(ABORT,'PV Lab account is closed'); END;
CREATE TRIGGER IF NOT EXISTS lab_block_closed_quotes BEFORE INSERT ON quotes
WHEN EXISTS(SELECT 1 FROM lab_account_closures WHERE customer_id=NEW.owner_id)
BEGIN SELECT RAISE(ABORT,'PV Lab account is closed'); END;
INSERT OR IGNORE INTO lab_migrations(id,applied_at) VALUES('0011-customer-lifecycle',CAST(strftime('%s','now') AS INTEGER)*1000);
