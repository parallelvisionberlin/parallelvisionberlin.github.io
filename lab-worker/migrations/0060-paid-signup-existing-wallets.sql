-- Stop new signup gifts while preserving all already-issued customer wallet entries.
-- This migration is safe to run again with every Worker release.
UPDATE lab_trial_program_controls
SET welcome_enabled=0,free_generation_enabled=1,changed_at=CAST(strftime('%s','now') AS INTEGER)*1000
WHERE id=1 AND (welcome_enabled<>0 OR free_generation_enabled<>1);
DROP TRIGGER IF EXISTS lab_trial_pause_new_welcome_claims;
CREATE TRIGGER lab_trial_pause_new_welcome_claims
BEFORE INSERT ON lab_welcome_claims
WHEN EXISTS(SELECT 1 FROM lab_trial_program_controls WHERE id=1 AND welcome_enabled=0)
BEGIN SELECT RAISE(IGNORE); END;
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0060-paid-signup-existing-wallets',CAST(strftime('%s','now') AS INTEGER)*1000);
