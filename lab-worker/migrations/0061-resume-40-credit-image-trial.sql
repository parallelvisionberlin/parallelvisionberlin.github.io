-- Restore verified one-time 40-credit image trials after paid-only onboarding.
-- Retain welcome_enabled=0 to keep the legacy 200-credit offer disabled.
-- Apply AFTER 0060, which replaces this trigger on every Worker deploy.
-- No grants or account balances are backfilled by this migration.
DROP TRIGGER IF EXISTS lab_trial_pause_new_welcome_claims;
CREATE TRIGGER lab_trial_pause_new_welcome_claims
BEFORE INSERT ON lab_welcome_claims
WHEN EXISTS(SELECT 1 FROM lab_trial_program_controls WHERE id=1 AND welcome_enabled=0)
 AND NOT EXISTS(
   SELECT 1 FROM lab_customers c
   JOIN lab_image_trial_controls t ON t.id=1
   WHERE c.id=NEW.customer_id AND c.created_at>=t.started_at
 )
BEGIN SELECT RAISE(IGNORE); END;
-- The 0060 paid-onboarding policy leaves free_generation_enabled=1 to preserve
-- historical wallets. Restrict newly restored, unpaid 40-credit grants to
-- regular images regardless of that flag. Paid/voucher customers are untouched.
DROP TRIGGER IF EXISTS lab_intro_image_only_insert;
CREATE TRIGGER lab_intro_image_only_insert
BEFORE INSERT ON jobs
WHEN EXISTS(SELECT 1 FROM lab_credit_entries e
  WHERE e.customer_id=NEW.owner_id AND e.reference='welcome:'||NEW.owner_id
    AND e.delta_credits=40)
 AND NOT EXISTS(SELECT 1 FROM lab_credit_entries e
  WHERE e.customer_id=NEW.owner_id AND e.kind IN ('purchase','subscription'))
 AND NOT EXISTS(SELECT 1 FROM lab_voucher_redemptions v WHERE v.customer_id=NEW.owner_id)
 AND NOT (CASE WHEN json_valid(NEW.params) THEN
   COALESCE(json_extract(NEW.params,'$.type'),'')='image'
   AND COALESCE(json_extract(NEW.params,'$.mode'),'')='image' ELSE 0 END)
BEGIN SELECT RAISE(ABORT,'Introductory PV LAB credits fund regular images only'); END;

DROP TRIGGER IF EXISTS lab_intro_image_only_activate;
CREATE TRIGGER lab_intro_image_only_activate
BEFORE UPDATE OF state ON jobs
WHEN OLD.state='draft' AND NEW.state NOT IN ('draft','failed','resolved')
 AND EXISTS(SELECT 1 FROM lab_credit_entries e
  WHERE e.customer_id=NEW.owner_id AND e.reference='welcome:'||NEW.owner_id
    AND e.delta_credits=40)
 AND NOT EXISTS(SELECT 1 FROM lab_credit_entries e
  WHERE e.customer_id=NEW.owner_id AND e.kind IN ('purchase','subscription'))
 AND NOT EXISTS(SELECT 1 FROM lab_voucher_redemptions v WHERE v.customer_id=NEW.owner_id)
 AND NOT (CASE WHEN json_valid(NEW.params) THEN
   COALESCE(json_extract(NEW.params,'$.type'),'')='image'
   AND COALESCE(json_extract(NEW.params,'$.mode'),'')='image' ELSE 0 END)
BEGIN SELECT RAISE(ABORT,'Introductory PV LAB credits fund regular images only'); END;

INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0061-resume-40-credit-image-trial',CAST(strftime('%s','now') AS INTEGER)*1000);
