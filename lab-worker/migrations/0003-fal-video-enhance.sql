CREATE TABLE IF NOT EXISTS provider_keys (
  owner_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('fal')),
  encrypted_key TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (owner_id,provider)
);
INSERT OR IGNORE INTO lab_migrations(id,applied_at) VALUES('0003-fal-video-enhance',unixepoch()*1000);
