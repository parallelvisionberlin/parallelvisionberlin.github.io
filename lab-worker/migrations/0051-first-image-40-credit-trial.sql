-- PV LAB: narrowly scoped, one-image / 40-credit acquisition trial.
-- The old 200-credit promotion and global unpaid pause stay disabled.
-- Activation additionally requires LAB_IMAGE_TRIAL_ENABLED=true in the Worker.
-- Include campaign signups from 1 November 2026, 00:00 Berlin time,
-- even if they registered before this migration deploys. Earlier signups
-- and previous 200-credit receipts do not qualify. No bulk wallet credits.
CREATE TABLE IF NOT EXISTS lab_image_trial_controls (
  id INTEGER PRIMARY KEY CHECK(id=1),
  started_at INTEGER NOT NULL
);
INSERT OR IGNORE INTO lab_image_trial_controls(id,started_at)
VALUES(1,1793487600000);

-- Existing welcome claims and hashed verified-email protections are reused.
-- Old customer identities cannot start a new 40-credit trial.
DROP TRIGGER IF EXISTS lab_trial_pause_new_welcome_claims;
CREATE TRIGGER lab_trial_pause_new_welcome_claims
BEFORE INSERT ON lab_welcome_claims
WHEN EXISTS(SELECT 1 FROM lab_trial_program_controls WHERE id=1 AND welcome_enabled=0)
 AND NOT EXISTS(
   SELECT 1 FROM lab_customers c JOIN lab_image_trial_controls t ON t.id=1
   WHERE c.id=NEW.customer_id AND c.created_at>=t.started_at)
BEGIN
  SELECT RAISE(IGNORE);
END;

-- Atomic grant, preserving the old 200-credit value on old already-eligible
-- accounts if the separate legacy promotion is explicitly resumed later.
-- Neither this migration nor a deployment backfills any account.
DROP TRIGGER IF EXISTS lab_verified_welcome_grant;
CREATE TRIGGER lab_verified_welcome_grant AFTER INSERT ON lab_welcome_claims
BEGIN
  INSERT OR IGNORE INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at)
  SELECT 'welcome:'||NEW.customer_id,NEW.customer_id,
    CASE WHEN EXISTS(
      SELECT 1 FROM lab_customers c JOIN lab_image_trial_controls t ON t.id=1
      WHERE c.id=NEW.customer_id AND c.created_at>=t.started_at)
    THEN 40 ELSE 200 END,
    'adjustment','welcome:'||NEW.customer_id,NEW.claimed_at
  WHERE EXISTS(SELECT 1 FROM lab_customer_contacts p
    WHERE p.customer_id=NEW.customer_id AND p.email IS NOT NULL AND p.verified_at IS NOT NULL)
    AND NOT EXISTS(SELECT 1 FROM lab_account_closures WHERE customer_id=NEW.customer_id);
END;

-- A non-paying, non-voucher account with exactly one new 40-credit grant
-- can create only its first regular image, never video or image tools.
-- The normal database debit still caps that image at the quoted balance.
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
VALUES('0051-first-image-40-credit-trial',CAST(strftime('%s','now') AS INTEGER)*1000);
