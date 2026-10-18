CREATE TABLE IF NOT EXISTS cases (
  workspace TEXT NOT NULL,
  id TEXT NOT NULL,
  sealed_at TEXT NOT NULL,
  body TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (workspace, id)
);

CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  salt TEXT NOT NULL,
  hash TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TEXT NOT NULL,
  fails INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT
);
