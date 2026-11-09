-- Authenticated first-party activation milestones, not a clickstream or Meta Pixel.
-- Account ID is authenticated by the Worker, never supplied by the browser.
-- One compact row per customer, day, event, surface and non-sensitive detail.
-- No prompts, uploaded content, IP, email, referrer, UTM or browser fingerprint.
CREATE TABLE IF NOT EXISTS lab_customer_journey (
  customer_id TEXT NOT NULL REFERENCES lab_customers(id) ON DELETE CASCADE,
  day_utc TEXT NOT NULL,
  event TEXT NOT NULL CHECK(event IN ('studio_opened','mood_selected','model_selected','photo_added','generate_clicked','offer_viewed','offer_clicked','checkout_clicked')),
  surface TEXT NOT NULL CHECK(surface IN ('studio','moods','billing')),
  detail TEXT NOT NULL DEFAULT 'none',
  first_at INTEGER NOT NULL,
  last_at INTEGER NOT NULL,
  event_count INTEGER NOT NULL DEFAULT 1 CHECK(event_count BETWEEN 1 AND 100),
  PRIMARY KEY(customer_id,day_utc,event,surface,detail)
);
CREATE INDEX IF NOT EXISTS lab_customer_journey_day ON lab_customer_journey(day_utc,event,surface);
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0062-customer-journey',CAST(strftime('%s','now') AS INTEGER)*1000);
