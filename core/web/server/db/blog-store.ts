/**
 * BlogPostStore factory — selects SQLite / Postgres / DynamoDB from SYS_ENV.
 */
import { createDynamoBlogPostStore } from './blog-dynamodb';
import { createPostgresBlogPostStore } from './blog-postgres';
import { createSqliteBlogPostStore } from './blog-sqlite';
import type { BlogPostStore } from './blog-types';
import { nonEmpty } from './env-value';
import { normalizeSysEnv, resolveStoreSysEnv, type SysEnv } from './sys-env';

export { createDynamoBlogPostStore } from './blog-dynamodb';
export { createPostgresBlogPostStore } from './blog-postgres';
export { createSqliteBlogPostStore } from './blog-sqlite';
export { BlogPostSlugConflictError } from './blog-types';
export type { BlogPost, BlogPostStatus, BlogPostStore, CreateBlogPostInput, UpdateBlogPostInput } from './blog-types';

export interface CreateBlogPostStoreOptions {
  sysEnv?: string;
  databaseUrl?: string;
  dynamoPostsTable?: string;
  awsRegion?: string;
}

const createLocalBlogPostStore = (options: CreateBlogPostStoreOptions): BlogPostStore =>
  createSqliteBlogPostStore({
    databaseUrl: nonEmpty(options.databaseUrl) ?? process.env.NUXT_DATABASE_URL ?? process.env.DATABASE_URL,
  });

const createDevelopmentBlogPostStore = (options: CreateBlogPostStoreOptions): BlogPostStore =>
  createPostgresBlogPostStore({
    databaseUrl: nonEmpty(options.databaseUrl) ?? process.env.NUXT_DATABASE_URL ?? process.env.DATABASE_URL,
  });

const createDynamoBlogPostStoreForEnvironment = (options: CreateBlogPostStoreOptions): BlogPostStore =>
  createDynamoBlogPostStore({
    tableName:
      nonEmpty(options.dynamoPostsTable) ?? process.env.NUXT_DYNAMO_POSTS_TABLE ?? process.env.DYNAMO_POSTS_TABLE,
    region: nonEmpty(options.awsRegion) ?? process.env.NUXT_AWS_REGION ?? process.env.AWS_REGION,
  });

const blogPostStoreCreators: Record<SysEnv, typeof createLocalBlogPostStore> = {
  local: createLocalBlogPostStore,
  development: createDevelopmentBlogPostStore,
  test: createDynamoBlogPostStoreForEnvironment,
  production: createDynamoBlogPostStoreForEnvironment,
};

/**
 * Create the BlogPostStore for the given (or process) SYS_ENV.
 */
export const createBlogPostStore = (options: CreateBlogPostStoreOptions = {}): BlogPostStore => {
  const sysEnv = options.sysEnv !== undefined ? normalizeSysEnv(options.sysEnv) : resolveStoreSysEnv();
  return blogPostStoreCreators[sysEnv](options);
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

export type { SysEnv };
