// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import type { ContactMessage, MessageStore } from '../../db/types';
import { parseCreateContactMessageBody } from './parse-body';
import { createContactMessageFromBody, listContactMessages } from './service';
import { messageStoreOptionsFromRuntimeConfig } from './store-options';

describe('parseCreateContactMessageBody', () => {
  it('accepts valid bodies and trims fields', () => {
    expect(
      parseCreateContactMessageBody({
        name: '  Ada  ',
        email: ' ada@example.com ',
        body: ' Hello ',
      })
    ).toEqual({
      ok: true,
      value: { name: 'Ada', email: 'ada@example.com', body: 'Hello' },
    });
  });

  it('rejects null, arrays, and missing/blank fields', () => {
    const cases = [
      null,
      undefined,
      [],
      {},
      { name: 'Ada', email: 'a@b.c' },
      { name: '', email: 'a@b.c', body: 'x' },
      { name: 'Ada', email: '   ', body: 'x' },
      { name: 'Ada', email: 'a@b.c', body: '' },
      { name: 1, email: 'a@b.c', body: 'x' },
    ];

    for (const body of cases) {
      const result = parseCreateContactMessageBody(body);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toMatch(/name, email, and body/);
      }
    }
  });

  it('rejects invalid emails and oversized fields', () => {
    expect(parseCreateContactMessageBody({ name: 'Ada', email: 'not-an-email', body: 'Hi' }).ok).toBe(false);
    expect(parseCreateContactMessageBody({ name: 'A'.repeat(101), email: 'ada@example.com', body: 'Hi' }).ok).toBe(
      false
    );
    expect(parseCreateContactMessageBody({ name: 'Ada', email: 'ada@example.com', body: 'x'.repeat(5001) }).ok).toBe(
      false
    );
  });

  it('normalizes email to lowercase', () => {
    expect(
      parseCreateContactMessageBody({
        name: 'Ada',
        email: 'Ada@Example.COM',
        body: 'Hello',
      })
    ).toEqual({
      ok: true,
      value: { name: 'Ada', email: 'ada@example.com', body: 'Hello' },
    });
  });
});

describe('message create rate limit', () => {
  it('allows a burst then blocks until reset', async () => {
    const { allowMessageCreate, resetMessageRateLimitForTests } = await import('./rate-limit');
    resetMessageRateLimitForTests();
    const event = { node: { req: { socket: { remoteAddress: '203.0.113.10' } } } };
    for (let i = 0; i < 5; i += 1) {
      expect(allowMessageCreate(event)).toBe(true);
    }
    expect(allowMessageCreate(event)).toBe(false);
  });

  it('prunes expired buckets once the map grows large', async () => {
    const { allowMessageCreate, resetMessageRateLimitForTests } = await import('./rate-limit');
    resetMessageRateLimitForTests();
    const t0 = Date.UTC(2026, 7, 5, 12, 0, 0);
    for (let i = 0; i < 10_000; i += 1) {
      expect(allowMessageCreate({ node: { req: { socket: { remoteAddress: `203.0.113.${i}` } } } }, t0)).toBe(true);
    }
    // After the soft cap, a new window should prune expired keys (all past resetAt).
    const later = t0 + 60 * 60 * 1000 + 1;
    expect(allowMessageCreate({ node: { req: { socket: { remoteAddress: '198.51.100.99' } } } }, later)).toBe(true);
  });
});

describe('messageStoreOptionsFromRuntimeConfig', () => {
  it('maps runtime config fields and falls back for sysEnv', () => {
    expect(
      messageStoreOptionsFromRuntimeConfig(
        {
          public: { sysEnv: 'test' },
          databaseUrl: 'postgres://db',
          dynamoTable: 'Messages',
          awsRegion: 'us-west-2',
        },
        'local'
      )
    ).toEqual({
      sysEnv: 'test',
      databaseUrl: 'postgres://db',
      dynamoTable: 'Messages',
      awsRegion: 'us-west-2',
    });

    expect(messageStoreOptionsFromRuntimeConfig({}, 'development')).toEqual({
      sysEnv: 'development',
      databaseUrl: undefined,
      dynamoTable: undefined,
      awsRegion: undefined,
    });
  });

  it('treats empty baked runtimeConfig strings as unset', () => {
    expect(
      messageStoreOptionsFromRuntimeConfig(
        {
          public: { sysEnv: '' },
          databaseUrl: '',
          dynamoTable: '   ',
          awsRegion: '',
        },
        'test'
      )
    ).toEqual({
      sysEnv: 'test',
      databaseUrl: undefined,
      dynamoTable: undefined,
      awsRegion: undefined,
    });
  });
});

describe('messages service', () => {
  const sample: ContactMessage = {
    id: '1',
    name: 'Ada',
    email: 'ada@example.com',
    body: 'Hi',
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  it('lists via the store', async () => {
    const store: MessageStore = {
      list: vi.fn(async () => [sample]),
      create: vi.fn(),
    };

    await expect(listContactMessages(store)).resolves.toEqual([sample]);
    expect(store.list).toHaveBeenCalledOnce();
  });

  it('creates on valid body and surfaces validation failures without calling create', async () => {
    const store: MessageStore = {
      list: vi.fn(),
      create: vi.fn(async (input) => ({
        ...sample,
        ...input,
        id: 'new',
        createdAt: sample.createdAt,
      })),
    };

    const created = await createContactMessageFromBody(store, {
      name: 'Ada',
      email: 'ada@example.com',
      body: 'Hi',
    });
    expect(created).toEqual({
      ok: true,
      value: {
        id: 'new',
        name: 'Ada',
        email: 'ada@example.com',
        body: 'Hi',
        createdAt: sample.createdAt,
      },
    });
    expect(store.create).toHaveBeenCalledOnce();

    const invalid = await createContactMessageFromBody(store, { name: 'Ada' });
    expect(invalid.ok).toBe(false);
    expect(store.create).toHaveBeenCalledOnce();
  });

  it('propagates store errors on create', async () => {
    const store: MessageStore = {
      list: vi.fn(),
      create: vi.fn(async () => {
        throw new Error('store down');
      }),
    };

    await expect(
      createContactMessageFromBody(store, {
        name: 'Ada',
        email: 'ada@example.com',
        body: 'Hi',
      })
    ).rejects.toThrow(/store down/);
  });
});
