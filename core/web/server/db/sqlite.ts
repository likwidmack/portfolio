/**
 * SQLite MessageStore adapter for SYS_ENV=local (better-sqlite3).
 */
import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readdirSync, rmdirSync, statSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSecureId } from '../utils/secure-id';
import { nonEmpty } from './env-value';
import type { ContactMessage, CreateContactMessageInput, MessageStore } from './types';

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages (created_at);
`;

export interface SqliteStoreOptions {
  /** `file:./path` or absolute filesystem path. Defaults to `./data/local.sqlite`. */
  databaseUrl?: string;
}

/**
 * Strip trailing path separators so `.../local.sqlite/` does not make
 * `mkdirSync(dirname(...))` create a directory named `local.sqlite`.
 */
const stripTrailingSeparators = (value: string): string => value.replace(/[/\\]+$/, '');

/**
 * Resolve a `file:` DATABASE_URL (or bare path) to an absolute filesystem path.
 */
export const resolveSqlitePath = (databaseUrl = 'file:./data/local.sqlite'): string => {
  const trimmed = stripTrailingSeparators(databaseUrl.trim());
  if (!trimmed) {
    return resolve(process.cwd(), 'data/local.sqlite');
  }

  if (trimmed.startsWith('file:')) {
    // Absolute file URLs: file:///E:/db.sqlite or file:///C:/db.sqlite
    if (/^file:\/\//i.test(trimmed) || /^file:\/[A-Za-z]:/i.test(trimmed)) {
      try {
        return stripTrailingSeparators(fileURLToPath(trimmed));
      } catch {
        // Fall through to manual strip for odd relative forms like file:./data/x.sqlite
      }
    }
    const withoutScheme = stripTrailingSeparators(trimmed.slice('file:'.length));
    if (isAbsolute(withoutScheme)) {
      return withoutScheme;
    }
    return resolve(process.cwd(), withoutScheme);
  }

  if (isAbsolute(trimmed)) {
    return trimmed;
  }
  return resolve(process.cwd(), trimmed);
};

/**
 * Open a SQLite database file, creating parent dirs as needed.
 * Recovers from an empty directory mistakenly created at the DB path (SQLITE_CANTOPEN_ISDIR).
 */
export const openSqliteDatabase = (dbPath: string): Database.Database => {
  const normalized = stripTrailingSeparators(dbPath);
  mkdirSync(dirname(normalized), { recursive: true });

  if (existsSync(normalized) && statSync(normalized).isDirectory()) {
    const entries = readdirSync(normalized);
    if (entries.length > 0) {
      throw new Error(
        `SQLite database path points at a non-empty directory: ${normalized}. Use a file path such as file:./data/local.sqlite`
      );
    }
    rmdirSync(normalized);
  }

  return new Database(normalized);
};

/**
 * Create a SQLite-backed MessageStore. Ensures parent directory and schema exist.
 */
export const createSqliteMessageStore = (options: SqliteStoreOptions = {}): MessageStore => {
  const dbPath = resolveSqlitePath(
    nonEmpty(options.databaseUrl) ??
      nonEmpty(process.env.NUXT_DATABASE_URL) ??
      nonEmpty(process.env.DATABASE_URL) ??
      'file:./data/local.sqlite'
  );
  const db = openSqliteDatabase(dbPath);
  db.exec(MIGRATION_SQL);

  const listStmt = db.prepare(
    `SELECT id, name, email, body, created_at AS createdAt FROM messages ORDER BY created_at DESC`
  );
  const insertStmt = db.prepare(
    `INSERT INTO messages (id, name, email, body, created_at) VALUES (@id, @name, @email, @body, @createdAt)`
  );

  return {
    async list(): Promise<ContactMessage[]> {
      return listStmt.all() as ContactMessage[];
    },

    async create(input: CreateContactMessageInput): Promise<ContactMessage> {
      const message: ContactMessage = {
        id: createSecureId(),
        name: input.name,
        email: input.email,
        body: input.body,
        createdAt: new Date().toISOString(),
      };
      insertStmt.run(message);
      return message;
    },

    close(): void {
      db.close();
    },
  };
};
