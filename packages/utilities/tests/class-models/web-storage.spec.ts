// @vitest-environment jsdom

import WebStorage from '../../src/lib/class-models/web-storage.js';

async function flushWebStoragePersistence(): Promise<void> {
  await vi.runAllTimersAsync();
  await Promise.resolve();
  await Promise.resolve();
}

describe('WebStorage', () => {
  const defaultPrefix = 'likwidmack:web';
  const defaultKey = (key: string) => `${defaultPrefix}.${key}`;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=', 1)[0]?.trim();
      if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('returns its name and null for unknown keys', () => {
    const storage = new WebStorage('app');

    expect(storage.name).toBe('app');
    expect(storage.get('missing')).toBeNull();
  });

  it('stores new values using the default prefix', async () => {
    const storage = new WebStorage('app');

    storage.set('theme', 'dark');

    expect(storage.get('theme')).toBe('dark');
    await flushWebStoragePersistence();
    expect(localStorage.getItem(defaultKey('theme'))).toBe(JSON.stringify('dark'));
  });

  it('uses the configured prefix for storage keys', async () => {
    const storage = new WebStorage('app', { prefix: 'portfolio' });

    storage.set('theme', 'dark');
    await flushWebStoragePersistence();

    expect(localStorage.getItem('portfolio.theme')).toBe(JSON.stringify('dark'));
    expect(localStorage.getItem(defaultKey('theme'))).toBeNull();
  });

  it('keeps the latest queued value', async () => {
    const storage = new WebStorage('app');

    storage.set('counter', 1);
    storage.set('counter', 2);
    storage.set('counter', 3);
    await flushWebStoragePersistence();

    expect(storage.get('counter')).toBe(3);
    expect(localStorage.getItem(defaultKey('counter'))).toBe(JSON.stringify(3));
  });

  it('stores values with the selected driver', async () => {
    const storage = new WebStorage('app');
    const data = { enabled: true, tags: ['a', 'b'] };

    storage.set('token', data, 'session');

    expect(storage.get('token')).toEqual(data);
    await flushWebStoragePersistence();
    expect(sessionStorage.getItem(defaultKey('token'))).toBe(JSON.stringify(data));
    expect(localStorage.getItem(defaultKey('token'))).toBeNull();
  });

  it('removes tracked keys from memory and storage', async () => {
    const storage = new WebStorage('app');

    storage.set('flag', true);
    await flushWebStoragePersistence();
    storage.remove('flag');
    await flushWebStoragePersistence();

    expect(storage.get('flag')).toBeNull();
    expect(localStorage.getItem(defaultKey('flag'))).toBeNull();
  });

  it('allows removed keys to be created again', async () => {
    const storage = new WebStorage('app');

    storage.set('flag', 'initial');
    await flushWebStoragePersistence();
    storage.remove('flag');
    await flushWebStoragePersistence();
    storage.set('flag', 'replacement');
    await flushWebStoragePersistence();

    expect(storage.get('flag')).toBe('replacement');
    expect(localStorage.getItem(defaultKey('flag'))).toBe(JSON.stringify('replacement'));
  });

  it('clears only the selected driver when provided', async () => {
    const storage = new WebStorage('app');

    storage.set('localKey', 'local', 'local');
    storage.set('sessionKey', 'session', 'session');
    await flushWebStoragePersistence();
    storage.clear('local');
    await flushWebStoragePersistence();

    expect(storage.get('localKey')).toBeNull();
    expect(storage.get('sessionKey')).toBe('session');
    expect(localStorage.getItem(defaultKey('localKey'))).toBeNull();
    expect(sessionStorage.getItem(defaultKey('sessionKey'))).toBe(JSON.stringify('session'));
  });

  it('clears all tracked keys without a driver', async () => {
    const storage = new WebStorage('app');

    storage.set('localKey', 'local', 'local');
    storage.set('sessionKey', 'session', 'session');
    await flushWebStoragePersistence();
    storage.clear();
    await flushWebStoragePersistence();

    expect(storage.get('localKey')).toBeNull();
    expect(storage.get('sessionKey')).toBeNull();
    expect(localStorage.getItem(defaultKey('localKey'))).toBeNull();
    expect(sessionStorage.getItem(defaultKey('sessionKey'))).toBeNull();
  });
});
