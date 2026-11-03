-- Additive Smart Links features. Existing releases, counters and pixels stay intact.
CREATE TABLE IF NOT EXISTS music_presaves (
 release_id TEXT PRIMARY KEY REFERENCES music_releases(id),
 url TEXT NOT NULL DEFAULT '', mode TEXT NOT NULL DEFAULT 'off' CHECK(mode IN ('off','before-release','always'))
);
CREATE TABLE IF NOT EXISTS music_experiments (
 id TEXT PRIMARY KEY, account_id TEXT NOT NULL, release_id TEXT NOT NULL DEFAULT '',
 hypothesis TEXT NOT NULL, change_note TEXT NOT NULL DEFAULT '', result_note TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'idea' CHECK(status IN ('idea','testing','concluded')),
 context TEXT NOT NULL DEFAULT '{}', revision INTEGER NOT NULL DEFAULT 1,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS music_experiments_account ON music_experiments(account_id,updated_at);
-- Random page-load receipts expire with other event receipts; no cross-visit identifier.
CREATE TABLE IF NOT EXISTS music_visit_receipts (
 id TEXT PRIMARY KEY, release_id TEXT NOT NULL, day_utc TEXT NOT NULL, source TEXT NOT NULL, campaign TEXT NOT NULL,
 converted INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS music_visits_expiry ON music_visit_receipts(created_at);
-- Out-of-order network delivery must not lose first-click matches.
CREATE TABLE IF NOT EXISTS music_visit_clicks (
 view_id TEXT NOT NULL, release_id TEXT NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(view_id,release_id)
);
CREATE INDEX IF NOT EXISTS music_visit_clicks_expiry ON music_visit_clicks(created_at);
CREATE TABLE IF NOT EXISTS music_visit_daily (
 release_id TEXT NOT NULL, day_utc TEXT NOT NULL, source TEXT NOT NULL, campaign TEXT NOT NULL,
 views INTEGER NOT NULL DEFAULT 0, converted INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(release_id,day_utc,source,campaign)
);
CREATE TRIGGER IF NOT EXISTS music_visit_count AFTER INSERT ON music_visit_receipts BEGIN
 INSERT INTO music_visit_daily(release_id,day_utc,source,campaign,views,converted)
 VALUES(NEW.release_id,NEW.day_utc,NEW.source,NEW.campaign,1,NEW.converted)
 ON CONFLICT(release_id,day_utc,source,campaign) DO UPDATE SET views=views+1,converted=converted+excluded.converted;
END;
CREATE TRIGGER IF NOT EXISTS music_visit_conversion AFTER UPDATE OF converted ON music_visit_receipts
 WHEN OLD.converted=0 AND NEW.converted=1 BEGIN
 UPDATE music_visit_daily SET converted=converted+1 WHERE release_id=NEW.release_id AND day_utc=NEW.day_utc AND source=NEW.source AND campaign=NEW.campaign;
END;
