/**
 * Map Nuxt runtimeConfig (+ process fallbacks) to MessageStore factory options.
 */
import type { CreateMessageStoreOptions } from '../../db';
import { nonEmpty } from '../../db/env-value';

export interface MessagesRuntimeConfig {
  public?: { sysEnv?: string };
  databaseUrl?: string;
  dynamoTable?: string;
  awsRegion?: string;
}

/**
 * Build CreateMessageStoreOptions from Nitro runtime config.
 * Empty baked-in runtimeConfig strings become undefined so factories can fall
 * through to process.env (Docker DATABASE_URL, Lambda AWS_REGION, etc.).
 */
export const messageStoreOptionsFromRuntimeConfig = (
  config: MessagesRuntimeConfig,
  fallbackSysEnv: string | undefined = process.env.SYS_ENV
): CreateMessageStoreOptions => ({
  sysEnv: nonEmpty(config.public?.sysEnv) ?? fallbackSysEnv,
  databaseUrl: nonEmpty(config.databaseUrl),
  dynamoTable: nonEmpty(config.dynamoTable),
  awsRegion: nonEmpty(config.awsRegion),
});
