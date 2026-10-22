import { describe, expect, it } from 'vitest';

describe('tokens-public export surface', () => {
  it('tokens-public does not export updateTokens', async () => {
    const mod = await import('../src/tokens-public.js');
    expect('updateTokens' in mod).toBe(false);
  });

  it('tokens-public does not export updateToken or setTokens', async () => {
    const mod = await import('../src/tokens-public.js');
    expect('updateToken' in mod).toBe(false);
    expect('setTokens' in mod).toBe(false);
  });

  it('tokens-public exports Theme', async () => {
    const mod = await import('../src/tokens-public.js');
    expect(mod.Theme).toBeDefined();
    expect(typeof mod.Theme.apply).toBe('function');
  });
});
