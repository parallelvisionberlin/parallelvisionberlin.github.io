-- PV Lab only. Private verified email snapshots and audited promotional credits.
-- Never apply to OWNER_DB or Nina's existing vouchers.
CREATE TABLE IF NOT EXISTS lab_customer_contacts (
  customer_id TEXT PRIMARY KEY REFERENCES lab_customers(id),
  email TEXT,
  verified_at INTEGER,
  synced_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lab_customer_contacts_email ON lab_customer_contacts(email);
CREATE TABLE IF NOT EXISTS lab_vouchers (
  code TEXT PRIMARY KEY COLLATE NOCASE,
  credits INTEGER NOT NULL CHECK(credits BETWEEN 1 AND 20000),
  max_redemptions INTEGER NOT NULL CHECK(max_redemptions BETWEEN 1 AND 1000),
  redeemed_count INTEGER NOT NULL DEFAULT 0 CHECK(redeemed_count >= 0 AND redeemed_count <= max_redemptions),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  expires_at INTEGER,
  note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS lab_voucher_redemptions (
  voucher_code TEXT NOT NULL REFERENCES lab_vouchers(code),
  customer_id TEXT NOT NULL REFERENCES lab_customers(id),
  redeemed_at INTEGER NOT NULL,
  PRIMARY KEY(voucher_code,customer_id)
);
CREATE INDEX IF NOT EXISTS lab_voucher_redemptions_customer
  ON lab_voucher_redemptions(customer_id,redeemed_at DESC);
CREATE TRIGGER IF NOT EXISTS lab_voucher_check BEFORE INSERT ON lab_voucher_redemptions
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM lab_vouchers v
    WHERE v.code=NEW.voucher_code COLLATE NOCASE AND v.active=1
      AND (v.expires_at IS NULL OR v.expires_at>NEW.redeemed_at)
      AND v.redeemed_count<v.max_redemptions
  ) THEN RAISE(ABORT,'PV Lab voucher unavailable') END;
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM lab_account_closures WHERE customer_id=NEW.customer_id
  ) OR EXISTS (
    SELECT 1 FROM lab_billing_reviews WHERE customer_id=NEW.customer_id AND state='open'
  ) THEN RAISE(ABORT,'PV Lab account unavailable') END;
END;
-- Claim, capacity count, and immutable wallet credit run inside ONE SQLite statement.
-- A duplicate per-user claim fails its primary key before this trigger executes.
CREATE TRIGGER IF NOT EXISTS lab_voucher_grant AFTER INSERT ON lab_voucher_redemptions
BEGIN
  UPDATE lab_vouchers SET redeemed_count=redeemed_count+1 WHERE code=NEW.voucher_code COLLATE NOCASE;
  INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at)
  SELECT 'voucher:'||NEW.voucher_code||':'||NEW.customer_id,NEW.customer_id,
    v.credits,'adjustment','voucher:'||NEW.voucher_code||':'||NEW.customer_id,NEW.redeemed_at
  FROM lab_vouchers v WHERE v.code=NEW.voucher_code COLLATE NOCASE;
END;
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
  VALUES('0015-lab-promotional-credits',CAST(strftime('%s','now') AS INTEGER)*1000);
