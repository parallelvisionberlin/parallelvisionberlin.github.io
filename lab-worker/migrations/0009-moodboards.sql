-- PV Lab private personal moodboards. LAB_DB only. Idempotent and additive.
CREATE TABLE IF NOT EXISTS moodboards (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 64),
  direction TEXT NOT NULL DEFAULT '',
  base_mood_id TEXT,
  intensity INTEGER NOT NULL DEFAULT 60 CHECK(intensity BETWEEN 1 AND 100),
  image_ids TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(image_ids)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS moodboards_owner ON moodboards(owner_id,updated_at DESC);
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES ('0009-moodboards',CAST(strftime('%s','now') AS INTEGER)*1000);
