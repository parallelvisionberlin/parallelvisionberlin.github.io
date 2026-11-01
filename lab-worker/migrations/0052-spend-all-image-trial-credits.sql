-- PV LAB: use all available 40 introductory credits for image generation.
-- No new credits or backfill. Legacy 200-credit customers stay blocked.
-- The normal job ledger atomically rejects submissions above the real balance.
-- Unpaid videos and non-image actions remain blocked until a real purchase or voucher.
-- These are replacements for the same two security triggers created by 0051.
DROP TRIGGER IF EXISTS lab_trial_pause_unpaid_job_inserts;
CREATE TRIGGER lab_trial_pause_unpaid_job_inserts
BEFORE INSERT ON jobs
WHEN EXISTS(SELECT 1 FROM lab_trial_program_controls WHERE id=1 AND free_generation_enabled=0)
 AND EXISTS(SELECT 1 FROM lab_customers c WHERE c.id=NEW.owner_id)
 AND NOT EXISTS(SELECT 1 FROM lab_credit_entries e
   WHERE e.customer_id=NEW.owner_id AND e.kind IN ('purchase','subscription'))
 AND NOT EXISTS(SELECT 1 FROM lab_voucher_redemptions r WHERE r.customer_id=NEW.owner_id)
 AND NOT (
   EXISTS(SELECT 1 FROM lab_credit_entries e WHERE e.customer_id=NEW.owner_id
     AND e.reference='welcome:'||NEW.owner_id AND e.delta_credits=40)
   AND CASE WHEN json_valid(NEW.params) THEN
     json_extract(NEW.params,'$.type')='image' AND json_extract(NEW.params,'$.mode')='image'
     ELSE 0 END

 )
BEGIN SELECT RAISE(ABORT,'PV LAB complimentary generation is paused'); END;

DROP TRIGGER IF EXISTS lab_trial_pause_unpaid_job_activation;
CREATE TRIGGER lab_trial_pause_unpaid_job_activation
BEFORE UPDATE OF state ON jobs
WHEN OLD.state='draft' AND NEW.state NOT IN ('draft','failed','resolved')
 AND EXISTS(SELECT 1 FROM lab_trial_program_controls WHERE id=1 AND free_generation_enabled=0)
 AND EXISTS(SELECT 1 FROM lab_customers c WHERE c.id=NEW.owner_id)
 AND NOT EXISTS(SELECT 1 FROM lab_credit_entries e
   WHERE e.customer_id=NEW.owner_id AND e.kind IN ('purchase','subscription'))
 AND NOT EXISTS(SELECT 1 FROM lab_voucher_redemptions r WHERE r.customer_id=NEW.owner_id)
 AND NOT (
   EXISTS(SELECT 1 FROM lab_credit_entries e WHERE e.customer_id=NEW.owner_id
     AND e.reference='welcome:'||NEW.owner_id AND e.delta_credits=40)
   AND CASE WHEN json_valid(NEW.params) THEN
     json_extract(NEW.params,'$.type')='image' AND json_extract(NEW.params,'$.mode')='image'
     ELSE 0 END

 )
BEGIN SELECT RAISE(ABORT,'PV LAB complimentary generation is paused'); END;


INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0052-spend-all-image-trial-credits',CAST(strftime('%s','now') AS INTEGER)*1000);
