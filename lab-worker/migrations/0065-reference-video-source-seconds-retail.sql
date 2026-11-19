-- Fixed customer retail Transform: one charge for verified source seconds.
-- Supplier 30s preauthorization remains an OWNER financial exposure, never a
-- customer debit. Legacy jobs keep their 0063 settlement/refund semantics.
-- Deploy this migration before the Worker returns retail-priced quotes.
-- PV LAB Transform / Seedance 2.5 credit-rate parity.
-- Only extends the exact Seedance model allowlist with SpicyAPI video-edit.
-- Preserves the other debit/quote guards from verified 0029, with no ledger edits.
-- Apply to LAB_DB before releasing the changed Worker price calculator.
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
      -- Customer reference-video retail: real video seconds + output seconds,
      -- NOT SpicyAPI's 30s reference preauthorization. Quote/debit match JS.
      WHEN json_extract(NEW.params,'$.type')='video'
       AND json_extract(NEW.params,'$.engine')='seedance'
       AND json_extract(NEW.params,'$.mode')='reference'
       AND json_extract(NEW.params,'$.model')='bytedance/seedance-2.5/reference-to-video'
       AND COALESCE(json_extract(NEW.params,'$.provider'),'') NOT IN ('fal','higgsfield')
       AND json_extract(NEW.params,'$.referenceFixedChargeVersion')='reference-seconds-v1'
       AND json_type(NEW.params,'$.referenceBillableVideoSeconds')='integer'
       AND json_extract(NEW.params,'$.referenceBillableVideoSeconds') BETWEEN 2 AND 30
       AND json_type(NEW.params,'$.duration')='integer'
       AND json_extract(NEW.params,'$.duration') BETWEEN 4 AND 30
      THEN MAX(7,CAST((
        NEW.estimate_microusd * 160 *
         (json_extract(NEW.params,'$.referenceBillableVideoSeconds')+json_extract(NEW.params,'$.duration'))
         + 1000000*(30+json_extract(NEW.params,'$.duration')) - 1
        ) / (1000000*(30+json_extract(NEW.params,'$.duration'))) AS INTEGER))
      -- New retail Transform: customer pays once for VERIFIED source seconds.
      -- The quoted provider maximum remains in jobs.estimate_microusd for the
      -- owner's SpicyAPI preauthorization, budget checks and cost reporting.
      WHEN json_extract(NEW.params,'$.type')='video'
       AND json_extract(NEW.params,'$.provider')='spicy'
       AND json_extract(NEW.params,'$.engine')='seedance'
       AND json_extract(NEW.params,'$.mode')='transform'
       AND json_extract(NEW.params,'$.model')='bytedance/seedance-2.5/video-edit'
       AND json_extract(NEW.params,'$.transformFixedChargeVersion')='source-seconds-v1'
       AND json_type(NEW.params,'$.transformBillableSeconds')='integer'
       AND json_extract(NEW.params,'$.transformBillableSeconds') BETWEEN 4 AND 30
      THEN MAX(7,CAST((NEW.estimate_microusd * 160 *
       json_extract(NEW.params,'$.transformBillableSeconds') + 29999999) / 30000000 AS INTEGER))
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
           AND json_extract(NEW.params,'$.model') IN ('bytedance/seedance-2.5/image-to-video','bytedance/seedance-2.5/reference-to-video','bytedance/seedance-2.5/text-to-video','bytedance/seedance-2.5/video-extend','bytedance/seedance-2.5/video-edit')
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


-- Reject malformed tagged reference-video jobs instead of falling back to the
-- vendor's entire maximum. The stored quote amount remains owner liability.
DROP TRIGGER IF EXISTS lab_reference_fixed_price_validity;
CREATE TRIGGER lab_reference_fixed_price_validity BEFORE INSERT ON jobs
WHEN NEW.state<>'draft' AND EXISTS(SELECT 1 FROM lab_customers WHERE id=NEW.owner_id)
 AND json_valid(NEW.params)
 AND json_extract(NEW.params,'$.referenceFixedChargeVersion')='reference-seconds-v1'
 AND NOT (
   json_extract(NEW.params,'$.type')='video'
   AND json_extract(NEW.params,'$.engine')='seedance'
   AND json_extract(NEW.params,'$.mode')='reference'
   AND json_extract(NEW.params,'$.model')='bytedance/seedance-2.5/reference-to-video'
   AND COALESCE(json_extract(NEW.params,'$.provider'),'') NOT IN ('fal','higgsfield')
   AND json_type(NEW.params,'$.referenceVideoIds')='array'
   AND json_array_length(NEW.params,'$.referenceVideoIds') BETWEEN 1 AND 10
   AND json_type(NEW.params,'$.referenceBillableVideoSeconds')='integer'
   AND json_extract(NEW.params,'$.referenceBillableVideoSeconds') BETWEEN 2 AND 30
   AND json_type(NEW.params,'$.duration')='integer'
   AND json_extract(NEW.params,'$.duration') BETWEEN 4 AND 30
   AND NEW.estimate_microusd BETWEEN 1 AND 20000000
 )
BEGIN
 SELECT RAISE(ABORT,'Invalid Reference video fixed retail quote; nothing submitted');
END;
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
 VALUES('0065-reference-video-source-seconds-retail',CAST(strftime('%s','now') AS INTEGER)*1000);
