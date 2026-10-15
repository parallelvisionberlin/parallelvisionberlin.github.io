-- PV LAB image retail price steps on top of the existing video model rates.
-- Only SpicyAPI image generation rounds UP in 5-credit steps; historic ledgers unchanged.
-- Existing ledger, Nina DB,
-- paid invoices, subscriptions and owner jobs stay untouched.
-- MUST apply after migrations/0020-wan-seedance-budget-pricing.sql to LAB_DB.
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
          THEN 320
          WHEN json_extract(NEW.params,'$.type')='video'
           AND json_extract(NEW.params,'$.engine')='seedance'
           AND json_extract(NEW.params,'$.model') IN ('bytedance/seedance-2.5/image-to-video','bytedance/seedance-2.5/reference-to-video','bytedance/seedance-2.5/text-to-video','bytedance/seedance-2.5/video-extend')
           AND COALESCE(json_extract(NEW.params,'$.provider'),'')<>'higgsfield'
          THEN 160
          WHEN json_extract(NEW.params,'$.type')='video'
           AND json_extract(NEW.params,'$.engine')='seedance4k'
           AND json_extract(NEW.params,'$.model')='bytedance/seedance-2.5-spicy/image-to-video'
          THEN 190
          ELSE 460
        END + 999999
      ) / 1000000 AS INTEGER))
    END,
  'generation','job:'||NEW.id,NEW.created_at);
END;
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0021-spicy-image-credit-steps',CAST(strftime('%s','now') AS INTEGER)*1000);
