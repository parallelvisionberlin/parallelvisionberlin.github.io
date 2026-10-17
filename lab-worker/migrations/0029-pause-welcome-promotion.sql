-- PV LAB ONLY. Emergency pause for the 200-credit welcome promotion.
-- Preserves every existing wallet, purchase, credit ledger entry and creative file.
-- Finance, existing paid customers, billing and owner tooling are untouched.
-- Resume by setting both flags to 1 after removing the Worker-level pause.
CREATE TABLE IF NOT EXISTS lab_trial_program_controls (
  id INTEGER PRIMARY KEY CHECK(id=1),
  welcome_enabled INTEGER NOT NULL CHECK(welcome_enabled IN (0,1)),
  free_generation_enabled INTEGER NOT NULL CHECK(free_generation_enabled IN (0,1)),
  changed_at INTEGER NOT NULL
);
INSERT OR IGNORE INTO lab_trial_program_controls(id,welcome_enabled,free_generation_enabled,changed_at)
VALUES(1,0,0,CAST(strftime('%s','now') AS INTEGER)*1000);

-- Silent skip: avoids breaking sign-in when an older Worker attempts a gift
-- during the short migration/deployment interval.
CREATE TRIGGER IF NOT EXISTS lab_trial_pause_new_welcome_claims
BEFORE INSERT ON lab_welcome_claims
WHEN EXISTS(SELECT 1 FROM lab_trial_program_controls
  WHERE id=1 AND welcome_enabled=0)
BEGIN
  SELECT RAISE(IGNORE);
END;

-- Independent database gate, including POST routes that accidentally omit
-- application-level checks. Paid is determined by server-issued wallet entries,
-- never browser input. Owner/non-customer accounts are unaffected.
CREATE TRIGGER IF NOT EXISTS lab_trial_pause_unpaid_job_inserts
BEFORE INSERT ON jobs
WHEN EXISTS(SELECT 1 FROM lab_trial_program_controls
  WHERE id=1 AND free_generation_enabled=0)
 AND EXISTS(SELECT 1 FROM lab_customers c WHERE c.id=NEW.owner_id)
 AND NOT EXISTS(SELECT 1 FROM lab_credit_entries e
   WHERE e.customer_id=NEW.owner_id AND e.kind IN ('purchase','subscription'))
BEGIN
  SELECT RAISE(ABORT,'PV LAB complimentary generation is paused');
END;
CREATE TRIGGER IF NOT EXISTS lab_trial_pause_unpaid_job_activation
BEFORE UPDATE OF state ON jobs
WHEN OLD.state='draft' AND NEW.state NOT IN ('draft','failed','resolved')
 AND EXISTS(SELECT 1 FROM lab_trial_program_controls
   WHERE id=1 AND free_generation_enabled=0)
 AND EXISTS(SELECT 1 FROM lab_customers c WHERE c.id=NEW.owner_id)
 AND NOT EXISTS(SELECT 1 FROM lab_credit_entries e
   WHERE e.customer_id=NEW.owner_id AND e.kind IN ('purchase','subscription'))
BEGIN
  SELECT RAISE(ABORT,'PV LAB complimentary generation is paused');
END;

INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0029-pause-welcome-promotion',CAST(strftime('%s','now') AS INTEGER)*1000);
