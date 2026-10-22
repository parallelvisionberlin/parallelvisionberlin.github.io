-- PV LAB: recover verified Clerk contact refreshes for existing disposable-email holds.
-- SQLite gives the outer contact UPSERT's conflict policy precedence over a
-- trigger body's INSERT OR IGNORE. Repeated holds then abort the contact write
-- with UNIQUE constraint failed. Conditional INSERT avoids that conflict.
-- Retain all existing holds and the separate unpaid-generation safety trigger.
DROP TRIGGER IF EXISTS lab_promo_hold_contact_insert;
DROP TRIGGER IF EXISTS lab_promo_hold_contact_update;

CREATE TRIGGER lab_promo_hold_contact_insert
AFTER INSERT ON lab_customer_contacts
WHEN NEW.verified_at IS NOT NULL AND NEW.email IS NOT NULL
  AND (lower(NEW.email) LIKE '%@yournike.com' OR lower(NEW.email) LIKE '%@weekprime.com')
BEGIN
  INSERT INTO lab_promo_generation_holds(customer_id,reason,created_at)
  SELECT NEW.customer_id,'disposable-email',CAST(strftime('%s','now') AS INTEGER)*1000
  WHERE NOT EXISTS (SELECT 1 FROM lab_promo_generation_holds
                    WHERE customer_id=NEW.customer_id);
END;

CREATE TRIGGER lab_promo_hold_contact_update
AFTER UPDATE OF email,verified_at ON lab_customer_contacts
WHEN NEW.verified_at IS NOT NULL AND NEW.email IS NOT NULL
  AND (lower(NEW.email) LIKE '%@yournike.com' OR lower(NEW.email) LIKE '%@weekprime.com')
BEGIN
  INSERT INTO lab_promo_generation_holds(customer_id,reason,created_at)
  SELECT NEW.customer_id,'disposable-email',CAST(strftime('%s','now') AS INTEGER)*1000
  WHERE NOT EXISTS (SELECT 1 FROM lab_promo_generation_holds
                    WHERE customer_id=NEW.customer_id);
END;

INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0036-clerk-contact-hold-upsert',CAST(strftime('%s','now') AS INTEGER)*1000);
