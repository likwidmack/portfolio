// @vitest-environment node

import FakeLocalStorage from '../../src/lib/class-models/fake-local-storage.js';

describe('FakeLocalStorage', () => {
  it('is usable without browser storage', () => {
    const storage = new FakeLocalStorage();

    expect(storage.length).toBe(0);
    expect(storage.getItem('missing')).toBeNull();

    storage.setItem('name', 'Tamara');
    storage.setItem('theme', 'dark');
    expect(storage.length).toBe(2);
    expect(storage.getItem('name')).toBe('Tamara');
    expect(storage.key(0)).toBe('name');
    expect([...storage.getKeys()]).toEqual(['name', 'theme']);

    storage.removeItem('name');
    expect(storage.getItem('name')).toBeNull();
    expect(storage.length).toBe(1);

    storage.clear();
    expect(storage.length).toBe(0);
  });
});
