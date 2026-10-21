CREATE TABLE IF NOT EXISTS stage_events (
  workspace TEXT NOT NULL,
  case_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  at TEXT NOT NULL,
  by TEXT
);
CREATE INDEX IF NOT EXISTS stage_events_ws ON stage_events (workspace, case_id);
