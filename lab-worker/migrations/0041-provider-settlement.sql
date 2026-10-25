-- Independent of creative jobs: deleting media must not lose a pending bill.
CREATE TABLE IF NOT EXISTS lab_provider_settlements (
 job_id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, provider_task_id TEXT NOT NULL,
 next_check_at INTEGER NOT NULL DEFAULT 0, attempts INTEGER NOT NULL DEFAULT 0,
 settled_cost_usd REAL CHECK(settled_cost_usd>=0), settled_at INTEGER
);
CREATE INDEX IF NOT EXISTS lab_provider_settlements_due ON lab_provider_settlements(next_check_at) WHERE settled_cost_usd IS NULL;
INSERT OR IGNORE INTO lab_provider_settlements(job_id,owner_id,provider_task_id)
 SELECT id,owner_id,provider_id FROM jobs WHERE state IN ('completed','failed') AND provider_id IS NOT NULL AND settled_cost IS NULL
 AND json_valid(params) AND COALESCE(json_extract(params,'$.provider'),'spicy')='spicy';
CREATE TRIGGER IF NOT EXISTS lab_capture_pending_settlement
AFTER UPDATE OF state,provider_id,settled_cost ON jobs
WHEN NEW.state IN ('completed','failed') AND NEW.provider_id IS NOT NULL AND NEW.settled_cost IS NULL
 AND json_valid(NEW.params) AND COALESCE(json_extract(NEW.params,'$.provider'),'spicy')='spicy'
BEGIN
 INSERT OR IGNORE INTO lab_provider_settlements(job_id,owner_id,provider_task_id) VALUES(NEW.id,NEW.owner_id,NEW.provider_id);
END;
INSERT OR IGNORE INTO lab_migrations(id,applied_at) VALUES('0041-provider-settlement',CAST(strftime('%s','now') AS INTEGER)*1000);
