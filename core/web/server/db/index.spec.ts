// @vitest-environment node

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createMessageStore, getMessageStore, normalizeSysEnv, resetMessageStore } from './index';

describe('normalizeSysEnv', () => {
  it('maps canonical values and remote alias', () => {
    expect(normalizeSysEnv('local')).toBe('local');
    expect(normalizeSysEnv('development')).toBe('development');
    expect(normalizeSysEnv('remote')).toBe('development');
    expect(normalizeSysEnv('test')).toBe('test');
    expect(normalizeSysEnv('production')).toBe('production');
    expect(normalizeSysEnv(undefined)).toBe('local');
    expect(normalizeSysEnv('')).toBe('local');
    expect(normalizeSysEnv('unknown')).toBe('local');
  });
});

describe('createMessageStore factory', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await resetMessageStore();
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('selects sqlite for local and supports create/list', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'msg-store-'));
    tempDirs.push(dir);
    const dbPath = join(dir, 'local.sqlite');

    const store = createMessageStore({
      sysEnv: 'local',
      databaseUrl: `file:${dbPath}`,
    });

    const created = await store.create({
      name: 'Ada',
      email: 'ada@example.com',
      body: 'Hello',
    });
    expect(created.id).toBeTruthy();
    expect(created.createdAt).toBeTruthy();

    const listed = await store.list();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      name: 'Ada',
      email: 'ada@example.com',
      body: 'Hello',
    });

    await store.close?.();
  });

  it('selects postgres for development and remote (requires DATABASE_URL)', () => {
    const previous = process.env.DATABASE_URL;
    const previousNuxt = process.env.NUXT_DATABASE_URL;
    Reflect.deleteProperty(process.env, 'DATABASE_URL');
    Reflect.deleteProperty(process.env, 'NUXT_DATABASE_URL');

    try {
      expect(() =>
        createMessageStore({
          sysEnv: 'development',
          databaseUrl: '',
        })
      ).toThrow(/DATABASE_URL/);

      expect(() =>
        createMessageStore({
          sysEnv: 'remote',
          databaseUrl: '',
        })
      ).toThrow(/DATABASE_URL/);
    } finally {
      if (previous === undefined) {
        Reflect.deleteProperty(process.env, 'DATABASE_URL');
      } else {
        process.env.DATABASE_URL = previous;
      }
      if (previousNuxt === undefined) {
        Reflect.deleteProperty(process.env, 'NUXT_DATABASE_URL');
      } else {
        process.env.NUXT_DATABASE_URL = previousNuxt;
      }
    }
  });

  it('falls through empty databaseUrl to process.env for development', () => {
    const previous = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgres://portfolio:portfolio@localhost:5432/portfolio';

    try {
      // Pool construction succeeds; we only assert adapter selection does not throw on empty options.
      const store = createMessageStore({
        sysEnv: 'development',
        databaseUrl: '',
      });
      expect(store).toBeTruthy();
      void store.close?.();
    } finally {
      if (previous === undefined) {
        Reflect.deleteProperty(process.env, 'DATABASE_URL');
      } else {
        process.env.DATABASE_URL = previous;
      }
    }
  });

  it('selects dynamodb for test and production (requires DYNAMO_TABLE)', () => {
    const previous = process.env.DYNAMO_TABLE;
    const previousNuxt = process.env.NUXT_DYNAMO_TABLE;
    Reflect.deleteProperty(process.env, 'DYNAMO_TABLE');
    Reflect.deleteProperty(process.env, 'NUXT_DYNAMO_TABLE');

    try {
      expect(() => createMessageStore({ sysEnv: 'test', dynamoTable: '' })).toThrow(/DYNAMO_TABLE/);
      expect(() => createMessageStore({ sysEnv: 'production', dynamoTable: '' })).toThrow(/DYNAMO_TABLE/);
    } finally {
      if (previous === undefined) {
        Reflect.deleteProperty(process.env, 'DYNAMO_TABLE');
      } else {
        process.env.DYNAMO_TABLE = previous;
      }
      if (previousNuxt === undefined) {
        Reflect.deleteProperty(process.env, 'NUXT_DYNAMO_TABLE');
      } else {
        process.env.NUXT_DYNAMO_TABLE = previousNuxt;
      }
    }
  });

  it('reuses getMessageStore singleton until reset', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'msg-store-'));
    tempDirs.push(dir);
    const databaseUrl = `file:${join(dir, 'singleton.sqlite')}`;

    const first = getMessageStore({ sysEnv: 'local', databaseUrl });
    const second = getMessageStore({ sysEnv: 'local', databaseUrl });
    expect(second).toBe(first);

    await resetMessageStore();
    const third = getMessageStore({ sysEnv: 'local', databaseUrl });
    expect(third).not.toBe(first);
    await third.close?.();
  });
});
