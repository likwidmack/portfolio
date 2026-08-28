// @vitest-environment jsdom

import storage, { StorageService, WebStorageService } from '../../src/lib/class-models/web-storage-service.js';

describe('WebStorageService (browser drivers)', () => {
  let service: WebStorageService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    const cookies = document.cookie ? document.cookie.split(';') : [];
    for (const cookie of cookies) {
      const [name] = cookie.trim().split('=');
      document.cookie = `${name}=; Max-Age=0; Path=/`;
    }

    service = new WebStorageService('local');
  });

  it('sets and gets string and object values', async () => {
    await service.set('testKey', 'testValue');
    expect(await service.get('testKey')).toBe('testValue');

    const data = { id: 1, name: 'Gemini' };
    await service.set('user', data);
    expect(await service.get('user')).toEqual(data);
  });

  it('stores null as JSON null and returns it', async () => {
    await service.set('empty', null);
    expect(localStorage.getItem('empty')).toBe('null');
    expect(await service.get('empty')).toBeNull();
  });

  it('returns null for missing keys and checks key presence', async () => {
    expect(await service.get('missing')).toBeNull();
    expect(await service.has('missing')).toBe(false);

    await service.set('exists', 123);
    expect(await service.has('exists')).toBe(true);
  });

  it('removes and clears values', async () => {
    await service.set('toBeRemoved', true);
    await service.remove('toBeRemoved');
    expect(await service.get('toBeRemoved')).toBeNull();

    await service.set('item1', 1);
    await service.set('item2', 2);
    service.clear();
    expect(await service.get('item1')).toBeNull();
    expect(await service.get('item2')).toBeNull();
  });

  it('uses the requested and default drivers', async () => {
    await service.set('sessionKey', 'sessionValue', { driver: 'session' });
    expect(sessionStorage.getItem('sessionKey')).toBe(JSON.stringify('sessionValue'));
    expect(localStorage.getItem('sessionKey')).toBeNull();

    const sessionService = new WebStorageService('session');
    await sessionService.set('key', 'val');
    expect(sessionStorage.getItem('key')).toBe(JSON.stringify('val'));
  });

  it('sets, gets, removes, and clears cookies', async () => {
    await service.set('cookieKey', { foo: 'bar' }, { driver: 'cookie' });
    expect(await service.get('cookieKey', { driver: 'cookie' })).toEqual({ foo: 'bar' });

    await service.remove('cookieKey', 'cookie');
    expect(await service.get('cookieKey', { driver: 'cookie' })).toBeNull();

    await service.set('c1', 1, { driver: 'cookie' });
    await service.set('c2', 2, { driver: 'cookie' });
    service.clear('cookie');
    expect(await service.get('c1', { driver: 'cookie' })).toBeNull();
    expect(await service.get('c2', { driver: 'cookie' })).toBeNull();
  });

  it('returns raw strings that are not valid JSON', async () => {
    localStorage.setItem('badJson', '{ invalid');
    expect(await service.get('badJson')).toBe('{ invalid');
  });

  it('keeps the StorageService compatibility alias', () => {
    expect(StorageService).toBe(WebStorageService);
  });

  it('setItem/getItem round-trip JSON', () => {
    service.setItem('k', { a: 1 });
    expect(service.getItem('k')).toEqual({ a: 1 });
    expect(service.length).toBe(1);

    service.removeItem('k');
    expect(service.getItem('k')).toBeNull();

    service.setItem('another', true);
    service.clearStorage();
    expect(service.length).toBe(0);
  });
});

describe('storage singleton', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('uses the local driver by default', async () => {
    await storage.set('singleton-key', 'singleton-value');
    expect(await storage.get('singleton-key')).toBe('singleton-value');
  });
});
