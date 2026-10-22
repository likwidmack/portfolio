/**
 * BlogPostStore factory — selects SQLite / Postgres / DynamoDB from `DATA_BACKEND` (default per SYS_ENV).
 */
import { createDynamoBlogPostStore } from './blog-dynamodb';
import { createPostgresBlogPostStore } from './blog-postgres';
import { createSqliteBlogPostStore } from './blog-sqlite';
import type { BlogPostStore } from './blog-types';
import { resolveStoreBackend } from './data-backend';
import { nonEmpty } from './env-value';

export { createDynamoBlogPostStore } from './blog-dynamodb';
export { createPostgresBlogPostStore } from './blog-postgres';
export { createSqliteBlogPostStore } from './blog-sqlite';
export { BlogPostSlugConflictError } from './blog-types';
export type { BlogPost, BlogPostStatus, BlogPostStore, CreateBlogPostInput, UpdateBlogPostInput } from './blog-types';

export interface CreateBlogPostStoreOptions {
  /** SYS_ENV used only to pick the default backend. */
  sysEnv?: string;
  /** `sqlite` | `postgres` | `dynamodb`; overrides `DATA_BACKEND` and the SYS_ENV default. */
  dataBackend?: string;
  databaseUrl?: string;
  dynamoPostsTable?: string;
  awsRegion?: string;
}

const createSqliteStore = (options: CreateBlogPostStoreOptions): BlogPostStore =>
  createSqliteBlogPostStore({
    databaseUrl: nonEmpty(options.databaseUrl) ?? process.env.NUXT_DATABASE_URL ?? process.env.DATABASE_URL,
  });

const createPostgresStore = (options: CreateBlogPostStoreOptions): BlogPostStore =>
  createPostgresBlogPostStore({
    databaseUrl: nonEmpty(options.databaseUrl) ?? process.env.NUXT_DATABASE_URL ?? process.env.DATABASE_URL,
  });

const createDynamoStore = (options: CreateBlogPostStoreOptions): BlogPostStore =>
  createDynamoBlogPostStore({
    tableName:
      nonEmpty(options.dynamoPostsTable) ?? process.env.NUXT_DYNAMO_POSTS_TABLE ?? process.env.DYNAMO_POSTS_TABLE,
    region: nonEmpty(options.awsRegion) ?? process.env.NUXT_AWS_REGION ?? process.env.AWS_REGION,
  });

/**
 * Create the BlogPostStore for the resolved data backend (`DATA_BACKEND`, else the SYS_ENV default).
 */
export const createBlogPostStore = (options: CreateBlogPostStoreOptions = {}): BlogPostStore => {
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

let singleton: BlogPostStore | undefined;

/**
 * Process-wide BlogPostStore (lazy). Prefer `createBlogPostStore` in tests.
 */
export const getBlogPostStore = (options?: CreateBlogPostStoreOptions): BlogPostStore => {
  if (!singleton) {
    singleton = createBlogPostStore(options);
  }
  return singleton;
};

/** Reset the singleton (Vitest / hot reload). */
export const resetBlogPostStore = async (): Promise<void> => {
  if (singleton?.close) {
    await singleton.close();
  }
  singleton = undefined;
};
