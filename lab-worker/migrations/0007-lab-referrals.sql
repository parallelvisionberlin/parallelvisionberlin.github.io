-- PV Lab referral rewards. Apply to LAB_DB only, never Nina's OWNER_DB.
-- A friend can be attributed once, shortly after creating a customer account.
-- Both rewards are credited only after the referred customer makes a verified
-- first qualifying purchase of at least EUR 10, through the existing Stripe ledger.
CREATE TABLE IF NOT EXISTS lab_referral_codes (
  customer_id TEXT PRIMARY KEY REFERENCES lab_customers(id),
  code TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS lab_referrals (
  referred_customer_id TEXT PRIMARY KEY REFERENCES lab_customers(id),
  referrer_customer_id TEXT NOT NULL REFERENCES lab_customers(id),
  attributed_at INTEGER NOT NULL,
  rewarded_at INTEGER,
  reward_reference TEXT UNIQUE,
  CHECK (referred_customer_id <> referrer_customer_id)
);
CREATE INDEX IF NOT EXISTS lab_referrals_by_referrer
  ON lab_referrals(referrer_customer_id,attributed_at DESC);
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
  VALUES ('0007-lab-referrals',CAST(strftime('%s','now') AS INTEGER)*1000);
