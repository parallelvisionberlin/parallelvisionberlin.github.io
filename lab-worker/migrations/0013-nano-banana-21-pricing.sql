-- PV LAB exact-model Nano Banana 2.1 prices plus existing video tiers. Existing ledger, Nina DB,
-- paid invoices, subscriptions and owner jobs stay untouched.
-- MUST apply after migrations/0008-soul-id-launch-credits.sql to LAB_DB.
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
      ELSE MAX(7,CAST((
        NEW.estimate_microusd *
        CASE
          WHEN json_extract(NEW.params,'$.type')='video'
           AND json_extract(NEW.params,'$.engine')='seedance15'
           AND json_extract(NEW.params,'$.model') IN ('bytedance/seedance-1.5-pro/image-to-video','bytedance/seedance-1.5-pro/text-to-video')
          THEN 320
          WHEN json_extract(NEW.params,'$.type')='video'
           AND json_extract(NEW.params,'$.engine')='seedance'
           AND json_extract(NEW.params,'$.model') IN ('bytedance/seedance-2.5/image-to-video','bytedance/seedance-2.5/reference-to-video','bytedance/seedance-2.5/text-to-video','bytedance/seedance-2.5/video-extend')
           AND COALESCE(json_extract(NEW.params,'$.provider'),'')<>'higgsfield'
          THEN 230
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
VALUES('0013-nano-banana-21-pricing',CAST(strftime('%s','now') AS INTEGER)*1000);
