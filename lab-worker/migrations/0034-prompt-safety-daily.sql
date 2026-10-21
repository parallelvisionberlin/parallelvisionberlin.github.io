-- PV LAB: no prompts, faces or generated media are stored for this text-safety quota.
-- Atomically cap daily Workers AI requests before invoking the model.
CREATE TABLE IF NOT EXISTS lab_prompt_safety_daily (
  day TEXT PRIMARY KEY,
  checks INTEGER NOT NULL DEFAULT 0 CHECK(checks>=0)
);
