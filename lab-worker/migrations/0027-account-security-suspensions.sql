-- PV LAB only. Reversible account-level suspension for the seven verified,
-- unpaid disposable-email promo-abuse accounts created 16 October 2026.
-- No prompt, image, IP or personally identifying email address is stored here.
-- This is a security review, not a determination that illegal imagery was made.
CREATE TABLE IF NOT EXISTS lab_account_security_suspensions (
  customer_id TEXT PRIMARY KEY REFERENCES lab_customers(id),
  reason TEXT NOT NULL CHECK(reason IN ('suspected-promotional-abuse')),
  created_at INTEGER NOT NULL,
  lifted_at INTEGER
);
CREATE INDEX IF NOT EXISTS lab_account_security_suspensions_open
  ON lab_account_security_suspensions(lifted_at,created_at);

-- Only the specific pre-existing suspicious cohort. Later users on the same
-- disposable domains are not silently subjected to account-wide suspension.
-- Their free-credit restrictions remain independently enforced as before.
INSERT OR IGNORE INTO lab_account_security_suspensions(customer_id,reason,created_at)
SELECT h.customer_id,'suspected-promotional-abuse',CAST(strftime('%s','now') AS INTEGER)*1000
FROM lab_promo_generation_holds h
JOIN lab_customers c ON c.id=h.customer_id
JOIN lab_customer_contacts p ON p.customer_id=h.customer_id
WHERE h.released_at IS NULL
  AND h.reason='disposable-email'
  AND p.verified_at IS NOT NULL
  AND (lower(p.email) LIKE '%@yournike.com' OR lower(p.email) LIKE '%@weekprime.com')
  AND c.created_at>=1792108800000 AND c.created_at<1792195200000
  AND NOT EXISTS(SELECT 1 FROM lab_credit_entries e WHERE e.customer_id=c.id
                 AND e.kind IN ('purchase','subscription'))
  AND NOT EXISTS(SELECT 1 FROM lab_account_closures x WHERE x.customer_id=c.id);

-- Fail closed for attempts to create new jobs even if a customer route bypasses
-- the request-level guard. Existing jobs and refunds are left intact.
CREATE TRIGGER IF NOT EXISTS lab_security_suspension_blocks_job
BEFORE INSERT ON jobs
WHEN EXISTS(SELECT 1 FROM lab_account_security_suspensions s
  WHERE s.customer_id=NEW.owner_id AND s.lifted_at IS NULL)
BEGIN
  SELECT RAISE(ABORT,'PV LAB account access restricted');
END;

INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0027-account-security-suspensions',CAST(strftime('%s','now') AS INTEGER)*1000);
