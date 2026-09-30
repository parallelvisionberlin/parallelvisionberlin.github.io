-- Each secondary adapter has its own training record and its own weights.
-- No existing Qwen identity is relabelled or replaced.
CREATE TABLE IF NOT EXISTS soul_reinterpret_links (
  adapter_id TEXT PRIMARY KEY REFERENCES soul_characters(id) ON DELETE CASCADE,
  parent_id TEXT NOT NULL UNIQUE REFERENCES soul_characters(id),
  base_model TEXT NOT NULL CHECK(base_model='z-image-turbo'),
  trainer TEXT NOT NULL CHECK(trainer='fal-ai/z-image-trainer')
);
INSERT OR IGNORE INTO lab_migrations(id,applied_at) VALUES('0005-soul-reinterpret',CAST(strftime('%s','now') AS INTEGER)*1000);
