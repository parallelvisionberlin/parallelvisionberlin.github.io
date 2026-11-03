-- Separate single-dimension counters. No per-visitor rows, IPs, raw user agents,
-- account linkage, exact coordinates, inferred ages or cross-dimension profiles.
CREATE TABLE IF NOT EXISTS lab_traffic_audience_daily (
  day_utc TEXT NOT NULL,
  dimension TEXT NOT NULL CHECK(dimension IN ('country','region','city','device','browser','os','language','hour')),
  value TEXT NOT NULL CHECK(length(value) BETWEEN 1 AND 180),
  page_views INTEGER NOT NULL DEFAULT 0 CHECK(page_views>=0),
  entrances INTEGER NOT NULL DEFAULT 0 CHECK(entrances>=0),
  PRIMARY KEY(day_utc,dimension,value)
);
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0058-traffic-audience',CAST(strftime('%s','now') AS INTEGER)*1000);
