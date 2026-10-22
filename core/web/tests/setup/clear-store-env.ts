/**
 * Vitest setup: tests must not depend on the store-selection variables of the shell that runs them.
 * A developer or CI job exporting `DATA_BACKEND` or `E2E_STORE_SYS_ENV` (the regression job does) would
 * otherwise flip the "default backend" and store-options tests. Each test starts without them and gets
 * them back afterwards; tests that need a value stub it themselves.
 */
import { afterEach, beforeEach } from 'vitest';

const STORE_ENV_KEYS = ['DATA_BACKEND', 'E2E_STORE_SYS_ENV'] as const;

const saved = new Map<string, string | undefined>();

beforeEach(() => {
  for (const key of STORE_ENV_KEYS) {
    saved.set(key, process.env[key]);
    Reflect.deleteProperty(process.env, key);
  }
});

afterEach(() => {
  for (const [key, value] of saved) {
    if (value === undefined) {
      Reflect.deleteProperty(process.env, key);
    } else {
      process.env[key] = value;
    }
  }
  saved.clear();
});
