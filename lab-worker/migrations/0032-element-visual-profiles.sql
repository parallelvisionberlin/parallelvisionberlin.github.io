-- Elements remains the existing private packs library. Add only optional
-- machine-readable scene identity metadata and bounded one-time analysis quotas.
-- Existing users, images, pack IDs, reference order and Photo Packs are intact.
ALTER TABLE packs ADD COLUMN element_profile TEXT;
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
