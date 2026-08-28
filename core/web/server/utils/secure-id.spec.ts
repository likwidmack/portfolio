// @vitest-environment node

import { describe, expect, it } from 'vitest';

import { createSecureId } from './secure-id';

describe('createSecureId', () => {
  it('creates unique RFC 4122 version 4 identifiers without crypto.randomUUID', () => {
    const ids = new Set(Array.from({ length: 32 }, () => createSecureId()));

    expect(ids.size).toBe(32);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  });
});
