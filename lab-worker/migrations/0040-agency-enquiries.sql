-- Agency records are separate from customers, credits, and creative assets.
CREATE TABLE IF NOT EXISTS agency_enquiries (
  id TEXT PRIMARY KEY,
  digest TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT '',
  direction TEXT NOT NULL,
  budget TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','read','archived')),
  mail_state TEXT NOT NULL DEFAULT 'pending' CHECK(mail_state IN ('pending','sending','sent','failed')),
  mail_attempts INTEGER NOT NULL DEFAULT 0,
  first_attempt INTEGER,
  last_attempt INTEGER,
  delivery_id TEXT
);
CREATE INDEX IF NOT EXISTS agency_enquiries_created ON agency_enquiries(created_at DESC,id);
CREATE INDEX IF NOT EXISTS agency_enquiries_pending ON agency_enquiries(mail_state,last_attempt);
CREATE TABLE IF NOT EXISTS agency_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS agency_daily (
  day TEXT NOT NULL,
  event TEXT NOT NULL,
  source TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(day,event,source)
);
