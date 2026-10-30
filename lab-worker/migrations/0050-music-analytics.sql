-- Additive aggregate analytics; existing counts remain unchanged.
CREATE TABLE IF NOT EXISTS music_analytics_receipts (
 id TEXT PRIMARY KEY, release_id TEXT NOT NULL, event TEXT NOT NULL, service TEXT NOT NULL, source TEXT NOT NULL, campaign TEXT NOT NULL, hour_utc TEXT NOT NULL, country TEXT NOT NULL, region TEXT NOT NULL, city TEXT NOT NULL, device TEXT NOT NULL, browser TEXT NOT NULL, os TEXT NOT NULL, medium TEXT NOT NULL, content TEXT NOT NULL, term TEXT NOT NULL, delay_bucket TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS music_analytics_expiry ON music_analytics_receipts(created_at);
CREATE TABLE IF NOT EXISTS music_analytics_hourly (
release_id TEXT NOT NULL, event TEXT NOT NULL, service TEXT NOT NULL, source TEXT NOT NULL, campaign TEXT NOT NULL, hour_utc TEXT NOT NULL, country TEXT NOT NULL, region TEXT NOT NULL, city TEXT NOT NULL, device TEXT NOT NULL, browser TEXT NOT NULL, os TEXT NOT NULL, medium TEXT NOT NULL, content TEXT NOT NULL, term TEXT NOT NULL, delay_bucket TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(release_id,event,service,source,campaign,hour_utc,country,region,city,device,browser,os,medium,content,term,delay_bucket)
);
CREATE INDEX IF NOT EXISTS music_analytics_release ON music_analytics_hourly(release_id,hour_utc);
CREATE TRIGGER IF NOT EXISTS music_analytics_count AFTER INSERT ON music_analytics_receipts BEGIN
 INSERT INTO music_analytics_hourly(release_id,event,service,source,campaign,hour_utc,country,region,city,device,browser,os,medium,content,term,delay_bucket,count) VALUES(NEW.release_id,NEW.event,NEW.service,NEW.source,NEW.campaign,NEW.hour_utc,NEW.country,NEW.region,NEW.city,NEW.device,NEW.browser,NEW.os,NEW.medium,NEW.content,NEW.term,NEW.delay_bucket,1) ON CONFLICT(release_id,event,service,source,campaign,hour_utc,country,region,city,device,browser,os,medium,content,term,delay_bucket) DO UPDATE SET count=count+1;
END;
