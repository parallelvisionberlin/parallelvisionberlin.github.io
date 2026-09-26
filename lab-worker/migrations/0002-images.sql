-- Atomic D1 migration: nullable sources enable text-to-image; all rows copied.
CREATE TABLE quotes_v2 (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  source_id TEXT REFERENCES assets(id),
  params TEXT NOT NULL,
  estimate_microusd INTEGER NOT NULL CHECK (estimate_microusd >= 0),
  expires_at INTEGER NOT NULL,
  vendor_quote_id TEXT NOT NULL,
  expected_cost TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE TABLE jobs_v2 (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  source_id TEXT REFERENCES assets(id),
  quote_id TEXT UNIQUE REFERENCES quotes_v2(id),
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

INSERT INTO quotes_v2 SELECT * FROM quotes;
INSERT INTO jobs_v2 SELECT * FROM jobs;
DROP TABLE jobs;
DROP TABLE quotes;
ALTER TABLE quotes_v2 RENAME TO quotes;
ALTER TABLE jobs_v2 RENAME TO jobs;
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

-- Source assets include original uploads and still-image outputs reusable in video.
CREATE TABLE IF NOT EXISTS packs(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL,name TEXT NOT NULL,refs TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS packs_owner ON packs(owner_id,name);
CREATE TABLE IF NOT EXISTS lab_migrations(id TEXT PRIMARY KEY,applied_at INTEGER NOT NULL);

INSERT INTO lab_migrations(id,applied_at) VALUES('20260926-images',unixepoch()*1000);
