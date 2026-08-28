/**
 * Canonical SYS_ENV normalization shared by Nuxt config and store factories.
 * Keep this module free of `@tgmc/utilities` so `nuxt.config` can import it during
 * postinstall (`nuxt prepare`) before workspace libs are built.
 */
export type SysEnv = 'local' | 'development' | 'test' | 'production';

/**
 * Normalize SYS_ENV. Legacy `remote` maps to `development`.
 */
export const normalizeSysEnv = (value: string | undefined): SysEnv => {
  switch (value) {
    case 'remote':
    case 'development':
      return 'development';
    case 'test':
      return 'test';
    case 'production':
      return 'production';
    case 'local':
      return 'local';
    case undefined:
    case '':
      return 'local';
    default:
      return 'local';
  }
};

/**
 * Store adapter env. Prefer `E2E_STORE_SYS_ENV` so CI Full regression can keep
 * `SYS_ENV=test` (public chip / runtime identity) while using SQLite without Docker/Dynamo.
 */
export const resolveStoreSysEnv = (env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): SysEnv =>
  normalizeSysEnv(env.E2E_STORE_SYS_ENV || env.SYS_ENV);
