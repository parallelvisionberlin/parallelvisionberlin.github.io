-- PV LAB only. Owner-issued redeemed vouchers must be usable even while new
-- automatic welcome bonuses and unpaid free-trial generations remain paused.
-- Do not alter wallet balances, Stripe receipts, existing persistent holds,
-- abuse-domain rules, account-closure protections or the global pause flags.
-- A voucher claim exists only after an owner-created voucher has been redeemed;
-- the voucher trigger atomically issues its existing wallet credit.
DROP TRIGGER IF EXISTS lab_trial_pause_unpaid_job_inserts;
CREATE TRIGGER lab_trial_pause_unpaid_job_inserts
BEFORE INSERT ON jobs
WHEN EXISTS(SELECT 1 FROM lab_trial_program_controls
  WHERE id=1 AND free_generation_enabled=0)
 AND EXISTS(SELECT 1 FROM lab_customers c WHERE c.id=NEW.owner_id)
 AND NOT EXISTS(SELECT 1 FROM lab_credit_entries e
   WHERE e.customer_id=NEW.owner_id AND e.kind IN ('purchase','subscription'))
 AND NOT EXISTS(SELECT 1 FROM lab_voucher_redemptions r
   WHERE r.customer_id=NEW.owner_id)
BEGIN
  SELECT RAISE(ABORT,'PV LAB complimentary generation is paused');
END;

DROP TRIGGER IF EXISTS lab_trial_pause_unpaid_job_activation;
CREATE TRIGGER lab_trial_pause_unpaid_job_activation
BEFORE UPDATE OF state ON jobs
WHEN OLD.state='draft' AND NEW.state NOT IN ('draft','failed','resolved')
 AND EXISTS(SELECT 1 FROM lab_trial_program_controls
   WHERE id=1 AND free_generation_enabled=0)
 AND EXISTS(SELECT 1 FROM lab_customers c WHERE c.id=NEW.owner_id)
 AND NOT EXISTS(SELECT 1 FROM lab_credit_entries e
   WHERE e.customer_id=NEW.owner_id AND e.kind IN ('purchase','subscription'))
 AND NOT EXISTS(SELECT 1 FROM lab_voucher_redemptions r
   WHERE r.customer_id=NEW.owner_id)
BEGIN
  SELECT RAISE(ABORT,'PV LAB complimentary generation is paused');
END;

INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0033-owner-voucher-generation',CAST(strftime('%s','now') AS INTEGER)*1000);
