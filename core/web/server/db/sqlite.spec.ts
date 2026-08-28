// @vitest-environment node

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createSqliteMessageStore, resolveSqlitePath } from './sqlite';

describe('resolveSqlitePath', () => {
  it('strips file: scheme and resolves relative paths', () => {
    const resolved = resolveSqlitePath('file:./data/local.sqlite');
    expect(resolved).toContain('data');
    expect(resolved).toContain('local.sqlite');
    expect(resolved.startsWith('file:')).toBe(false);
  });

  it('keeps absolute paths', () => {
    const abs = join(tmpdir(), 'abs.sqlite');
    expect(resolveSqlitePath(`file:${abs}`)).toBe(abs);
    expect(resolveSqlitePath(`file:${abs}/`)).toBe(abs);
  });

  it('accepts bare relative paths without file: scheme', () => {
    const resolved = resolveSqlitePath('./data/bare.sqlite');
    expect(resolved).toContain('data');
    expect(resolved).toContain('bare.sqlite');
    expect(resolved.startsWith('file:')).toBe(false);
  });

  it('strips trailing separators so dirname does not treat the db file as a folder', () => {
    const resolved = resolveSqlitePath('file:./data/local.sqlite/');
    expect(resolved.endsWith('local.sqlite')).toBe(true);
    expect(resolved.endsWith('local.sqlite/') || resolved.endsWith('local.sqlite\\')).toBe(false);
  });
});

describe('createSqliteMessageStore', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('migrates, creates, and lists messages', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sqlite-store-'));
    tempDirs.push(dir);
    const store = createSqliteMessageStore({
      databaseUrl: `file:${join(dir, 'messages.sqlite')}`,
    });

    await store.create({ name: 'Tamara', email: 't@example.com', body: 'Hi' });
    await store.create({ name: 'Mack', email: 'm@example.com', body: 'Hey' });

    const listed = await store.list();
    expect(listed).toHaveLength(2);
    expect(listed.every((m) => m.id && m.createdAt)).toBe(true);

    const deleted = await store.delete(listed[0].id);
    expect(deleted).toBe(true);
    expect(await store.list()).toHaveLength(1);
    expect(await store.delete('missing-id')).toBe(false);

    store.close?.();
  });
});
