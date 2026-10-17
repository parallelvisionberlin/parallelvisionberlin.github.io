-- PV LAB only: one welcome credit award per verified email identity.
-- The email key is a keyed HMAC calculated in the Worker. No raw email is
-- duplicated here. The existing contact table remains the only email store.
CREATE TABLE IF NOT EXISTS lab_welcome_claims (
  email_key TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL UNIQUE REFERENCES lab_customers(id),
  claimed_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lab_welcome_claims_customer ON lab_welcome_claims(customer_id);
-- Atomic receipt and credit grant. Existing welcome ledger receipts are respected.
CREATE TRIGGER IF NOT EXISTS lab_verified_welcome_grant AFTER INSERT ON lab_welcome_claims
BEGIN
  INSERT OR IGNORE INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at)
  SELECT 'welcome:'||NEW.customer_id,NEW.customer_id,200,'adjustment','welcome:'||NEW.customer_id,NEW.claimed_at
  WHERE EXISTS (SELECT 1 FROM lab_customer_contacts p
    WHERE p.customer_id=NEW.customer_id AND p.email IS NOT NULL AND p.verified_at IS NOT NULL)
    AND NOT EXISTS (SELECT 1 FROM lab_account_closures WHERE customer_id=NEW.customer_id);
END;
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0023-welcome-guard',CAST(strftime('%s','now') AS INTEGER)*1000);
