-- Private account-scoped Gemini style analysis quota, D1 LAB_DB only.
-- Idempotent, additive. Does not modify credit balances or saved imagery.
CREATE TABLE IF NOT EXISTS moodboard_analysis_quota (
  owner_id TEXT NOT NULL,
  day_key INTEGER NOT NULL,
  used INTEGER NOT NULL CHECK(used BETWEEN 0 AND 6),
  PRIMARY KEY(owner_id,day_key)
);
CREATE TABLE IF NOT EXISTS moodboard_analysis_global (
  day_key INTEGER PRIMARY KEY,
  used INTEGER NOT NULL CHECK(used BETWEEN 0 AND 100)
);
CREATE TABLE IF NOT EXISTS moodboard_style_data(
  id TEXT PRIMARY KEY REFERENCES moodboards(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL,
  palette TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(palette)),
  qualities TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(qualities))
);
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES ('0010-mood-creator-analysis',CAST(strftime('%s','now') AS INTEGER)*1000);
