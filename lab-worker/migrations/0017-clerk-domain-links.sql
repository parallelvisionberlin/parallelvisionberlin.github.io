-- LAB_DB only. Two independent Clerk applications: explicit, one-time account
-- transfer without ever inferring identity from email or changing wallet IDs.
CREATE TABLE IF NOT EXISTS lab_clerk_migration_codes (
  code_hash TEXT PRIMARY KEY CHECK (length(code_hash)=64),
  canonical_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('owner','customer')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lab_clerk_migration_codes_subject
  ON lab_clerk_migration_codes(canonical_id,expires_at);
CREATE TABLE IF NOT EXISTS lab_clerk_identity_links (
  new_subject TEXT PRIMARY KEY,
  canonical_id TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('owner','customer')),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lab_clerk_identity_links_canonical
  ON lab_clerk_identity_links(canonical_id);
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES ('0017-clerk-domain-links',CAST(strftime('%s','now') AS INTEGER)*1000);
