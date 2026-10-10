-- PV Lab customer wallets. Run against LAB_DB only, never Nina's OWNER_DB.
-- Immutable credit entries drive atomic balances. 460 credits per US dollar quoted (minimum 7 credits).
CREATE TABLE IF NOT EXISTS lab_customers (
  id TEXT PRIMARY KEY,
  clerk_subject TEXT NOT NULL UNIQUE,
  balance_credits INTEGER NOT NULL DEFAULT 0 CHECK (balance_credits >= 0),
  stripe_customer_id TEXT UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS lab_credit_entries (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES lab_customers(id),
  delta_credits INTEGER NOT NULL CHECK (delta_credits <> 0),
  kind TEXT NOT NULL CHECK (kind IN ('purchase','subscription','generation','refund','adjustment')),
  reference TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lab_credit_entries_customer ON lab_credit_entries(customer_id,created_at DESC);
CREATE TABLE IF NOT EXISTS lab_subscriptions (
  customer_id TEXT PRIMARY KEY REFERENCES lab_customers(id),
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  plan_id TEXT,
  status TEXT NOT NULL DEFAULT 'none',
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS lab_stripe_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at INTEGER NOT NULL
);
-- Credit entry insertion is the sole normal means of modifying balances.
CREATE TRIGGER IF NOT EXISTS lab_apply_credits AFTER INSERT ON lab_credit_entries
BEGIN
  UPDATE lab_customers
     SET balance_credits = balance_credits + NEW.delta_credits,
         updated_at = NEW.created_at
   WHERE id = NEW.customer_id
     AND balance_credits + NEW.delta_credits >= 0;
  SELECT RAISE(ABORT,'Insufficient PV Lab credits') WHERE changes() <> 1;
END;
-- The job and wallet debit are one SQLite statement/transaction across all model routes.
-- Drafts and owner jobs are free of customer credit debits.
CREATE TRIGGER IF NOT EXISTS lab_charge_job AFTER INSERT ON jobs
WHEN NEW.state <> 'draft' AND NEW.estimate_microusd > 0
 AND EXISTS (SELECT 1 FROM lab_customers WHERE id = NEW.owner_id)
BEGIN
  INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at)
  VALUES ('generation:' || NEW.id,NEW.owner_id,
    -MAX(7,CAST((NEW.estimate_microusd * 460 + 999999) / 1000000 AS INTEGER)),
    'generation','job:' || NEW.id,NEW.created_at);
END;
-- A definitely failed generation refunds its reserved credit charge once.
CREATE TRIGGER IF NOT EXISTS lab_refund_failed_job AFTER UPDATE OF state ON jobs
WHEN NEW.state = 'failed' AND OLD.state <> 'failed'
 AND EXISTS (SELECT 1 FROM lab_credit_entries WHERE reference='job:' || NEW.id AND kind='generation')
BEGIN
  INSERT OR IGNORE INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at)
  SELECT 'refund:' || NEW.id,customer_id,-delta_credits,'refund','refund:job:' || NEW.id,
         CAST(strftime('%s','now') AS INTEGER)*1000
  FROM lab_credit_entries WHERE reference='job:' || NEW.id AND kind='generation';
END;
INSERT OR IGNORE INTO lab_migrations(id,applied_at) VALUES
  ('0006-lab-customers',CAST(strftime('%s','now') AS INTEGER)*1000);
