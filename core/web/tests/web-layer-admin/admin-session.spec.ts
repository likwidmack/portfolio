import {
  ADMIN_SESSION_KEY,
  defaultAdminSession,
  loadAdminSession,
  parseAdminSession,
  persistAdminSession,
  type AdminSession,
} from '@tgmc/web-layer-admin/app/utils/admin-session';
import { describe, expect, it } from 'vitest';

function memoryStorage(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  const storage = {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  } as unknown as Storage;
  return { storage, map };
}

describe('admin session', () => {
  it('parses a valid session and falls back per field', () => {
    expect(parseAdminSession('{"v":1,"token":" abc ","database":"postgres"}')).toEqual({
      token: 'abc',
      database: 'postgres',
    });
    expect(parseAdminSession('{"v":1,"token":"abc","database":"oracle"}')).toEqual({
      token: 'abc',
      database: 'sqlite',
    });
    expect(parseAdminSession('{"v":2,"token":"abc"}')).toEqual(defaultAdminSession());
    expect(parseAdminSession('nope')).toEqual(defaultAdminSession());
    expect(parseAdminSession(null)).toEqual(defaultAdminSession());
  });

  it('converts the old portfolio.* keys once and removes them', () => {
    const { storage, map } = memoryStorage({ 'portfolio.adminToken': 'secret', 'portfolio.adminDatabase': 'dynamodb' });
    expect(loadAdminSession(storage)).toEqual({ token: 'secret', database: 'dynamodb' });
    expect(map.has('portfolio.adminToken')).toBe(false);
    expect(map.has('portfolio.adminDatabase')).toBe(false);
    expect(JSON.parse(map.get(ADMIN_SESSION_KEY)!)).toEqual({ v: 1, token: 'secret', database: 'dynamodb' });
  });

  it('keeps an existing session over leftover old keys', () => {
    const { storage, map } = memoryStorage({
      [ADMIN_SESSION_KEY]: '{"v":1,"token":"new","database":"postgres"}',
      'portfolio.adminToken': 'old',
    });
    expect(loadAdminSession(storage)).toEqual({ token: 'new', database: 'postgres' });
    expect(map.has('portfolio.adminToken')).toBe(false);
  });

  it('normalises the legacy database and falls back to sqlite', () => {
    expect(loadAdminSession(memoryStorage({ 'portfolio.adminDatabase': ' DynamoDB ' }).storage)).toEqual({
      token: '',
      database: 'dynamodb',
    });
    expect(
      loadAdminSession(memoryStorage({ 'portfolio.adminToken': 't', 'portfolio.adminDatabase': 'oracle' }).storage)
    ).toEqual({ token: 't', database: 'sqlite' });
  });

  it('converts a lone legacy token key', () => {
    const { storage, map } = memoryStorage({ 'portfolio.adminToken': ' secret ' });
    expect(loadAdminSession(storage)).toEqual({ token: 'secret', database: 'sqlite' });
    expect(JSON.parse(map.get(ADMIN_SESSION_KEY)!)).toEqual({ v: 1, token: 'secret', database: 'sqlite' });
    expect(map.has('portfolio.adminToken')).toBe(false);
  });

  it('writes nothing for a lone default legacy database key and removes both legacy keys', () => {
    const { storage, map } = memoryStorage({ 'portfolio.adminDatabase': 'sqlite' });
    expect(loadAdminSession(storage)).toEqual(defaultAdminSession());
    expect(map.size).toBe(0);
  });

  it('keeps a lone non-default legacy database key without a token', () => {
    const { storage, map } = memoryStorage({ 'portfolio.adminDatabase': 'postgres' });
    expect(loadAdminSession(storage)).toEqual({ token: '', database: 'postgres' });
    expect(JSON.parse(map.get(ADMIN_SESSION_KEY)!)).toEqual({ v: 1, token: '', database: 'postgres' });
    expect(map.has('portfolio.adminDatabase')).toBe(false);
  });

  it.each(['nope', '{"v":2,"token":"x"}'])(
    'drops leftover legacy keys when a stored session %s is unreadable',
    (stored) => {
      const { storage, map } = memoryStorage({
        [ADMIN_SESSION_KEY]: stored,
        'portfolio.adminToken': 'old',
        'portfolio.adminDatabase': 'postgres',
      });
      expect(loadAdminSession(storage)).toEqual(defaultAdminSession());
      expect(map.get(ADMIN_SESSION_KEY)).toBe(stored);
      expect(map.has('portfolio.adminToken')).toBe(false);
      expect(map.has('portfolio.adminDatabase')).toBe(false);
    }
  );

  it('returns the same session on a second load', () => {
    const { storage } = memoryStorage({ 'portfolio.adminToken': 'secret', 'portfolio.adminDatabase': 'postgres' });
    const first = loadAdminSession(storage);
    expect(loadAdminSession(storage)).toEqual(first);
  });

  it('stores exactly { v, token, database } with the token trimmed', () => {
    const { storage, map } = memoryStorage();
    const session = { token: '  abc  ', database: 'postgres', extra: 'no' } as unknown as AdminSession;
    persistAdminSession(storage, session);
    expect(JSON.parse(map.get(ADMIN_SESSION_KEY)!)).toEqual({ v: 1, token: 'abc', database: 'postgres' });
  });

  it('removes the key for a whitespace-only token on the default database', () => {
    const { storage, map } = memoryStorage({ [ADMIN_SESSION_KEY]: '{"v":1,"token":"x","database":"sqlite"}' });
    persistAdminSession(storage, { token: '   ', database: 'sqlite' });
    expect(map.has(ADMIN_SESSION_KEY)).toBe(false);
  });

  it('removes the key for an empty default session', () => {
    const { storage, map } = memoryStorage({ [ADMIN_SESSION_KEY]: '{"v":1,"token":"x","database":"sqlite"}' });
    persistAdminSession(storage, defaultAdminSession());
    expect(map.has(ADMIN_SESSION_KEY)).toBe(false);
  });
});
