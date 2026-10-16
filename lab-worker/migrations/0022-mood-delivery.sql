-- Repeat-safe Spicy reference staging cache and private Mood latency metrics.
-- All rows are scoped to their original authenticated PV LAB owner.
CREATE TABLE IF NOT EXISTS lab_spicy_reference_cache (
  owner_id TEXT NOT NULL,
  provider_key_fingerprint TEXT NOT NULL,
  ref_key TEXT NOT NULL,
  uri TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  touched_at INTEGER NOT NULL,
  PRIMARY KEY(owner_id,provider_key_fingerprint,ref_key)
);
CREATE INDEX IF NOT EXISTS lab_spicy_reference_expiry
  ON lab_spicy_reference_cache(expires_at);
CREATE TABLE IF NOT EXISTS lab_mood_performance (
  quote_id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  job_id TEXT UNIQUE,
  quote_started_at INTEGER NOT NULL,
  quote_ready_at INTEGER,
  submitted_at INTEGER,
  provider_finished_at INTEGER,
  archived_at INTEGER,
  first_preview_at INTEGER,
  client_preparation_ms INTEGER,
  client_submit_ms INTEGER
);
CREATE INDEX IF NOT EXISTS lab_mood_performance_owner
  ON lab_mood_performance(owner_id,quote_started_at DESC);
CREATE INDEX IF NOT EXISTS lab_mood_performance_job
  ON lab_mood_performance(job_id);
