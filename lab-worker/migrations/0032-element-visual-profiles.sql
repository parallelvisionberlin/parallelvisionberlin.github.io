-- Additive and repeatable Elements metadata. Photo Packs and the existing packs
-- table are unchanged; both old and newly saved Elements retain their IDs.
CREATE TABLE IF NOT EXISTS element_visual_profiles (
  pack_id TEXT PRIMARY KEY REFERENCES packs(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL,
  profile_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS element_visual_profiles_owner
ON element_visual_profiles(owner_id);
CREATE TABLE IF NOT EXISTS element_analysis_quota (
  owner_id TEXT NOT NULL,
  day_key INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(owner_id,day_key)
);
CREATE TABLE IF NOT EXISTS element_analysis_global (
  day_key INTEGER PRIMARY KEY,
  used INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0032-element-visual-profiles',CAST(strftime('%s','now') AS INTEGER)*1000);
