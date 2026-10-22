/**
 * MessageStore factory — selects SQLite / Postgres / DynamoDB from `DATA_BACKEND` (default per SYS_ENV).
 */
import { resolveStoreBackend } from './data-backend';
import { createDynamoMessageStore } from './dynamodb';
import { nonEmpty } from './env-value';
import { createPostgresMessageStore } from './postgres';
import { createSqliteMessageStore } from './sqlite';
import type { MessageStore } from './types';

export { resolveStoreBackend } from './data-backend';
export type { DataBackend } from './data-backend';
export { createDynamoMessageStore } from './dynamodb';
export { nonEmpty } from './env-value';
export { createPostgresMessageStore } from './postgres';
export { createSqliteMessageStore, openSqliteDatabase, resolveSqlitePath } from './sqlite';
export { normalizeSysEnv, resolveStoreSysEnv } from './sys-env';
export type { SysEnv } from './sys-env';
export type { ContactMessage, CreateContactMessageInput, MessageStore } from './types';

export interface CreateMessageStoreOptions {
  /** SYS_ENV used only to pick the default backend. */
  sysEnv?: string;
  /** `sqlite` | `postgres` | `dynamodb`; overrides `DATA_BACKEND` and the SYS_ENV default. */
  dataBackend?: string;
  databaseUrl?: string;
  dynamoTable?: string;
  awsRegion?: string;
}

const createSqliteStore = (options: CreateMessageStoreOptions): MessageStore =>
  createSqliteMessageStore({
    databaseUrl: nonEmpty(options.databaseUrl) ?? process.env.NUXT_DATABASE_URL ?? process.env.DATABASE_URL,
  });

const createPostgresStore = (options: CreateMessageStoreOptions): MessageStore =>
  createPostgresMessageStore({
    databaseUrl: nonEmpty(options.databaseUrl) ?? process.env.NUXT_DATABASE_URL ?? process.env.DATABASE_URL,
  });

const createDynamoStore = (options: CreateMessageStoreOptions): MessageStore =>
  createDynamoMessageStore({
    tableName: nonEmpty(options.dynamoTable) ?? process.env.NUXT_DYNAMO_TABLE ?? process.env.DYNAMO_TABLE,
    region: nonEmpty(options.awsRegion) ?? process.env.NUXT_AWS_REGION ?? process.env.AWS_REGION,
  });

/**
 * Create the MessageStore for the resolved data backend (`DATA_BACKEND`, else the SYS_ENV default).
 */
export const createMessageStore = (options: CreateMessageStoreOptions = {}): MessageStore => {
  const backend = resolveStoreBackend(options);
  switch (backend) {
    case 'sqlite':
      return createSqliteStore(options);
    case 'postgres':
      return createPostgresStore(options);
    case 'dynamodb':
      return createDynamoStore(options);
    default: {
      const unreachable: never = backend;
      throw new Error(`Unsupported data backend: ${String(unreachable)}`);
    }
  }
};

let singleton: MessageStore | undefined;

/**
 * Process-wide MessageStore (lazy). Prefer `createMessageStore` in tests.
 */
export const getMessageStore = (options?: CreateMessageStoreOptions): MessageStore => {
  if (!singleton) {
    singleton = createMessageStore(options);
  }
  return singleton;
};

/** Reset the singleton (Vitest / hot reload). */
export const resetMessageStore = async (): Promise<void> => {
  if (singleton?.close) {
    await singleton.close();
  }
  singleton = undefined;
};
