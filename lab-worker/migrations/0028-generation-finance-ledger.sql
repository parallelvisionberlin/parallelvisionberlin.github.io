-- PV LAB-only cost intelligence. Does not retain creative prompts, uploads,
-- input/output assets, source URLs, provider payloads, full IPs or media keys.
-- Unique job key prevents a deleted job from counting twice.
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

-- One-time, limited historical recovery after the October 17, 2026 purge.
-- Existing spend reservations survived removal of jobs, quotes and image data.
-- The seven held October 16 accounts were independently confirmed as having
-- 53 completed jobs plus ten refunded failed reservations before this migration.
-- Never assume that another orphan reservation with no refund completed.
INSERT OR IGNORE INTO lab_generation_finance
  (job_id,customer_id,created_at,updated_at,last_state,
   estimated_microusd,settled_cost_usd,provider,tool_kind,origin,deleted_at)
SELECT s.job_id,s.owner_id,s.created_at,s.created_at,
  CASE
    WHEN EXISTS(SELECT 1 FROM lab_credit_entries e
      WHERE e.customer_id=s.owner_id AND e.kind='refund'
        AND e.reference='refund:job:'||s.job_id) THEN 'failed'
    WHEN h.customer_id IS NOT NULL AND h.reason='disposable-email'
      AND s.created_at>=1792108800000 AND s.created_at<1792195200000
      THEN 'reconstructed_completed'
    ELSE 'unknown'
  END,
  s.estimate_microusd,NULL,NULL,NULL,'reconstructed',
  CAST(strftime('%s','now') AS INTEGER)*1000
FROM spend s
JOIN lab_customers c ON c.id=s.owner_id
LEFT JOIN jobs j ON j.id=s.job_id
LEFT JOIN lab_promo_generation_holds h ON h.customer_id=s.owner_id
WHERE j.id IS NULL;

-- Existing live jobs: observe their actual last state and settled provider cost
-- before any future deletion. Never store the JSON params or quoted payload.
INSERT OR IGNORE INTO lab_generation_finance
  (job_id,customer_id,created_at,updated_at,last_state,
   estimated_microusd,settled_cost_usd,provider,tool_kind,origin,deleted_at)
SELECT j.id,j.owner_id,j.created_at,j.updated_at,j.state,
  j.estimate_microusd,j.settled_cost,
  CASE WHEN json_valid(j.params) THEN
    CASE WHEN json_extract(j.params,'$.provider')
      IN ('spicy','fal','gemini','higgsfield','fashn','krea') THEN
      json_extract(j.params,'$.provider') ELSE NULL END
    ELSE NULL END,
  CASE WHEN json_valid(j.params) THEN
    CASE WHEN json_extract(j.params,'$.mode')='upscale' THEN 'upscale'
      WHEN json_extract(j.params,'$.type') IN ('image','video')
        THEN json_extract(j.params,'$.type') ELSE NULL END
    ELSE NULL END,
  'observed',NULL
FROM jobs j JOIN lab_customers c ON c.id=j.owner_id;

-- Idempotent finance snapshots are maintained by the database, not frontend
-- calls. Deleting the creative job preserves only these administrative fields.
CREATE TRIGGER IF NOT EXISTS lab_finance_job_insert
AFTER INSERT ON jobs
WHEN EXISTS(SELECT 1 FROM lab_customers c WHERE c.id=NEW.owner_id)
BEGIN
  INSERT OR REPLACE INTO lab_generation_finance
    (job_id,customer_id,created_at,updated_at,last_state,
     estimated_microusd,settled_cost_usd,provider,tool_kind,origin,deleted_at)
  VALUES(NEW.id,NEW.owner_id,NEW.created_at,NEW.updated_at,NEW.state,
    NEW.estimate_microusd,NEW.settled_cost,
    CASE WHEN json_valid(NEW.params) THEN
      CASE WHEN json_extract(NEW.params,'$.provider')
        IN ('spicy','fal','gemini','higgsfield','fashn','krea')
        THEN json_extract(NEW.params,'$.provider') ELSE NULL END
      ELSE NULL END,
    CASE WHEN json_valid(NEW.params) THEN
      CASE WHEN json_extract(NEW.params,'$.mode')='upscale' THEN 'upscale'
        WHEN json_extract(NEW.params,'$.type') IN ('image','video')
          THEN json_extract(NEW.params,'$.type') ELSE NULL END
      ELSE NULL END,
    'observed',NULL);
END;
CREATE TRIGGER IF NOT EXISTS lab_finance_job_update
AFTER UPDATE OF state,settled_cost,estimate_microusd ON jobs
WHEN EXISTS(SELECT 1 FROM lab_customers c WHERE c.id=NEW.owner_id)
BEGIN
  INSERT OR REPLACE INTO lab_generation_finance
    (job_id,customer_id,created_at,updated_at,last_state,
     estimated_microusd,settled_cost_usd,provider,tool_kind,origin,deleted_at)
  VALUES(NEW.id,NEW.owner_id,NEW.created_at,NEW.updated_at,NEW.state,
    NEW.estimate_microusd,NEW.settled_cost,
    CASE WHEN json_valid(NEW.params) THEN
      CASE WHEN json_extract(NEW.params,'$.provider')
        IN ('spicy','fal','gemini','higgsfield','fashn','krea')
        THEN json_extract(NEW.params,'$.provider') ELSE NULL END
      ELSE NULL END,
    CASE WHEN json_valid(NEW.params) THEN
      CASE WHEN json_extract(NEW.params,'$.mode')='upscale' THEN 'upscale'
        WHEN json_extract(NEW.params,'$.type') IN ('image','video')
          THEN json_extract(NEW.params,'$.type') ELSE NULL END
      ELSE NULL END,
    'observed',NULL);
END;
CREATE TRIGGER IF NOT EXISTS lab_finance_job_delete
AFTER DELETE ON jobs
WHEN EXISTS(SELECT 1 FROM lab_customers c WHERE c.id=OLD.owner_id)
BEGIN
  INSERT OR IGNORE INTO lab_generation_finance
    (job_id,customer_id,created_at,updated_at,last_state,
     estimated_microusd,settled_cost_usd,provider,tool_kind,origin,deleted_at)
  VALUES(OLD.id,OLD.owner_id,OLD.created_at,OLD.updated_at,OLD.state,
    OLD.estimate_microusd,OLD.settled_cost,
    CASE WHEN json_valid(OLD.params) THEN
      CASE WHEN json_extract(OLD.params,'$.provider')
        IN ('spicy','fal','gemini','higgsfield','fashn','krea')
        THEN json_extract(OLD.params,'$.provider') ELSE NULL END
      ELSE NULL END,
    CASE WHEN json_valid(OLD.params) THEN
      CASE WHEN json_extract(OLD.params,'$.mode')='upscale' THEN 'upscale'
        WHEN json_extract(OLD.params,'$.type') IN ('image','video')
          THEN json_extract(OLD.params,'$.type') ELSE NULL END
      ELSE NULL END,
    'observed',NULL);
  UPDATE lab_generation_finance
  SET deleted_at=COALESCE(deleted_at,CAST(strftime('%s','now') AS INTEGER)*1000)
  WHERE job_id=OLD.id;
END;

INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0028-generation-finance-ledger',CAST(strftime('%s','now') AS INTEGER)*1000);
