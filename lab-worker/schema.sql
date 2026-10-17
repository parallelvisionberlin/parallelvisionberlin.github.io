PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS settings (
  owner_id TEXT PRIMARY KEY,
  encrypted_key TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1)),
  terms_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (terms_confirmed IN (0,1)),
  daily_limit_microusd INTEGER NOT NULL DEFAULT 10000000 CHECK (daily_limit_microusd BETWEEN 1000000 AND 100000000),
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('source','video')),
  mime TEXT NOT NULL,
  filename TEXT NOT NULL,
  bytes INTEGER NOT NULL CHECK (bytes >= 0),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS assets_owner ON assets(owner_id,created_at);
CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  source_id TEXT REFERENCES assets(id),
  params TEXT NOT NULL,
  estimate_microusd INTEGER NOT NULL CHECK (estimate_microusd >= 0),
  expires_at INTEGER NOT NULL,
  vendor_quote_id TEXT NOT NULL,
  expected_cost TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  source_id TEXT REFERENCES assets(id),
  quote_id TEXT UNIQUE REFERENCES quotes(id),
  params TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('draft','submitting','queued','running','saving','completed','failed','uncertain','resolved')),
  provider_id TEXT,
  settled_cost REAL,
  remote_url TEXT,
  output_id TEXT REFERENCES assets(id),
  estimate_microusd INTEGER NOT NULL DEFAULT 0,
  error TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_poll INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS jobs_owner_history ON jobs(owner_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS jobs_owner_active ON jobs(owner_id,state);
CREATE TABLE IF NOT EXISTS spend (
  job_id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  estimate_microusd INTEGER NOT NULL CHECK (estimate_microusd >= 0),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS spend_owner_day ON spend(owner_id,created_at);
CREATE TRIGGER IF NOT EXISTS reserve_estimated_spend AFTER INSERT ON jobs
 WHEN NEW.quote_id IS NOT NULL
 BEGIN
  INSERT INTO spend(job_id,owner_id,estimate_microusd,created_at)
  VALUES (NEW.id,NEW.owner_id,NEW.estimate_microusd,NEW.created_at);
 END;
CREATE TABLE IF NOT EXISTS packs(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL,name TEXT NOT NULL,refs TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS packs_owner ON packs(owner_id,name);
CREATE TABLE IF NOT EXISTS moodboards(
  id TEXT PRIMARY KEY,owner_id TEXT NOT NULL,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 64),
  direction TEXT NOT NULL DEFAULT '',base_mood_id TEXT,
  intensity INTEGER NOT NULL DEFAULT 60 CHECK(intensity BETWEEN 1 AND 100),
  image_ids TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(image_ids)),
  created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS moodboards_owner ON moodboards(owner_id,updated_at DESC);
CREATE TABLE IF NOT EXISTS moodboard_analysis_quota(
  owner_id TEXT NOT NULL,day_key INTEGER NOT NULL,
  used INTEGER NOT NULL CHECK(used BETWEEN 0 AND 6),
  PRIMARY KEY(owner_id,day_key)
);
CREATE TABLE IF NOT EXISTS moodboard_analysis_global(
  day_key INTEGER PRIMARY KEY,
  used INTEGER NOT NULL CHECK(used BETWEEN 0 AND 100)
);
CREATE TABLE IF NOT EXISTS moodboard_style_data(
  id TEXT PRIMARY KEY REFERENCES moodboards(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL,
  palette TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(palette)),
  qualities TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(qualities))
);
-- Repeat-safe Spicy reference staging cache and private Mood latency metrics.
-- All rows are scoped to their original authenticated PV LAB owner.
CREATE TABLE IF NOT EXISTS lab_spicy_reference_cache (
  owner_id TEXT NOT NULL,
  provider_key_fingerprint TEXT NOT NULL,
  ref_key TEXT NOT NULL,
  uri TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  touched_at INTEGER NOT NULL,
  PRIMARY KEY(owner_id,provider_key_fingerprint,ref_key)
);
CREATE INDEX IF NOT EXISTS lab_spicy_reference_expiry
  ON lab_spicy_reference_cache(expires_at);
CREATE TABLE IF NOT EXISTS lab_mood_performance (
  quote_id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  job_id TEXT UNIQUE,
  quote_started_at INTEGER NOT NULL,
  quote_ready_at INTEGER,
  submitted_at INTEGER,
  provider_finished_at INTEGER,
  archived_at INTEGER,
  first_preview_at INTEGER,
  client_preparation_ms INTEGER,
  client_submit_ms INTEGER
);
CREATE INDEX IF NOT EXISTS lab_mood_performance_owner
  ON lab_mood_performance(owner_id,quote_started_at DESC);
CREATE INDEX IF NOT EXISTS lab_mood_performance_job
  ON lab_mood_performance(job_id);

CREATE TABLE IF NOT EXISTS lab_migrations(id TEXT PRIMARY KEY,applied_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS lab_clerk_sync_diagnostics (
  id INTEGER PRIMARY KEY CHECK(id=1),
  checked_at INTEGER NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('owner','scheduled')),
  result_json TEXT NOT NULL CHECK(length(result_json)<=2048)
);


CREATE TABLE IF NOT EXISTS soul_datasets (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  bytes INTEGER NOT NULL CHECK (bytes >= 0),
  photo_count INTEGER NOT NULL CHECK (photo_count BETWEEN 20 AND 80),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS soul_datasets_owner ON soul_datasets(owner_id,created_at DESC);
CREATE TABLE IF NOT EXISTS soul_characters (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  trigger_word TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('submitting','queued','training','ready','failed','uncertain')),
  fal_request_id TEXT,
  dataset_id TEXT,
  lora_source_url TEXT,
  lora_object_key TEXT,
  lora_bytes INTEGER,
  error TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_poll INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS soul_characters_owner ON soul_characters(owner_id,created_at DESC);
CREATE INDEX IF NOT EXISTS soul_characters_training ON soul_characters(state,last_poll);

-- Each secondary adapter has its own training record and its own weights.
-- No existing Qwen identity is relabelled or replaced.
CREATE TABLE IF NOT EXISTS soul_reinterpret_links (
  adapter_id TEXT PRIMARY KEY REFERENCES soul_characters(id) ON DELETE CASCADE,
  parent_id TEXT NOT NULL UNIQUE REFERENCES soul_characters(id),
  base_model TEXT NOT NULL CHECK(base_model='z-image-turbo'),
  trainer TEXT NOT NULL CHECK(trainer='fal-ai/z-image-trainer')
);
INSERT OR IGNORE INTO lab_migrations(id,applied_at) VALUES('0005-soul-reinterpret',CAST(strftime('%s','now') AS INTEGER)*1000);

-- LAB_DB only. Keep financial records; close access before removing creative data.
CREATE TABLE IF NOT EXISTS lab_account_closures (
  customer_id TEXT PRIMARY KEY REFERENCES lab_customers(id),
  state TEXT NOT NULL DEFAULT 'requested' CHECK(state IN ('requested','deleted')),
  requested_at INTEGER NOT NULL,
  completed_at INTEGER
);
CREATE TABLE IF NOT EXISTS lab_billing_reviews (
  event_id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES lab_customers(id),
  object_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'open' CHECK(state IN ('open','resolved')),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lab_billing_reviews_customer ON lab_billing_reviews(customer_id,state);
CREATE TRIGGER IF NOT EXISTS lab_block_closed_jobs BEFORE INSERT ON jobs
WHEN EXISTS(SELECT 1 FROM lab_account_closures WHERE customer_id=NEW.owner_id)
BEGIN SELECT RAISE(ABORT,'PV Lab account is closed'); END;
CREATE TRIGGER IF NOT EXISTS lab_block_held_jobs BEFORE INSERT ON jobs
WHEN NEW.state <> 'draft' AND EXISTS(SELECT 1 FROM lab_billing_reviews WHERE customer_id=NEW.owner_id AND state='open')
BEGIN SELECT RAISE(ABORT,'PV Lab billing review required'); END;
CREATE TRIGGER IF NOT EXISTS lab_block_closed_assets BEFORE INSERT ON assets
WHEN EXISTS(SELECT 1 FROM lab_account_closures WHERE customer_id=NEW.owner_id)
BEGIN SELECT RAISE(ABORT,'PV Lab account is closed'); END;
CREATE TRIGGER IF NOT EXISTS lab_block_closed_quotes BEFORE INSERT ON quotes
WHEN EXISTS(SELECT 1 FROM lab_account_closures WHERE customer_id=NEW.owner_id)
BEGIN SELECT RAISE(ABORT,'PV Lab account is closed'); END;
INSERT OR IGNORE INTO lab_migrations(id,applied_at) VALUES('0011-customer-lifecycle',CAST(strftime('%s','now') AS INTEGER)*1000);

-- LAB_DB only. Two independent Clerk applications: explicit, one-time account
-- transfer without ever inferring identity from email or changing wallet IDs.
CREATE TABLE IF NOT EXISTS lab_clerk_migration_codes (
  code_hash TEXT PRIMARY KEY CHECK (length(code_hash)=64),
  canonical_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('owner','customer')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lab_clerk_migration_codes_subject
  ON lab_clerk_migration_codes(canonical_id,expires_at);
CREATE TABLE IF NOT EXISTS lab_clerk_identity_links (
  new_subject TEXT PRIMARY KEY,
  canonical_id TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('owner','customer')),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lab_clerk_identity_links_canonical
  ON lab_clerk_identity_links(canonical_id);
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES ('0017-clerk-domain-links',CAST(strftime('%s','now') AS INTEGER)*1000);

-- Aggregate-only public traffic metrics; applied by the matching 0018 remote migration.
CREATE TABLE IF NOT EXISTS lab_studio_identity_deletions (
  customer_id TEXT PRIMARY KEY REFERENCES lab_customers(id),
  new_subject TEXT,
  requested_at INTEGER NOT NULL,
  banned_at INTEGER,
  completed_at INTEGER,
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','complete'))
);
CREATE INDEX IF NOT EXISTS lab_studio_identity_deletions_pending
  ON lab_studio_identity_deletions(state,requested_at);
CREATE TABLE IF NOT EXISTS lab_studio_deleted_subject_keys (
  subject_key TEXT PRIMARY KEY CHECK(length(subject_key)=64),
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lab_studio_deleted_subjects_expires
  ON lab_studio_deleted_subject_keys(expires_at);
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

-- PV LAB-only durable holds on unpaid promotional generation. Trigger and backfill
-- are installed by migration 0025, not by the fresh base schema.
CREATE TABLE IF NOT EXISTS lab_promo_generation_holds (
  customer_id TEXT PRIMARY KEY REFERENCES lab_customers(id),
  reason TEXT NOT NULL CHECK(reason IN ('disposable-email')),
  created_at INTEGER NOT NULL,
  released_at INTEGER
);
CREATE INDEX IF NOT EXISTS lab_promo_generation_holds_open
  ON lab_promo_generation_holds(released_at,created_at);

-- Global trial promotion controls (migration 0029 supplies the paused row).
-- This table never contains prompts, images, or payment-provider credentials.
CREATE TABLE IF NOT EXISTS lab_trial_program_controls (
  id INTEGER PRIMARY KEY CHECK(id=1),
  welcome_enabled INTEGER NOT NULL CHECK(welcome_enabled IN (0,1)),
  free_generation_enabled INTEGER NOT NULL CHECK(free_generation_enabled IN (0,1)),
  changed_at INTEGER NOT NULL
);

-- Prompt-free generation finance retained independently of deletable jobs.
-- Only migration 0028 installs the snapshot and deletion triggers.
CREATE TABLE IF NOT EXISTS lab_generation_finance (
  job_id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES lab_customers(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_state TEXT NOT NULL,
  estimated_microusd INTEGER NOT NULL DEFAULT 0 CHECK(estimated_microusd>=0),
  settled_cost_usd REAL,
  provider TEXT,
  tool_kind TEXT,
  origin TEXT NOT NULL CHECK(origin IN ('observed','reconstructed')),
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS lab_generation_finance_date
  ON lab_generation_finance(created_at);
CREATE INDEX IF NOT EXISTS lab_generation_finance_customer
  ON lab_generation_finance(customer_id,created_at DESC);

-- Owner review access audit, customer outputs remain under their own R2 keys.
CREATE TABLE IF NOT EXISTS lab_owner_generation_review_audit (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  customer_id TEXT NOT NULL REFERENCES lab_customers(id),
  job_id TEXT,
  action TEXT NOT NULL CHECK(action IN ('gallery_opened','thumbnail_requested')),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lab_owner_generation_review_audit_date
  ON lab_owner_generation_review_audit(created_at);
CREATE INDEX IF NOT EXISTS lab_owner_generation_review_audit_customer
  ON lab_owner_generation_review_audit(customer_id,created_at DESC);
