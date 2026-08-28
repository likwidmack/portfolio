// @vitest-environment node

import { assertAdminToken, parseBearerToken, secureCompare } from '@tgmc/web-layer-admin/server/utils/admin-auth';
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
