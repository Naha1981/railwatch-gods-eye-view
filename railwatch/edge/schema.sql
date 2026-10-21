CREATE TABLE cases (
  workspace TEXT NOT NULL,
  id TEXT NOT NULL,
  sealed_at TEXT NOT NULL,
  body TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (workspace, id)
);
CREATE TABLE users (
  email TEXT PRIMARY KEY,
  salt TEXT NOT NULL,
  hash TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TEXT NOT NULL,
  fails INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT
);
CREATE TABLE orgs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE pending_members (
  email TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  role TEXT NOT NULL,
  added_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE stage_events (
  workspace TEXT NOT NULL,
  case_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  at TEXT NOT NULL,
  by TEXT
);
