-- First-party, cookie-free PV LAB traffic counts. Anonymous day/page/source totals only.
-- Never store IP addresses, user agents, user IDs, full referrers, or browser identifiers.
CREATE TABLE IF NOT EXISTS lab_traffic_daily (
  day_utc TEXT NOT NULL,
  page TEXT NOT NULL,
  source TEXT NOT NULL,
  page_views INTEGER NOT NULL DEFAULT 0 CHECK(page_views >= 0),
  entrances INTEGER NOT NULL DEFAULT 0 CHECK(entrances >= 0),
  PRIMARY KEY(day_utc,page,source)
);
CREATE INDEX IF NOT EXISTS lab_traffic_daily_day ON lab_traffic_daily(day_utc);
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0018-anonymous-traffic',CAST(strftime('%s','now') AS INTEGER)*1000);
