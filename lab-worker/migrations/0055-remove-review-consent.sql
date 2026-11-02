-- Remove the unrequested optional generation-review consent feature.
-- Metadata-only owner activity and the separate, limited fraud-review log remain intact.
DROP TABLE IF EXISTS lab_customer_generation_review_consent;
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0055-remove-review-consent',CAST(strftime('%s','now') AS INTEGER)*1000);
