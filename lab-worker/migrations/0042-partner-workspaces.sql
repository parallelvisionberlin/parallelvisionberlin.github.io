-- Expand only the partner workspace allowlist. Preserve budgets, audit rows,
-- links, existing invitations, reservations and redemptions. No credit grant.
-- Reapplying the deployment migrations preserves values and recreates guards.
DROP TRIGGER IF EXISTS lab_partner_budget_insert_audit;
DROP TRIGGER IF EXISTS lab_partner_budget_update_audit;
DROP TRIGGER IF EXISTS lab_partner_budget_floor;
DROP TRIGGER IF EXISTS lab_partner_voucher_budget_insert;
DROP TRIGGER IF EXISTS lab_partner_voucher_budget_update;
DROP TRIGGER IF EXISTS lab_partner_voucher_recipient;

CREATE TABLE IF NOT EXISTS lab_partner_budgets_expanded (
 workspace TEXT PRIMARY KEY CHECK(workspace IN ('vitolas-studio','bellini-studio')),
 partner_customer_id TEXT NOT NULL REFERENCES lab_customers(id),
 credit_limit INTEGER NOT NULL CHECK(credit_limit BETWEEN 0 AND 1000000),
 updated_at INTEGER NOT NULL, updated_by TEXT NOT NULL
);
INSERT OR REPLACE INTO lab_partner_budgets_expanded
 SELECT workspace,partner_customer_id,credit_limit,updated_at,updated_by FROM lab_partner_budgets;
DROP TABLE lab_partner_budgets;
ALTER TABLE lab_partner_budgets_expanded RENAME TO lab_partner_budgets;
CREATE TABLE IF NOT EXISTS lab_partner_links_expanded (
 slug TEXT PRIMARY KEY CHECK(slug IN ('vitolas','bellini')),
 customer_id TEXT NOT NULL REFERENCES lab_customers(id), created_at INTEGER NOT NULL
);
INSERT OR REPLACE INTO lab_partner_links_expanded
 SELECT slug,customer_id,created_at FROM lab_partner_links;
DROP TABLE lab_partner_links;
ALTER TABLE lab_partner_links_expanded RENAME TO lab_partner_links;

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
 VALUES('0042-partner-workspaces',CAST(strftime('%s','now') AS INTEGER)*1000);
