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
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0061-resume-40-credit-image-trial',CAST(strftime('%s','now') AS INTEGER)*1000);
