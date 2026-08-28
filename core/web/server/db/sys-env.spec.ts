import { describe, expect, it } from 'vitest';
import { normalizeSysEnv, resolveStoreSysEnv } from './sys-env';

describe('normalizeSysEnv', () => {
  it('maps legacy remote to development', () => {
    expect(normalizeSysEnv('remote')).toBe('development');
  });

  it('defaults empty/undefined to local', () => {
    expect(normalizeSysEnv(undefined)).toBe('local');
    expect(normalizeSysEnv('')).toBe('local');
  });

  it('passes through known envs', () => {
    expect(normalizeSysEnv('test')).toBe('test');
    expect(normalizeSysEnv('production')).toBe('production');
    expect(normalizeSysEnv('development')).toBe('development');
    expect(normalizeSysEnv('local')).toBe('local');
  });
});

describe('resolveStoreSysEnv', () => {
  it('prefers E2E_STORE_SYS_ENV over SYS_ENV', () => {
    expect(resolveStoreSysEnv({ SYS_ENV: 'test', E2E_STORE_SYS_ENV: 'local' })).toBe('local');
    expect(resolveStoreSysEnv({ SYS_ENV: 'test' })).toBe('test');
  });
});
