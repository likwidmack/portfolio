/**
 * MessageStore factory — selects SQLite / Postgres / DynamoDB from SYS_ENV.
 */
import { createDynamoMessageStore } from './dynamodb';
import { nonEmpty } from './env-value';
import { createPostgresMessageStore } from './postgres';
import { createSqliteMessageStore } from './sqlite';
import { normalizeSysEnv, resolveStoreSysEnv, type SysEnv } from './sys-env';
import type { MessageStore } from './types';

export { createDynamoMessageStore } from './dynamodb';
export { nonEmpty } from './env-value';
export { createPostgresMessageStore } from './postgres';
export { createSqliteMessageStore, openSqliteDatabase, resolveSqlitePath } from './sqlite';
export { normalizeSysEnv, resolveStoreSysEnv } from './sys-env';
export type { SysEnv } from './sys-env';
export type { ContactMessage, CreateContactMessageInput, MessageStore } from './types';

export interface CreateMessageStoreOptions {
  sysEnv?: string;
  databaseUrl?: string;
  dynamoTable?: string;
  awsRegion?: string;
}

const createLocalMessageStore = (options: CreateMessageStoreOptions): MessageStore =>
  createSqliteMessageStore({
    databaseUrl: nonEmpty(options.databaseUrl) ?? process.env.NUXT_DATABASE_URL ?? process.env.DATABASE_URL,
  });

const createDevelopmentMessageStore = (options: CreateMessageStoreOptions): MessageStore =>
  createPostgresMessageStore({
    databaseUrl: nonEmpty(options.databaseUrl) ?? process.env.NUXT_DATABASE_URL ?? process.env.DATABASE_URL,
  });

const createDynamoMessageStoreForEnvironment = (options: CreateMessageStoreOptions): MessageStore =>
  createDynamoMessageStore({
    tableName: nonEmpty(options.dynamoTable) ?? process.env.NUXT_DYNAMO_TABLE ?? process.env.DYNAMO_TABLE,
    region: nonEmpty(options.awsRegion) ?? process.env.NUXT_AWS_REGION ?? process.env.AWS_REGION,
  });

const messageStoreCreators: Record<SysEnv, typeof createLocalMessageStore> = {
  local: createLocalMessageStore,
  development: createDevelopmentMessageStore,
  test: createDynamoMessageStoreForEnvironment,
  production: createDynamoMessageStoreForEnvironment,
};

/**
 * Create the MessageStore for the given (or process) SYS_ENV.
 */
export const createMessageStore = (options: CreateMessageStoreOptions = {}): MessageStore => {
  const sysEnv = options.sysEnv !== undefined ? normalizeSysEnv(options.sysEnv) : resolveStoreSysEnv();
  return messageStoreCreators[sysEnv](options);
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
