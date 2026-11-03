-- Authenticated first-party conversion diagnostics only. No media, prompts, IPs or emails.
-- One first occurrence per customer/event, retained for at most 90 days.
CREATE TABLE IF NOT EXISTS lab_mood_offer_funnel (
  customer_id TEXT NOT NULL REFERENCES lab_customers(id) ON DELETE CASCADE,
  event TEXT NOT NULL CHECK(event IN ('offer_viewed','offer_clicked')),
  source TEXT NOT NULL CHECK(source='moods_result'),
  created_at INTEGER NOT NULL,
  PRIMARY KEY(customer_id,event)
);
CREATE INDEX IF NOT EXISTS lab_mood_offer_funnel_created ON lab_mood_offer_funnel(created_at);
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0059-mood-offer-funnel',CAST(strftime('%s','now') AS INTEGER)*1000);
