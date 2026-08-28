/**
 * PostgreSQL MessageStore adapter for SYS_ENV=development (pg pool).
 */
import { Pool, type Pool as PgPool } from 'pg';
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

export interface PostgresStoreOptions {
  databaseUrl?: string;
  /** Optional injected pool for tests. */
  pool?: PgPool;
}

/**
 * Create a Postgres-backed MessageStore. Runs the messages migration on first use.
 */
export const createPostgresMessageStore = (options: PostgresStoreOptions = {}): MessageStore => {
  const connectionString =
    nonEmpty(options.databaseUrl) ??
    nonEmpty(process.env.NUXT_DATABASE_URL) ??
    nonEmpty(process.env.DATABASE_URL) ??
    '';

  if (!options.pool && !connectionString) {
    throw new Error('Postgres MessageStore requires DATABASE_URL (or an injected pool)');
  }

  const pool = options.pool ?? new Pool({ connectionString });
  let migrated = false;

  const ensureSchema = async (): Promise<void> => {
    if (migrated) {
      return;
    }
    await pool.query(MIGRATION_SQL);
    migrated = true;
  };

  return {
    async list(): Promise<ContactMessage[]> {
      await ensureSchema();
      const result = await pool.query<{
        id: string;
        name: string;
        email: string;
        body: string;
        created_at: string;
      }>(`SELECT id, name, email, body, created_at FROM messages ORDER BY created_at DESC`);

      return result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        body: row.body,
        createdAt: row.created_at,
      }));
    },

    async create(input: CreateContactMessageInput): Promise<ContactMessage> {
      await ensureSchema();
      const message: ContactMessage = {
        id: createSecureId(),
        name: input.name,
        email: input.email,
        body: input.body,
        createdAt: new Date().toISOString(),
      };

      await pool.query(`INSERT INTO messages (id, name, email, body, created_at) VALUES ($1, $2, $3, $4, $5)`, [
        message.id,
        message.name,
        message.email,
        message.body,
        message.createdAt,
      ]);

      return message;
    },

    async close(): Promise<void> {
      await pool.end();
    },
  };
};
