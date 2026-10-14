-- Owner-only diagnostic outcomes for Clerk email synchronization.
-- Only aggregated status counts are stored. Never store API keys, email values,
-- Clerk user IDs or response bodies here.
CREATE TABLE IF NOT EXISTS lab_clerk_sync_diagnostics(
  id INTEGER PRIMARY KEY CHECK(id=1),
  checked_at INTEGER NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('owner','scheduled')),
  result_json TEXT NOT NULL CHECK(length(result_json)<=2048)
);
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0016-clerk-sync-diagnostics',CAST(strftime('%s','now') AS INTEGER)*1000);
