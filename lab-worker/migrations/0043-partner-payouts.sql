-- Bellini payment reconciliation and manual payout requests. No bank transfers.
CREATE TABLE IF NOT EXISTS lab_partner_payment_facts (
 reference TEXT PRIMARY KEY REFERENCES lab_revenue_events(reference),
 charge_id TEXT NOT NULL UNIQUE, balance_transaction_id TEXT NOT NULL UNIQUE,
 amount_cents INTEGER NOT NULL CHECK(amount_cents>0),
 fee_cents INTEGER NOT NULL CHECK(fee_cents>=0 AND fee_cents<=amount_cents),
 tax_cents INTEGER NOT NULL CHECK(tax_cents>=0 AND tax_cents<=amount_cents),
 verified_at INTEGER NOT NULL
);
CREATE TRIGGER IF NOT EXISTS lab_partner_payment_facts_immutable BEFORE UPDATE ON lab_partner_payment_facts
BEGIN SELECT RAISE(ABORT,'Verified payment facts are immutable'); END;
CREATE TABLE IF NOT EXISTS lab_partner_payouts (
 id TEXT PRIMARY KEY,
 workspace TEXT NOT NULL CHECK(workspace='bellini-studio'),
 partner_customer_id TEXT NOT NULL REFERENCES lab_customers(id),
 status TEXT NOT NULL CHECK(status IN ('pending','paid','cancelled')),
 amount_cents INTEGER NOT NULL CHECK(amount_cents>=5000),
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 paid_at INTEGER, transfer_reference TEXT,
 CHECK((status='paid' AND paid_at IS NOT NULL AND length(transfer_reference)>0)
   OR (status<>'paid' AND paid_at IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS lab_partner_one_pending_payout
 ON lab_partner_payouts(partner_customer_id) WHERE status='pending';
CREATE TABLE IF NOT EXISTS lab_partner_payout_items (
 payout_id TEXT NOT NULL REFERENCES lab_partner_payouts(id),
 reference TEXT NOT NULL REFERENCES lab_revenue_events(reference),
 amount_cents INTEGER NOT NULL, fee_cents INTEGER NOT NULL, tax_cents INTEGER NOT NULL,
 base_cents INTEGER NOT NULL CHECK(base_cents>=0),
 rate INTEGER NOT NULL CHECK(rate IN (20,50)),
 commission_cents INTEGER NOT NULL CHECK(commission_cents>0),
 PRIMARY KEY(payout_id,reference)
);
CREATE TABLE IF NOT EXISTS lab_partner_payout_claims (
 reference TEXT PRIMARY KEY REFERENCES lab_revenue_events(reference),
 payout_id TEXT NOT NULL REFERENCES lab_partner_payouts(id)
);
CREATE TRIGGER IF NOT EXISTS lab_partner_payout_item_guard BEFORE INSERT ON lab_partner_payout_items
BEGIN
 SELECT CASE WHEN NOT EXISTS (
  SELECT 1 FROM lab_partner_payouts p
  JOIN lab_revenue_events e ON e.reference=NEW.reference
  JOIN lab_referrals r ON r.referred_customer_id=e.customer_id AND r.referrer_customer_id=p.partner_customer_id
  JOIN lab_partner_payment_facts f ON f.reference=e.reference
  WHERE p.id=NEW.payout_id AND p.status='pending'
   AND f.amount_cents=NEW.amount_cents AND f.fee_cents=NEW.fee_cents AND f.tax_cents=NEW.tax_cents
   AND NEW.base_cents=MAX(0,f.amount_cents-f.fee_cents-f.tax_cents)
   AND NEW.commission_cents=CAST(ROUND(NEW.base_cents*NEW.rate/100.0) AS INTEGER)
   AND NOT EXISTS(SELECT 1 FROM lab_billing_reviews b WHERE b.customer_id=e.customer_id)
 ) THEN RAISE(ABORT,'Payout payment requires reconciliation') END;
END;
CREATE TRIGGER IF NOT EXISTS lab_partner_payout_items_immutable BEFORE UPDATE ON lab_partner_payout_items
BEGIN SELECT RAISE(ABORT,'Payout items are immutable'); END;
CREATE TRIGGER IF NOT EXISTS lab_partner_paid_claims_immutable BEFORE DELETE ON lab_partner_payout_claims
WHEN EXISTS(SELECT 1 FROM lab_partner_payouts WHERE id=OLD.payout_id AND status<>'pending')
BEGIN SELECT RAISE(ABORT,'Settled payments cannot be requested again'); END;
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
 VALUES('0043-partner-payouts',CAST(strftime('%s','now') AS INTEGER)*1000);
