-- PV Soul: hosted Qwen Image 2512 character training through fal.ai.
-- Additive and idempotent. Apply only to the Parallel Vision Lab D1 database.
CREATE TABLE IF NOT EXISTS soul_datasets (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  bytes INTEGER NOT NULL CHECK (bytes >= 0),
  photo_count INTEGER NOT NULL CHECK (photo_count BETWEEN 20 AND 80),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS soul_datasets_owner ON soul_datasets(owner_id,created_at DESC);

CREATE TABLE IF NOT EXISTS soul_characters (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  trigger_word TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('submitting','queued','training','ready','failed','uncertain')),
  fal_request_id TEXT,
  dataset_id TEXT,
  lora_source_url TEXT,
  lora_object_key TEXT,
  lora_bytes INTEGER,
  error TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_poll INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS soul_characters_owner ON soul_characters(owner_id,created_at DESC);
CREATE INDEX IF NOT EXISTS soul_characters_training ON soul_characters(state,last_poll);

INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0004-pv-soul',CAST(strftime('%s','now') AS INTEGER)*1000);
