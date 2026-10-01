// @vitest-environment node

import {
  assertAdminToken,
  parseBearerToken,
  resolveAdminToken,
  secureCompare,
} from '@tgmc/web-layer-admin/server/utils/admin-auth';
import { describe, expect, it } from 'vitest';

describe('secureCompare', () => {
  it('returns true for equal strings and false otherwise', () => {
    expect(secureCompare('secret', 'secret')).toBe(true);
    expect(secureCompare('secret', 'Secret')).toBe(false);
    expect(secureCompare('short', 'longer')).toBe(false);
  });
});

describe('parseBearerToken', () => {
  it('extracts Bearer tokens and rejects other schemes', () => {
    expect(parseBearerToken('Bearer abc123')).toBe('abc123');
    expect(parseBearerToken('bearer abc123')).toBe('abc123');
    expect(parseBearerToken('Basic abc123')).toBeNull();
    expect(parseBearerToken(undefined)).toBeNull();
  });
});

describe('resolveAdminToken', () => {
  it('prefers process.env over baked runtime config', () => {
    const previous = process.env.ADMIN_TOKEN;
    const previousNuxt = process.env.NUXT_ADMIN_TOKEN;
    delete process.env.NUXT_ADMIN_TOKEN;
    process.env.ADMIN_TOKEN = 'from-env';
    expect(resolveAdminToken('from-config')).toBe('from-env');
    if (previous == null) {
      delete process.env.ADMIN_TOKEN;
    } else {
      process.env.ADMIN_TOKEN = previous;
    }
    if (previousNuxt == null) {
      delete process.env.NUXT_ADMIN_TOKEN;
    } else {
      process.env.NUXT_ADMIN_TOKEN = previousNuxt;
    }
  });

  it('prefers NUXT_ADMIN_TOKEN over ADMIN_TOKEN', () => {
    const previous = process.env.ADMIN_TOKEN;
    const previousNuxt = process.env.NUXT_ADMIN_TOKEN;
    process.env.ADMIN_TOKEN = 'from-admin';
    process.env.NUXT_ADMIN_TOKEN = 'from-nuxt';
    expect(resolveAdminToken('from-config')).toBe('from-nuxt');
    if (previous == null) {
      delete process.env.ADMIN_TOKEN;
    } else {
      process.env.ADMIN_TOKEN = previous;
    }
    if (previousNuxt == null) {
      delete process.env.NUXT_ADMIN_TOKEN;
    } else {
      process.env.NUXT_ADMIN_TOKEN = previousNuxt;
    }
  });
});

describe('assertAdminToken', () => {
  it('fails closed when configured token is empty', () => {
    expect(assertAdminToken('', 'Bearer anything')).toEqual({
      ok: false,
      statusCode: 401,
      statusMessage: 'Admin writes are disabled (ADMIN_TOKEN not configured)',
    });
    expect(assertAdminToken(undefined, 'Bearer anything').ok).toBe(false);
  });

  it('rejects missing or wrong bearer tokens', () => {
    expect(assertAdminToken('secret', undefined).ok).toBe(false);
    expect(assertAdminToken('secret', 'Bearer nope').ok).toBe(false);
  });

  it('accepts a matching bearer token', () => {
    expect(assertAdminToken('secret', 'Bearer secret')).toEqual({ ok: true });
  });
});
