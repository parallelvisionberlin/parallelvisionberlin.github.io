-- PV Lab commercial Soul ID launch rate. LAB_DB only, never Nina's OWNER_DB.
-- Replace only the customer job-debit trigger. Existing purchases, jobs and
-- immutable ledger entries are untouched. Owner jobs remain uncharged.
--
-- Higgsfield Soul ID: 400 PV credits, one-time per training request.
-- Soul 2 images: normal 460 credits/USD rule with a 7-credit minimum.
-- Customer Soul 2 quotes above $0.015 are rejected by the Worker BEFORE
-- a job is reserved, so an eligible 1080p image cannot exceed 7 credits.
DROP TRIGGER IF EXISTS lab_charge_job;
CREATE TRIGGER lab_charge_job AFTER INSERT ON jobs
WHEN NEW.state <> 'draft' AND NEW.estimate_microusd > 0
 AND EXISTS (SELECT 1 FROM lab_customers WHERE id = NEW.owner_id)
BEGIN
  INSERT INTO lab_credit_entries
    (id,customer_id,delta_credits,kind,reference,created_at)
  VALUES
    ('generation:' || NEW.id,NEW.owner_id,
      -CASE
        WHEN json_extract(NEW.params,'$.provider') = 'higgsfield'
         AND json_extract(NEW.params,'$.mode') = 'soul-id-training'
         AND json_extract(NEW.params,'$.model') = 'soul-id'
        THEN 400
        ELSE MAX(7,CAST((NEW.estimate_microusd * 460 + 999999) / 1000000 AS INTEGER))
       END,
      'generation','job:' || NEW.id,NEW.created_at);
END;
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES ('0008-soul-id-launch-credits',CAST(strftime('%s','now') AS INTEGER)*1000);
