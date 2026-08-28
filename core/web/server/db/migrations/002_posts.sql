-- Blog posts table for SQLite (local) and PostgreSQL (development).
-- Applied by adapters on connect / by migrate scripts.

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
);

CREATE INDEX IF NOT EXISTS posts_status_published_at_idx ON posts (status, published_at);
CREATE INDEX IF NOT EXISTS posts_slug_idx ON posts (slug);
