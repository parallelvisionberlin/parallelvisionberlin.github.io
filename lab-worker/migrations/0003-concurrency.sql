-- Apply only to the Lab database. Existing records, keys, assets and spend are unchanged.
-- The old Worker retains its single-job guard until the new Worker is deployed.
DROP INDEX IF EXISTS one_active_job_per_owner;
CREATE INDEX IF NOT EXISTS jobs_owner_active ON jobs(owner_id,state);
INSERT OR IGNORE INTO lab_migrations(id,applied_at)
VALUES('0003-concurrency',CAST(strftime('%s','now') AS INTEGER)*1000);
