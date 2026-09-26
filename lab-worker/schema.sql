PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS settings (
  owner_id TEXT PRIMARY KEY,
  encrypted_key TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1)),
  terms_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (terms_confirmed IN (0,1)),
  daily_limit_microusd INTEGER NOT NULL DEFAULT 10000000 CHECK (daily_limit_microusd BETWEEN 1000000 AND 100000000),
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('source','video')),
  mime TEXT NOT NULL,
  filename TEXT NOT NULL,
  bytes INTEGER NOT NULL CHECK (bytes >= 0),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS assets_owner ON assets(owner_id,created_at);
CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  source_id TEXT NOT NULL REFERENCES assets(id),
  params TEXT NOT NULL,
  estimate_microusd INTEGER NOT NULL CHECK (estimate_microusd >= 0),
  expires_at INTEGER NOT NULL,
  vendor_quote_id TEXT NOT NULL,
  expected_cost TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  source_id TEXT NOT NULL REFERENCES assets(id),
  quote_id TEXT UNIQUE REFERENCES quotes(id),
  params TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('draft','submitting','queued','running','saving','completed','failed','uncertain','resolved')),
  provider_id TEXT,
  settled_cost REAL,
  remote_url TEXT,
  output_id TEXT REFERENCES assets(id),
  estimate_microusd INTEGER NOT NULL DEFAULT 0,
  error TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_poll INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS jobs_owner_history ON jobs(owner_id,created_at DESC,id DESC);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_job_per_owner ON jobs(owner_id)
 WHERE state IN ('submitting','queued','running','saving','uncertain');
CREATE TABLE IF NOT EXISTS spend (
  job_id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  estimate_microusd INTEGER NOT NULL CHECK (estimate_microusd >= 0),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS spend_owner_day ON spend(owner_id,created_at);
-- The ledger survives history deletion. Failed/uncertain attempts remain counted conservatively.
CREATE TRIGGER IF NOT EXISTS reserve_estimated_spend AFTER INSERT ON jobs
 WHEN NEW.quote_id IS NOT NULL
 BEGIN
  INSERT INTO spend(job_id,owner_id,estimate_microusd,created_at)
  VALUES (NEW.id,NEW.owner_id,NEW.estimate_microusd,NEW.created_at);
 END;
