/**
 * Map Nuxt runtimeConfig (+ process fallbacks) to BlogPostStore factory options.
 */
import type { CreateBlogPostStoreOptions } from '../../db/blog-store';
import { nonEmpty } from '../../db/env-value';

export interface PostsRuntimeConfig {
  public?: { sysEnv?: string };
  databaseUrl?: string;
  dynamoPostsTable?: string;
  awsRegion?: string;
  adminToken?: string;
}

/**
 * Build CreateBlogPostStoreOptions from Nitro runtime config.
 * Empty baked-in runtimeConfig strings become undefined so factories can fall
 * through to process.env (Docker DATABASE_URL, Lambda AWS_REGION, etc.).
 */
export const blogPostStoreOptionsFromRuntimeConfig = (
  config: PostsRuntimeConfig,
  fallbackSysEnv: string | undefined = process.env.SYS_ENV
): CreateBlogPostStoreOptions => ({
  sysEnv: nonEmpty(config.public?.sysEnv) ?? fallbackSysEnv,
  databaseUrl: nonEmpty(config.databaseUrl),
  dynamoPostsTable: nonEmpty(config.dynamoPostsTable),
  awsRegion: nonEmpty(config.awsRegion),
});
