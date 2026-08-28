-- Contact messages table for SQLite (local) and PostgreSQL (development).
-- Applied by adapters on connect / by migrate scripts in later phases.

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages (created_at);
