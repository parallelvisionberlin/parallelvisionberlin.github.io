-- One-time PV LAB-only Seedance 2.5 Transform final-cost credit release.
-- A SpicyAPI quote reserves a bounded 30-second maximum; the final cost may be
-- smaller. Never alter the pre-authorization, provider quote or original debit.
-- Keep an exact-model metadata receipt, independent of removable creative media.
CREATE TABLE IF NOT EXISTS lab_transform_credit_holds (
  job_id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  max_microusd INTEGER NOT NULL CHECK(max_microusd>0),
  recorded_at INTEGER NOT NULL
);
-- Only the exact SpicyAPI Seedance 2.5 Video Edit route qualifies. History and
-- other providers, Create/Extend, and legacy ledger entries are not rewritten.
INSERT OR IGNORE INTO lab_transform_credit_holds(job_id,customer_id,max_microusd,recorded_at)
SELECT j.id,j.owner_id,j.estimate_microusd,j.created_at
FROM jobs j JOIN lab_customers c ON c.id=j.owner_id
WHERE j.estimate_microusd>0 AND json_valid(j.params)
 AND json_extract(j.params,'$.type')='video'
 AND json_extract(j.params,'$.provider')='spicy'
 AND json_extract(j.params,'$.engine')='seedance'
 AND json_extract(j.params,'$.mode')='transform'
 AND json_extract(j.params,'$.transformType')='replace-character'
 AND json_extract(j.params,'$.model')='bytedance/seedance-2.5/video-edit';
CREATE TRIGGER IF NOT EXISTS lab_track_transform_credit_hold
AFTER INSERT ON jobs
WHEN NEW.estimate_microusd>0 AND json_valid(NEW.params)
 AND json_extract(NEW.params,'$.type')='video'
 AND json_extract(NEW.params,'$.provider')='spicy'
 AND json_extract(NEW.params,'$.engine')='seedance'
 AND json_extract(NEW.params,'$.mode')='transform'
 AND json_extract(NEW.params,'$.transformType')='replace-character'
 AND json_extract(NEW.params,'$.model')='bytedance/seedance-2.5/video-edit'
 AND EXISTS(SELECT 1 FROM lab_customers WHERE id=NEW.owner_id)
BEGIN
 INSERT OR IGNORE INTO lab_transform_credit_holds(job_id,customer_id,max_microusd,recorded_at)
 VALUES(NEW.id,NEW.owner_id,NEW.estimate_microusd,NEW.created_at);
END;

-- Authoritative final settlement, not a forecast. Only a completed job with
-- a positive original credit debit and no whole-job failure refund qualifies.
-- Cap release by the original job's reserved max. Integer micros + ceiling
-- exactly match the established 160-credits/USD Seedance 2.5 billing rule.
-- No prompts, photographs, video URLs or personal payment data are persisted.
CREATE VIEW IF NOT EXISTS lab_transform_credit_release_due AS
SELECT f.job_id,f.customer_id,
 -debit.delta_credits
 - MAX(7,CAST((CAST(ROUND(f.settled_cost_usd*1000000.0) AS INTEGER)*160+999999)/1000000 AS INTEGER)) AS credits_to_release
FROM lab_generation_finance f
JOIN lab_transform_credit_holds h ON h.job_id=f.job_id AND h.customer_id=f.customer_id
JOIN lab_credit_entries debit ON debit.customer_id=f.customer_id
 AND debit.reference='job:'||f.job_id AND debit.kind='generation'
WHERE f.last_state='completed' AND f.provider='spicy'
 AND f.settled_cost_usd IS NOT NULL
 AND typeof(f.settled_cost_usd) IN ('integer','real')
 AND f.settled_cost_usd>=0
 AND CAST(ROUND(f.settled_cost_usd*1000000.0) AS INTEGER)>=0
 AND CAST(ROUND(f.settled_cost_usd*1000000.0) AS INTEGER)<=h.max_microusd
 AND NOT EXISTS(SELECT 1 FROM lab_credit_entries reversed
    WHERE reversed.customer_id=f.customer_id
    AND reversed.kind='refund' AND reversed.reference='refund:job:'||f.job_id)
 -- Explicit guard is required: finance uses INSERT OR REPLACE and SQLite can
 -- propagate the outer conflict policy into this triggered INSERT OR IGNORE.
 -- Never replace a previously credited release (which would credit twice).
 AND NOT EXISTS(SELECT 1 FROM lab_credit_entries earlier
    WHERE earlier.customer_id=f.customer_id
    AND (earlier.id='transform-credit-release:'||f.job_id
      OR earlier.reference='settled:transform:job:'||f.job_id))
 AND (-debit.delta_credits)>MAX(7,CAST((CAST(ROUND(f.settled_cost_usd*1000000.0) AS INTEGER)*160+999999)/1000000 AS INTEGER));

-- Finance snapshots are written by existing DB triggers when a job settles
-- before or after completion. They also survive deletion of video/media.
-- Two triggers cover INSERT OR REPLACE and late final-cost UPDATE; UNIQUE
-- reference guarantees release only once even with repeated provider reads.
CREATE TRIGGER IF NOT EXISTS lab_transform_credit_release_insert
AFTER INSERT ON lab_generation_finance
WHEN NEW.last_state='completed' AND NEW.settled_cost_usd IS NOT NULL
BEGIN
 INSERT OR IGNORE INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at)
 SELECT 'transform-credit-release:'||job_id,customer_id,credits_to_release,'adjustment',
        'settled:transform:job:'||job_id,CAST(strftime('%s','now') AS INTEGER)*1000
 FROM lab_transform_credit_release_due WHERE job_id=NEW.job_id AND customer_id=NEW.customer_id;
END;
CREATE TRIGGER IF NOT EXISTS lab_transform_credit_release_update
AFTER UPDATE OF settled_cost_usd,last_state ON lab_generation_finance
WHEN NEW.last_state='completed' AND NEW.settled_cost_usd IS NOT NULL
BEGIN
 INSERT OR IGNORE INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at)
 SELECT 'transform-credit-release:'||job_id,customer_id,credits_to_release,'adjustment',
        'settled:transform:job:'||job_id,CAST(strftime('%s','now') AS INTEGER)*1000
 FROM lab_transform_credit_release_due WHERE job_id=NEW.job_id AND customer_id=NEW.customer_id;
END;
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0063-transform-final-cost-credit-release',CAST(strftime('%s','now') AS INTEGER)*1000);
