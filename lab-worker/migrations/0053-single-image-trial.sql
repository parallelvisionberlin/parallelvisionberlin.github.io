-- Restore one non-failed regular image per 40-credit claim after migration 0052.
-- No wallet writes, retroactive debits, backfills or changes to paid/voucher access.
-- Durable finance records prevent retries, concurrent jobs or history deletion
-- from reopening a used trial. Failed, refunded attempts remain retryable.
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
   AND NOT EXISTS(SELECT 1 FROM lab_generation_finance j WHERE j.customer_id=NEW.owner_id
      AND j.last_state<>'failed')
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
   AND NOT EXISTS(SELECT 1 FROM lab_generation_finance j WHERE j.customer_id=NEW.owner_id
     AND j.job_id<>NEW.id AND j.last_state<>'failed')
 )
BEGIN SELECT RAISE(ABORT,'PV LAB complimentary generation is paused'); END;

INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0053-single-image-trial',CAST(strftime('%s','now') AS INTEGER)*1000);
