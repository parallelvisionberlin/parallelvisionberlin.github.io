-- Transform / SpicyAPI per-source-second billing. Retain the provider's full quoted
-- maximum for admission, release ONLY the unused PV customer credits after a
-- verified successful final provider settlement. Owner jobs are never charged.
-- Claims contain no prompt, user media, token, original video or reference URLs.
CREATE TABLE IF NOT EXISTS lab_transform_credit_holds(
 job_id TEXT PRIMARY KEY,
 customer_id TEXT NOT NULL,
 credits_held INTEGER NOT NULL CHECK(credits_held>=7),
 created_at INTEGER NOT NULL
);
-- Capture on the atomic customer debit, not on jobs INSERT: SQLite does not
-- guarantee ordering between two AFTER INSERT triggers on the same jobs table.
DROP TRIGGER IF EXISTS lab_capture_transform_credit_hold;
CREATE TRIGGER lab_capture_transform_credit_hold AFTER INSERT ON lab_credit_entries
WHEN NEW.kind='generation' AND NEW.delta_credits<0
BEGIN
 INSERT OR IGNORE INTO lab_transform_credit_holds(job_id,customer_id,credits_held,created_at)
 SELECT j.id,NEW.customer_id,-NEW.delta_credits,NEW.created_at
 FROM jobs j
 WHERE j.id=substr(NEW.reference,5) AND NEW.reference='job:'||j.id
   AND j.owner_id=NEW.customer_id
   AND json_valid(j.params)
   AND json_extract(j.params,'$.type')='video'
   AND json_extract(j.params,'$.provider')='spicy'
   AND json_extract(j.params,'$.engine')='seedance'
   AND json_extract(j.params,'$.mode')='transform'
   AND json_extract(j.params,'$.model')='bytedance/seedance-2.5/video-edit';
END;
-- Preserve eligible unsettled claims even if source/result media or History
-- are deleted before the provider publishes its final charge.
INSERT OR IGNORE INTO lab_transform_credit_holds(job_id,customer_id,credits_held,created_at)
 SELECT j.id,e.customer_id,-e.delta_credits,e.created_at
 FROM jobs j JOIN lab_credit_entries e ON e.reference='job:'||j.id AND e.kind='generation'
 WHERE j.owner_id=e.customer_id AND json_valid(j.params)
 AND json_extract(j.params,'$.type')='video'
 AND json_extract(j.params,'$.provider')='spicy'
 AND json_extract(j.params,'$.engine')='seedance'
 AND json_extract(j.params,'$.mode')='transform'
 AND json_extract(j.params,'$.model')='bytedance/seedance-2.5/video-edit';

-- lab_generation_finance persists after history deletion and changes only on
-- real provider cost readback. INSERT OR REPLACE is used by existing job state
-- snapshots, so both INSERT and UPDATE cases must be covered.
DROP TRIGGER IF EXISTS lab_refund_transform_finance_insert;
CREATE TRIGGER lab_refund_transform_finance_insert AFTER INSERT ON lab_generation_finance
WHEN NEW.last_state='completed' AND NEW.settled_cost_usd IS NOT NULL
 AND NEW.settled_cost_usd>=0 AND NEW.settled_cost_usd<=NEW.estimated_microusd/1000000.0
 AND NEW.origin='observed'
BEGIN
 INSERT OR IGNORE INTO lab_credit_entries
   (id,customer_id,delta_credits,kind,reference,created_at)
  SELECT 'settlement:'||NEW.job_id,h.customer_id,
    h.credits_held-MAX(7,CAST((CAST(ROUND(NEW.settled_cost_usd*1000000) AS INTEGER)*160+999999)/1000000 AS INTEGER)),'refund','settlement:job:'||NEW.job_id,
    CAST(strftime('%s','now') AS INTEGER)*1000
  FROM lab_transform_credit_holds h
  WHERE h.job_id=NEW.job_id AND h.customer_id=NEW.customer_id
    AND h.credits_held>MAX(7,CAST((CAST(ROUND(NEW.settled_cost_usd*1000000) AS INTEGER)*160+999999)/1000000 AS INTEGER))
    AND NOT EXISTS(SELECT 1 FROM lab_credit_entries e
      WHERE e.reference='refund:job:'||NEW.job_id);
END;
DROP TRIGGER IF EXISTS lab_refund_transform_finance_update;
CREATE TRIGGER lab_refund_transform_finance_update
AFTER UPDATE OF settled_cost_usd,last_state ON lab_generation_finance
WHEN NEW.last_state='completed' AND NEW.settled_cost_usd IS NOT NULL
 AND NEW.settled_cost_usd>=0 AND NEW.settled_cost_usd<=NEW.estimated_microusd/1000000.0
 AND NEW.origin='observed'
BEGIN
 INSERT OR IGNORE INTO lab_credit_entries
   (id,customer_id,delta_credits,kind,reference,created_at)
  SELECT 'settlement:'||NEW.job_id,h.customer_id,
    h.credits_held-MAX(7,CAST((CAST(ROUND(NEW.settled_cost_usd*1000000) AS INTEGER)*160+999999)/1000000 AS INTEGER)),'refund','settlement:job:'||NEW.job_id,
    CAST(strftime('%s','now') AS INTEGER)*1000
  FROM lab_transform_credit_holds h
  WHERE h.job_id=NEW.job_id AND h.customer_id=NEW.customer_id
    AND h.credits_held>MAX(7,CAST((CAST(ROUND(NEW.settled_cost_usd*1000000) AS INTEGER)*160+999999)/1000000 AS INTEGER))
    AND NOT EXISTS(SELECT 1 FROM lab_credit_entries e
      WHERE e.reference='refund:job:'||NEW.job_id);
END;

-- A rare late failed-state transition must not return the entire original
-- debit on top of a partial settlement return. All other models keep their
-- pre-existing full-failure refund policy and idempotent reference.
DROP TRIGGER IF EXISTS lab_refund_failed_job;
CREATE TRIGGER lab_refund_failed_job AFTER UPDATE OF state ON jobs
WHEN NEW.state='failed' AND OLD.state<>'failed'
 AND EXISTS(SELECT 1 FROM lab_credit_entries
   WHERE reference='job:'||NEW.id AND kind='generation')
BEGIN
 INSERT OR IGNORE INTO lab_credit_entries
 (id,customer_id,delta_credits,kind,reference,created_at)
 SELECT 'refund:'||NEW.id,charge.customer_id,
   -charge.delta_credits-COALESCE((
     SELECT SUM(part.delta_credits) FROM lab_credit_entries part
     WHERE part.reference='settlement:job:'||NEW.id
   ),0),
   'refund','refund:job:'||NEW.id,
   CAST(strftime('%s','now') AS INTEGER)*1000
 FROM lab_credit_entries charge
 WHERE charge.reference='job:'||NEW.id AND charge.kind='generation'
 AND -charge.delta_credits>COALESCE((
   SELECT SUM(part.delta_credits) FROM lab_credit_entries part
   WHERE part.reference='settlement:job:'||NEW.id
 ),0);
END;
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
 VALUES('0063-transform-final-credit-settlement',CAST(strftime('%s','now') AS INTEGER)*1000);
