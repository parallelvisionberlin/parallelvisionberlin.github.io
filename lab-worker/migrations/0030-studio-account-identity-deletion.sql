-- PV LAB-only terminal identity cleanup. Leave the legacy Parallel Vision
-- Clerk application and Nina OWNER_DB untouched.
CREATE TABLE IF NOT EXISTS lab_studio_identity_deletions (
  customer_id TEXT PRIMARY KEY REFERENCES lab_customers(id),
  new_subject TEXT,
  requested_at INTEGER NOT NULL,
  banned_at INTEGER,
  completed_at INTEGER,
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','complete'))
);
CREATE INDEX IF NOT EXISTS lab_studio_identity_deletions_pending
  ON lab_studio_identity_deletions(state,requested_at);

-- Short-lived, non-reversible token-subject tombstones block an already-issued
-- Clerk JWT from re-onboarding after its Clerk user and identity link are gone.
-- Re-signups get a new Clerk subject; verified-email welcome claims persist.
CREATE TABLE IF NOT EXISTS lab_studio_deleted_subject_keys (
  subject_key TEXT PRIMARY KEY CHECK(length(subject_key)=64),
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lab_studio_deleted_subjects_expires
  ON lab_studio_deleted_subject_keys(expires_at);

-- Covers requests accepted before this rollout, including old test accounts.
-- Only links issued by the independent PV LAB Clerk app are eligible.
INSERT OR IGNORE INTO lab_studio_identity_deletions(customer_id,new_subject,requested_at)
SELECT c.customer_id,l.new_subject,c.requested_at
FROM lab_account_closures c
JOIN lab_clerk_identity_links l ON l.canonical_id=c.customer_id AND l.kind='customer'
JOIN lab_customers w ON w.id=c.customer_id;

INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0030-studio-account-identity-deletion',CAST(strftime('%s','now') AS INTEGER)*1000);
