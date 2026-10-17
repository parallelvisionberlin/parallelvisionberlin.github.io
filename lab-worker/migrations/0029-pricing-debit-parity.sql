-- PV LAB price/debit parity: preserve every existing customer price and round-up policy.
-- Restore the existing complete debit trigger with matching backend provider guards.
-- Existing ledger, Nina DB,
-- paid invoices, subscriptions and owner jobs stay untouched.
-- MUST apply after migrations/0028-generation-finance-ledger.sql to LAB_DB.
-- Route and engine both have to match to avoid trusting client-supplied rates.
DROP TRIGGER IF EXISTS lab_charge_job;
CREATE TRIGGER lab_charge_job AFTER INSERT ON jobs
WHEN NEW.state <> 'draft' AND NEW.estimate_microusd > 0
 AND EXISTS(SELECT 1 FROM lab_customers WHERE id=NEW.owner_id)
BEGIN
  INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at)
  VALUES('generation:'||NEW.id,NEW.owner_id,
    -CASE
      WHEN json_extract(NEW.params,'$.type')='image'
       AND json_extract(NEW.params,'$.provider')='fal'
       AND json_extract(NEW.params,'$.mode')='upscale'
       AND json_extract(NEW.params,'$.upscaleEngine')='seedvr2'
       AND json_extract(NEW.params,'$.model')='fal-ai/seedvr/upscale/image'
       AND json_type(NEW.params,'$.scale')='integer'
       AND json_extract(NEW.params,'$.scale') IN (2,4)
      THEN CASE json_extract(NEW.params,'$.scale') WHEN 2 THEN 10 ELSE 18 END
      WHEN json_extract(NEW.params,'$.type')='image'
       AND json_extract(NEW.params,'$.provider')='gemini'
       AND json_extract(NEW.params,'$.engine')='gemini21'
       AND json_extract(NEW.params,'$.model')='gemini-nano-banana-2.1'
       AND json_extract(NEW.params,'$.processing')='normal'
       AND json_extract(NEW.params,'$.resolution') IN ('1k','2k','4k')
      THEN CASE json_extract(NEW.params,'$.resolution')
        WHEN '1k' THEN 8 WHEN '2k' THEN 10 ELSE 20 END
      WHEN json_extract(NEW.params,'$.provider')='higgsfield'
       AND json_extract(NEW.params,'$.mode')='soul-id-training'
       AND json_extract(NEW.params,'$.model')='soul-id'
      THEN 400
      WHEN json_extract(NEW.params,'$.type')='image'
       AND json_extract(NEW.params,'$.provider')='spicy'
       AND json_extract(NEW.params,'$.mode')='image'
      THEN CAST((MAX(7,CAST((NEW.estimate_microusd * 460 + 999999) / 1000000 AS INTEGER)) + 4) / 5 AS INTEGER) * 5
      ELSE MAX(7,CAST((
        NEW.estimate_microusd *
        CASE
          WHEN json_extract(NEW.params,'$.type')='video'
           AND json_extract(NEW.params,'$.engine')='seedance15'
           AND json_extract(NEW.params,'$.resolution')='720p'
           AND json_type(NEW.params,'$.audio')='false'
           AND json_extract(NEW.params,'$.model') IN ('bytedance/seedance-1.5-pro/image-to-video','bytedance/seedance-1.5-pro/text-to-video')
           AND COALESCE(json_extract(NEW.params,'$.provider'),'') NOT IN ('fal','higgsfield')
          THEN 300
          WHEN json_extract(NEW.params,'$.type')='video'
           AND json_extract(NEW.params,'$.engine')='wan'
           AND json_extract(NEW.params,'$.resolution')='1080p'
           AND json_extract(NEW.params,'$.model') IN ('alibaba/wan-3.0/image-to-video','alibaba/wan-3.0/reference-to-video')
           AND COALESCE(json_extract(NEW.params,'$.provider'),'') NOT IN ('fal','higgsfield')
          THEN 388
          WHEN json_extract(NEW.params,'$.type')='video'
           AND json_extract(NEW.params,'$.engine')='seedance15'
           AND json_extract(NEW.params,'$.model') IN ('bytedance/seedance-1.5-pro/image-to-video','bytedance/seedance-1.5-pro/text-to-video')
           AND COALESCE(json_extract(NEW.params,'$.provider'),'') NOT IN ('fal','higgsfield')
          THEN 320
          WHEN json_extract(NEW.params,'$.type')='video'
           AND json_extract(NEW.params,'$.engine')='seedance'
           AND json_extract(NEW.params,'$.model') IN ('bytedance/seedance-2.5/image-to-video','bytedance/seedance-2.5/reference-to-video','bytedance/seedance-2.5/text-to-video','bytedance/seedance-2.5/video-extend')
           AND COALESCE(json_extract(NEW.params,'$.provider'),'') NOT IN ('fal','higgsfield')
          THEN 160
          WHEN json_extract(NEW.params,'$.type')='video'
           AND json_extract(NEW.params,'$.engine')='seedance4k'
           AND json_extract(NEW.params,'$.model')='bytedance/seedance-2.5-spicy/image-to-video'
           AND COALESCE(json_extract(NEW.params,'$.provider'),'') NOT IN ('fal','higgsfield')
          THEN 190
          ELSE 460
        END + 999999
      ) / 1000000 AS INTEGER))
    END,
  'generation','job:'||NEW.id,NEW.created_at);
END;
-- Fail closed if a stored, server-calculated customer quote and the atomic
-- database debit ever disagree. No payment, reservation or provider call occurs.
-- Fields not present on older/direct jobs retain the existing debit logic.
DROP TRIGGER IF EXISTS lab_assert_generation_quote_cost;
CREATE TRIGGER lab_assert_generation_quote_cost AFTER INSERT ON lab_credit_entries
WHEN NEW.kind='generation' AND NEW.reference LIKE 'job:%'
BEGIN
  SELECT RAISE(ABORT,'PV Lab quote and debit disagree; review a fresh price')
  WHERE EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id=substr(NEW.reference,5)
      AND json_type(j.params,'$.customerChargeCredits') IS NOT NULL
      AND (json_type(j.params,'$.customerChargeCredits')<>'integer'
        OR json_extract(j.params,'$.customerChargeCredits')<>-NEW.delta_credits)
  );
END;

-- Never allow a billable customer image/video job with a zero-dollar estimate
-- to bypass the customer debit trigger's positive-estimate condition. Owner
-- workflows, non-billable drafts and historical jobs are unaffected.
DROP TRIGGER IF EXISTS lab_prevent_zero_cost_customer_job;
CREATE TRIGGER lab_prevent_zero_cost_customer_job BEFORE INSERT ON jobs
WHEN NEW.state<>'draft' AND NEW.estimate_microusd=0
 AND EXISTS(SELECT 1 FROM lab_customers WHERE id=NEW.owner_id)
 AND json_extract(NEW.params,'$.type') IN ('image','video')
BEGIN
  SELECT RAISE(ABORT,'PV Lab cannot submit an unpriced customer generation');
END;

INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0029-pricing-debit-parity',CAST(strftime('%s','now') AS INTEGER)*1000);
