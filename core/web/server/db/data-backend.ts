/**
 * Which backend the MessageStore / BlogPostStore factories build.
 *
 * `DATA_BACKEND` (sqlite | postgres | dynamodb) overrides the default for the SYS_ENV; the
 * resolver itself lives in `@tgmc/utilities` so the media layer shares one definition.
 */
import { resolveDataBackend, type DataBackend } from '@tgmc/utilities';
import { nonEmpty } from './env-value';
import { normalizeSysEnv, resolveStoreSysEnv } from './sys-env';

export type { DataBackend };

export interface StoreBackendOptions {
  /** SYS_ENV for the default backend; falls back to `E2E_STORE_SYS_ENV` / `SYS_ENV`. */
  sysEnv?: string;
  /** Overrides `DATA_BACKEND`. Blank means unset (Nuxt bakes empty defaults into runtimeConfig). */
  dataBackend?: string;
}

export const resolveStoreBackend = (options: StoreBackendOptions = {}): DataBackend =>
  resolveDataBackend({
    SYS_ENV: options.sysEnv !== undefined ? normalizeSysEnv(options.sysEnv) : resolveStoreSysEnv(),
    DATA_BACKEND: nonEmpty(options.dataBackend) ?? process.env.DATA_BACKEND,
  });
