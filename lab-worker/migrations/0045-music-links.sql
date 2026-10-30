-- Music release links are independent of Lab accounts, credits and private media.
CREATE TABLE IF NOT EXISTS music_link_settings (
  id INTEGER PRIMARY KEY CHECK(id=1), pixel_id TEXT NOT NULL,
  click_event TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1
);
INSERT OR IGNORE INTO music_link_settings(id,pixel_id,click_event)
VALUES(1,'1746851780072706','Hypeddit Smart Link Click');
CREATE TABLE IF NOT EXISTS music_releases (
  id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, artist TEXT NOT NULL,
  catalogue TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '',
  artwork_url TEXT NOT NULL DEFAULT '', audio_url TEXT NOT NULL DEFAULT '',
  release_date TEXT NOT NULL DEFAULT '', links TEXT NOT NULL DEFAULT '[]',
  pixel_id TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft','published','archived')),
  revision INTEGER NOT NULL DEFAULT 1, created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS music_link_media (
  id TEXT PRIMARY KEY, object_key TEXT NOT NULL UNIQUE, mime TEXT NOT NULL,
  bytes INTEGER NOT NULL, created_by TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS music_link_daily (
  day_utc TEXT NOT NULL, release_id TEXT NOT NULL REFERENCES music_releases(id),
  event TEXT NOT NULL, service TEXT NOT NULL, source TEXT NOT NULL, campaign TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(day_utc,release_id,event,service,source,campaign)
);
CREATE INDEX IF NOT EXISTS music_link_daily_release ON music_link_daily(release_id,day_utc);
CREATE TABLE IF NOT EXISTS music_link_receipts (
  id TEXT PRIMARY KEY, release_id TEXT NOT NULL REFERENCES music_releases(id),
  event TEXT NOT NULL, service TEXT NOT NULL, source TEXT NOT NULL, campaign TEXT NOT NULL,
  day_utc TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS music_link_receipts_expiry ON music_link_receipts(created_at);
CREATE TRIGGER IF NOT EXISTS music_link_count AFTER INSERT ON music_link_receipts BEGIN
  INSERT INTO music_link_daily(day_utc,release_id,event,service,source,campaign,count)
    VALUES(NEW.day_utc,NEW.release_id,NEW.event,NEW.service,NEW.source,NEW.campaign,1)
    ON CONFLICT(day_utc,release_id,event,service,source,campaign) DO UPDATE SET count=count+1;
END;
CREATE TABLE IF NOT EXISTS music_link_limits (
  key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
-- Verified from the existing public catalogue. No fabricated streaming URLs or metrics.
INSERT OR IGNORE INTO music_releases(id,slug,title,artist,catalogue,artwork_url,links,status,created_by,created_at,updated_at)
VALUES('d830f40d-384b-4df9-a5e5-3453c1d25515','sube','Sube','BadWolf & Jenn LSS','PV015',
  'https://parallelvisionlabel.com/assets/optimized/artworks/sube-pv015.jpg',
  '[]','draft','label',1793354400000,1793354400000);
INSERT OR IGNORE INTO music_releases(id,slug,title,artist,catalogue,artwork_url,links,status,created_by,created_at,updated_at)
VALUES('a87d2306-aa34-48f1-ade0-a7f95d611013','stay-low','Stay Low','Alejandro Molinari feat. Nina FOK','PV013',
  'https://parallelvisionlabel.com/assets/optimized/artworks/staylowart.webp',
  '[{"service":"soundcloud","url":"https://soundcloud.com/parallelvisionlabel/stay-low"}]',
  'published','label',1793354300000,1793354300000);
