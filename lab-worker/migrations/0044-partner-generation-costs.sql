-- Bellini only. No customer wallet debits, promotional grants or bank transfers.
CREATE TABLE IF NOT EXISTS lab_partner_fx_rates (
 day TEXT PRIMARY KEY CHECK(length(day)=10),
 usd_per_eur_micros INTEGER NOT NULL CHECK(usd_per_eur_micros BETWEEN 100000 AND 10000000),
 source TEXT NOT NULL CHECK(source='ECB'), verified_at INTEGER NOT NULL
);
CREATE TRIGGER IF NOT EXISTS lab_partner_fx_immutable BEFORE UPDATE ON lab_partner_fx_rates
BEGIN SELECT RAISE(ABORT,'Recorded conversion is immutable'); END;
CREATE TABLE IF NOT EXISTS lab_partner_cost_refresh (id INTEGER PRIMARY KEY CHECK(id=1),fx_checked_at INTEGER NOT NULL DEFAULT 0,fx_ok INTEGER NOT NULL DEFAULT 0 CHECK(fx_ok IN (0,1)));
INSERT OR IGNORE INTO lab_partner_cost_refresh(id) VALUES(1);
CREATE TABLE IF NOT EXISTS lab_partner_cost_revision (id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL);
INSERT OR IGNORE INTO lab_partner_cost_revision VALUES(1,0);
CREATE TRIGGER IF NOT EXISTS lab_partner_cost_credit_revision AFTER INSERT ON lab_credit_entries
BEGIN UPDATE lab_partner_cost_revision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER IF NOT EXISTS lab_partner_cost_finance_insert AFTER INSERT ON lab_generation_finance
BEGIN UPDATE lab_partner_cost_revision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER IF NOT EXISTS lab_partner_cost_finance_update AFTER UPDATE ON lab_generation_finance
BEGIN UPDATE lab_partner_cost_revision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER IF NOT EXISTS lab_partner_cost_finance_delete AFTER DELETE ON lab_generation_finance
BEGIN UPDATE lab_partner_cost_revision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER IF NOT EXISTS lab_partner_cost_fx_revision AFTER INSERT ON lab_partner_fx_rates
BEGIN UPDATE lab_partner_cost_revision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER IF NOT EXISTS lab_partner_cost_revenue_revision AFTER INSERT ON lab_revenue_events
BEGIN UPDATE lab_partner_cost_revision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER IF NOT EXISTS lab_partner_cost_context_revision AFTER INSERT ON lab_payment_context
BEGIN UPDATE lab_partner_cost_revision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER IF NOT EXISTS lab_partner_cost_referral_insert AFTER INSERT ON lab_referrals
BEGIN UPDATE lab_partner_cost_revision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER IF NOT EXISTS lab_partner_cost_referral_update AFTER UPDATE ON lab_referrals
BEGIN UPDATE lab_partner_cost_revision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER IF NOT EXISTS lab_partner_cost_referral_delete AFTER DELETE ON lab_referrals
BEGIN UPDATE lab_partner_cost_revision SET revision=revision+1 WHERE id=1; END;
CREATE TABLE IF NOT EXISTS lab_partner_cost_snapshots (
 reference TEXT PRIMARY KEY REFERENCES lab_revenue_events(reference),
 partner_customer_id TEXT NOT NULL REFERENCES lab_customers(id), revision INTEGER NOT NULL,
 base_cents INTEGER NOT NULL CHECK(base_cents>=0),rate INTEGER NOT NULL CHECK(rate IN (20,50)),
 nominal_cents INTEGER NOT NULL CHECK(nominal_cents>=0),
 adjustment_cents INTEGER NOT NULL CHECK(adjustment_cents>=0),
 reserve_cents INTEGER NOT NULL CHECK(reserve_cents>=0),cost_cents INTEGER CHECK(cost_cents>=0),
 payable_cents INTEGER NOT NULL CHECK(payable_cents=nominal_cents-adjustment_cents-reserve_cents)
);
CREATE TRIGGER IF NOT EXISTS lab_partner_cost_snapshot_guard BEFORE INSERT ON lab_partner_cost_snapshots
BEGIN
 SELECT CASE WHEN NOT EXISTS(
  SELECT 1 FROM lab_revenue_events e JOIN lab_referrals r ON r.referred_customer_id=e.customer_id
  JOIN lab_partner_payment_facts f ON f.reference=e.reference
  WHERE e.reference=NEW.reference AND r.referrer_customer_id=NEW.partner_customer_id
   AND NEW.revision=(SELECT revision FROM lab_partner_cost_revision WHERE id=1)
   AND NEW.base_cents=MAX(0,f.amount_cents-f.fee_cents-f.tax_cents)
   AND NEW.nominal_cents=CAST(ROUND(NEW.base_cents*NEW.rate/100.0) AS INTEGER)
   AND ((NEW.rate=20 AND NEW.adjustment_cents=0 AND NEW.reserve_cents=0)
    OR (NEW.rate=50 AND NEW.adjustment_cents+NEW.reserve_cents<=CAST(NEW.base_cents*5/100 AS INTEGER)
     AND NEW.payable_cents>=CAST(ROUND(NEW.base_cents*45/100.0) AS INTEGER)))
 ) THEN RAISE(ABORT,'Generation accounting changed; reconcile again') END;
END;
-- New payouts can withdraw a safe first tranche and later the released reserve.
-- Original 0043 items/claims remain immutable and grandfathered, never rewritten.
CREATE TABLE IF NOT EXISTS lab_partner_payout_segments (
 payout_id TEXT NOT NULL REFERENCES lab_partner_payouts(id),reference TEXT NOT NULL REFERENCES lab_revenue_events(reference),
 amount_cents INTEGER NOT NULL,fee_cents INTEGER NOT NULL,tax_cents INTEGER NOT NULL,base_cents INTEGER NOT NULL,
 rate INTEGER NOT NULL CHECK(rate IN (20,50)),commission_cents INTEGER NOT NULL CHECK(commission_cents>0),
 nominal_cents INTEGER NOT NULL,adjustment_cents INTEGER NOT NULL,reserve_cents INTEGER NOT NULL,
 cost_cents INTEGER,entitlement_cents INTEGER NOT NULL,revision INTEGER NOT NULL,
 PRIMARY KEY(payout_id,reference)
);
CREATE INDEX IF NOT EXISTS lab_partner_payout_segments_reference ON lab_partner_payout_segments(reference);
CREATE TRIGGER IF NOT EXISTS lab_partner_payout_segment_guard BEFORE INSERT ON lab_partner_payout_segments
BEGIN
 SELECT CASE WHEN NOT EXISTS(
  SELECT 1 FROM lab_partner_payouts p JOIN lab_revenue_events e ON e.reference=NEW.reference
  JOIN lab_referrals r ON r.referred_customer_id=e.customer_id AND r.referrer_customer_id=p.partner_customer_id
  JOIN lab_partner_payment_facts f ON f.reference=e.reference
  JOIN lab_partner_cost_snapshots c ON c.reference=e.reference AND c.partner_customer_id=p.partner_customer_id
  WHERE p.id=NEW.payout_id AND p.workspace='bellini-studio' AND p.status='pending'
   AND f.amount_cents=NEW.amount_cents AND f.fee_cents=NEW.fee_cents AND f.tax_cents=NEW.tax_cents
   AND NEW.base_cents=c.base_cents AND NEW.rate=c.rate AND NEW.nominal_cents=c.nominal_cents
   AND NEW.adjustment_cents=c.adjustment_cents AND NEW.reserve_cents=c.reserve_cents
   AND NEW.cost_cents IS c.cost_cents AND NEW.entitlement_cents=c.payable_cents
   AND NEW.revision=c.revision AND c.revision=(SELECT revision FROM lab_partner_cost_revision WHERE id=1)
   AND NEW.commission_cents=c.payable_cents-COALESCE((SELECT SUM(s.commission_cents)
    FROM lab_partner_payout_segments s JOIN lab_partner_payouts q ON q.id=s.payout_id
    WHERE s.reference=NEW.reference AND q.status IN ('pending','paid')),0)
   AND NOT EXISTS(SELECT 1 FROM lab_partner_payout_claims old WHERE old.reference=NEW.reference)
   AND NOT EXISTS(SELECT 1 FROM lab_billing_reviews b WHERE b.customer_id=e.customer_id)
 ) THEN RAISE(ABORT,'Commission already reserved or accounting changed') END;
END;
CREATE TRIGGER IF NOT EXISTS lab_partner_payout_segments_immutable BEFORE UPDATE ON lab_partner_payout_segments
BEGIN SELECT RAISE(ABORT,'Payout allocation is immutable'); END;
CREATE TRIGGER IF NOT EXISTS lab_partner_payout_segments_no_delete BEFORE DELETE ON lab_partner_payout_segments
BEGIN SELECT RAISE(ABORT,'Payout history is immutable'); END;
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
 VALUES('0044-partner-generation-costs',CAST(strftime('%s','now') AS INTEGER)*1000);
