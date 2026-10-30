-- Add Robin without changing existing partner budgets, payouts, referrals or balances.
PRAGMA defer_foreign_keys=ON;
-- Expand only the partner workspace allowlist. Preserve budgets, audit rows,
-- links, existing invitations, reservations and redemptions. No credit grant.
-- Reapplying the deployment migrations preserves values and recreates guards.
DROP TRIGGER IF EXISTS lab_partner_budget_insert_audit;
DROP TRIGGER IF EXISTS lab_partner_budget_update_audit;
DROP TRIGGER IF EXISTS lab_partner_budget_floor;
DROP TRIGGER IF EXISTS lab_partner_voucher_budget_insert;
DROP TRIGGER IF EXISTS lab_partner_voucher_budget_update;
DROP TRIGGER IF EXISTS lab_partner_voucher_recipient;

CREATE TABLE IF NOT EXISTS lab_partner_budgets_robin (
 workspace TEXT PRIMARY KEY CHECK(workspace IN ('vitolas-studio','bellini-studio','robin-studio')),
 partner_customer_id TEXT NOT NULL REFERENCES lab_customers(id),
 credit_limit INTEGER NOT NULL CHECK(credit_limit BETWEEN 0 AND 1000000),
 updated_at INTEGER NOT NULL, updated_by TEXT NOT NULL
);
INSERT OR REPLACE INTO lab_partner_budgets_robin
 SELECT workspace,partner_customer_id,credit_limit,updated_at,updated_by FROM lab_partner_budgets;
DROP TABLE lab_partner_budgets;
ALTER TABLE lab_partner_budgets_robin RENAME TO lab_partner_budgets;
CREATE TABLE IF NOT EXISTS lab_partner_links_robin (
 slug TEXT PRIMARY KEY CHECK(slug IN ('vitolas','bellini','robin')),
 customer_id TEXT NOT NULL REFERENCES lab_customers(id), created_at INTEGER NOT NULL
);
INSERT OR REPLACE INTO lab_partner_links_robin
 SELECT slug,customer_id,created_at FROM lab_partner_links;
DROP TABLE lab_partner_links;
ALTER TABLE lab_partner_links_robin RENAME TO lab_partner_links;

CREATE TRIGGER IF NOT EXISTS lab_partner_budget_insert_audit AFTER INSERT ON lab_partner_budgets
BEGIN
  INSERT INTO lab_partner_budget_audit(workspace,credit_limit,updated_at,updated_by)
    VALUES(NEW.workspace,NEW.credit_limit,NEW.updated_at,NEW.updated_by);
END;
CREATE TRIGGER IF NOT EXISTS lab_partner_budget_update_audit AFTER UPDATE ON lab_partner_budgets
BEGIN
  INSERT INTO lab_partner_budget_audit(workspace,credit_limit,updated_at,updated_by)
    VALUES(NEW.workspace,NEW.credit_limit,NEW.updated_at,NEW.updated_by);
END;
CREATE TRIGGER IF NOT EXISTS lab_partner_budget_floor BEFORE UPDATE ON lab_partner_budgets
BEGIN
  SELECT CASE WHEN NEW.credit_limit < COALESCE((SELECT SUM(credits * CASE
    WHEN active=1 AND (expires_at IS NULL OR expires_at>CAST(strftime('%s','now') AS INTEGER)*1000)
    THEN max_redemptions ELSE redeemed_count END)
    FROM lab_vouchers WHERE created_by='partner:'||NEW.workspace),0)
    THEN RAISE(ABORT,'Partner credits already committed') END;
END;
CREATE TRIGGER IF NOT EXISTS lab_partner_voucher_budget_insert BEFORE INSERT ON lab_vouchers
WHEN substr(NEW.created_by,1,8)='partner:'
BEGIN
  SELECT CASE WHEN NEW.max_redemptions<>1 OR NEW.credits>500 OR NEW.expires_at IS NULL
    THEN RAISE(ABORT,'Invalid partner invitation') END;
  SELECT CASE WHEN NEW.credits + COALESCE((SELECT SUM(credits * CASE
    WHEN active=1 AND (expires_at IS NULL OR expires_at>CAST(strftime('%s','now') AS INTEGER)*1000)
    THEN max_redemptions ELSE redeemed_count END)
    FROM lab_vouchers WHERE created_by=NEW.created_by),0)
    > COALESCE((SELECT credit_limit FROM lab_partner_budgets WHERE workspace=substr(NEW.created_by,9)),0)
    THEN RAISE(ABORT,'Partner credit budget exceeded') END;
END;
-- Also cover owner restore/deactivate routes and the existing redemption trigger.
CREATE TRIGGER IF NOT EXISTS lab_partner_voucher_budget_update BEFORE UPDATE ON lab_vouchers
WHEN substr(NEW.created_by,1,8)='partner:' OR substr(OLD.created_by,1,8)='partner:'
BEGIN
  SELECT CASE WHEN NEW.created_by<>OLD.created_by OR NEW.max_redemptions<>1 OR NEW.credits>500
    THEN RAISE(ABORT,'Invalid partner invitation') END;
  SELECT CASE WHEN NEW.credits * CASE
    WHEN NEW.active=1 AND (NEW.expires_at IS NULL OR NEW.expires_at>CAST(strftime('%s','now') AS INTEGER)*1000)
    THEN NEW.max_redemptions ELSE NEW.redeemed_count END
    + COALESCE((SELECT SUM(credits * CASE
    WHEN active=1 AND (expires_at IS NULL OR expires_at>CAST(strftime('%s','now') AS INTEGER)*1000)
    THEN max_redemptions ELSE redeemed_count END)
    FROM lab_vouchers WHERE created_by=NEW.created_by AND code<>OLD.code COLLATE NOCASE),0)
    > COALESCE((SELECT credit_limit FROM lab_partner_budgets WHERE workspace=substr(NEW.created_by,9)),0)
    THEN RAISE(ABORT,'Partner credit budget exceeded') END;
END;
CREATE TRIGGER IF NOT EXISTS lab_partner_voucher_recipient BEFORE INSERT ON lab_voucher_redemptions
WHEN EXISTS(SELECT 1 FROM lab_vouchers WHERE code=NEW.voucher_code COLLATE NOCASE AND substr(created_by,1,8)='partner:')
BEGIN
  SELECT CASE WHEN EXISTS(SELECT 1 FROM lab_partner_budgets WHERE partner_customer_id=NEW.customer_id)
    OR EXISTS(SELECT 1 FROM lab_voucher_redemptions r JOIN lab_vouchers v ON v.code=r.voucher_code
      WHERE r.customer_id=NEW.customer_id AND v.created_by=(SELECT created_by FROM lab_vouchers WHERE code=NEW.voucher_code COLLATE NOCASE))
    THEN RAISE(ABORT,'PV Lab account unavailable') END;
END;
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
 VALUES('0049-robin-partner-workspace',CAST(strftime('%s','now') AS INTEGER)*1000);

-- Expand payouts to the approved Robin workspace while retaining immutable history.
-- Referencing triggers must be recreated around the parent table rebuild.
DROP TRIGGER IF EXISTS lab_partner_payout_item_guard;
DROP TRIGGER IF EXISTS lab_partner_paid_claims_immutable;
DROP TRIGGER IF EXISTS lab_partner_payout_segment_guard;
CREATE TABLE IF NOT EXISTS lab_partner_payouts_robin (
 id TEXT PRIMARY KEY,
 workspace TEXT NOT NULL CHECK(workspace IN ('bellini-studio','robin-studio')),
 partner_customer_id TEXT NOT NULL REFERENCES lab_customers(id),
 status TEXT NOT NULL CHECK(status IN ('pending','paid','cancelled')),
 amount_cents INTEGER NOT NULL CHECK(amount_cents>=5000),
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 paid_at INTEGER, transfer_reference TEXT,
 CHECK((status='paid' AND paid_at IS NOT NULL AND length(transfer_reference)>0)
 OR (status<>'paid' AND paid_at IS NULL))
);
INSERT INTO lab_partner_payouts_robin SELECT * FROM lab_partner_payouts;
DROP TABLE lab_partner_payouts;
ALTER TABLE lab_partner_payouts_robin RENAME TO lab_partner_payouts;
CREATE UNIQUE INDEX IF NOT EXISTS lab_partner_one_pending_payout
 ON lab_partner_payouts(partner_customer_id) WHERE status='pending';

CREATE TRIGGER lab_partner_payout_item_guard BEFORE INSERT ON lab_partner_payout_items
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

CREATE TRIGGER lab_partner_paid_claims_immutable BEFORE DELETE ON lab_partner_payout_claims
WHEN EXISTS(SELECT 1 FROM lab_partner_payouts WHERE id=OLD.payout_id AND status<>'pending')
BEGIN SELECT RAISE(ABORT,'Settled payments cannot be requested again'); END;


-- Rebuild the immutable finance guard to recognize both authorized payout workspaces.
CREATE TRIGGER lab_partner_payout_segment_guard BEFORE INSERT ON lab_partner_payout_segments
BEGIN
 SELECT CASE WHEN NOT EXISTS(
  SELECT 1 FROM lab_partner_payouts p JOIN lab_revenue_events e ON e.reference=NEW.reference
  JOIN lab_referrals r ON r.referred_customer_id=e.customer_id AND r.referrer_customer_id=p.partner_customer_id
  JOIN lab_partner_payment_facts f ON f.reference=e.reference
  JOIN lab_partner_cost_snapshots c ON c.reference=e.reference AND c.partner_customer_id=p.partner_customer_id
  WHERE p.id=NEW.payout_id AND p.workspace IN ('bellini-studio','robin-studio') AND p.status='pending'
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
