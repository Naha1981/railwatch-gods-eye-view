CREATE TABLE IF NOT EXISTS cases (
  workspace TEXT NOT NULL,
  id TEXT NOT NULL,
  sealed_at TEXT NOT NULL,
  body TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (workspace, id)
);
