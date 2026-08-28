// @vitest-environment node

import storage, { WebStorageService } from '../../src/lib/class-models/web-storage-service.js';

describe('WebStorageService SSR guards', () => {
  it('returns null/false and does not throw without window or document', async () => {
    const service = new WebStorageService();

    expect(await service.get('missing')).toBeNull();
    expect(await service.get('missing', { driver: 'session' })).toBeNull();
    expect(await service.get('missing', { driver: 'cookie' })).toBeNull();
    expect(await service.has('missing')).toBe(false);

    await service.set('k1', 'v1');
    await service.set('k2', 'v2', { driver: 'session' });
    await service.set('k3', 'v3', { driver: 'cookie' });

    await service.remove('k1');
    await service.remove('k2', 'session');
    await service.remove('k3', 'cookie');

    service.clear();
    service.clear('session');
    service.clear('cookie');

    service.setItem('sync', 'value');
    expect(service.getItem('sync')).toBeNull();
    expect(service.length).toBe(0);
    service.removeItem('sync');
    service.clearStorage();
  });

  it('keeps the default singleton SSR-safe', async () => {
    expect(await storage.get('missing')).toBeNull();
  });
});
