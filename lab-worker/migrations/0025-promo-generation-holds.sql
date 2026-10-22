-- PV LAB only: immutable review marker for disposable-email trial farming.
-- Never delete or reverse credit receipts or touch account media.
CREATE TABLE IF NOT EXISTS lab_promo_generation_holds (
  customer_id TEXT PRIMARY KEY REFERENCES lab_customers(id),
  reason TEXT NOT NULL CHECK(reason IN ('disposable-email')),
  created_at INTEGER NOT NULL,
  released_at INTEGER
);
CREATE INDEX IF NOT EXISTS lab_promo_generation_holds_open
  ON lab_promo_generation_holds(released_at,created_at);

-- Preserve a hold even if the Clerk email is later changed.
-- Applies only to verified contact snapshots from Clerk.
CREATE TRIGGER IF NOT EXISTS lab_promo_hold_contact_insert
AFTER INSERT ON lab_customer_contacts
WHEN NEW.verified_at IS NOT NULL AND NEW.email IS NOT NULL
  AND (lower(NEW.email) LIKE '%@yournike.com' OR lower(NEW.email) LIKE '%@weekprime.com')
BEGIN
  -- The outer Clerk contact UPSERT overrides a trigger's OR IGNORE policy.
  -- A conditional insert preserves existing holds without a duplicate-key abort.
  INSERT INTO lab_promo_generation_holds(customer_id,reason,created_at)
  SELECT NEW.customer_id,'disposable-email',CAST(strftime('%s','now') AS INTEGER)*1000
  WHERE NOT EXISTS (SELECT 1 FROM lab_promo_generation_holds
                    WHERE customer_id=NEW.customer_id);
END;
CREATE TRIGGER IF NOT EXISTS lab_promo_hold_contact_update
AFTER UPDATE OF email,verified_at ON lab_customer_contacts
WHEN NEW.verified_at IS NOT NULL AND NEW.email IS NOT NULL
  AND (lower(NEW.email) LIKE '%@yournike.com' OR lower(NEW.email) LIKE '%@weekprime.com')
BEGIN
  -- The outer Clerk contact UPSERT overrides a trigger's OR IGNORE policy.
  -- A conditional insert preserves existing holds without a duplicate-key abort.
  INSERT INTO lab_promo_generation_holds(customer_id,reason,created_at)
  SELECT NEW.customer_id,'disposable-email',CAST(strftime('%s','now') AS INTEGER)*1000
  WHERE NOT EXISTS (SELECT 1 FROM lab_promo_generation_holds
                    WHERE customer_id=NEW.customer_id);
END;

-- Backfill existing October 16 accounts. Historical credit balances unchanged.
INSERT OR IGNORE INTO lab_promo_generation_holds(customer_id,reason,created_at)
SELECT p.customer_id,'disposable-email',CAST(strftime('%s','now') AS INTEGER)*1000
FROM lab_customer_contacts p JOIN lab_customers c ON c.id=p.customer_id
WHERE p.verified_at IS NOT NULL AND p.email IS NOT NULL
  AND (lower(p.email) LIKE '%@yournike.com' OR lower(p.email) LIKE '%@weekprime.com');

-- Independent database gate: prevents a new billable job even if another route
-- forgets to run the application preflight. Stripe-verified paying accounts
-- remain eligible; completed, archived and queued work is not removed.
CREATE TRIGGER IF NOT EXISTS lab_pause_disposable_trial_jobs
BEFORE INSERT ON jobs
WHEN NEW.state<>'draft'
 AND EXISTS (
   SELECT 1 FROM lab_promo_generation_holds h
   WHERE h.customer_id=NEW.owner_id AND h.released_at IS NULL
   AND NOT EXISTS (SELECT 1 FROM lab_credit_entries e
                   WHERE e.customer_id=NEW.owner_id
                     AND e.kind IN ('purchase','subscription'))
 )
BEGIN
  SELECT RAISE(ABORT,'PV Lab promotional generation paused');
END;

INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0025-promo-generation-holds',CAST(strftime('%s','now') AS INTEGER)*1000);
