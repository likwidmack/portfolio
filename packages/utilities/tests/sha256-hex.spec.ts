import { sha256Hex } from '../src/lib/sha256-hex.js';

describe('sha256Hex', () => {
  it('hashes a UTF-8 string to lowercase hex', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('tgmc')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('hashes Uint8Array payloads', () => {
    const bytes = new TextEncoder().encode('tgmc');
    expect(sha256Hex(bytes)).toBe(sha256Hex('tgmc'));
  });
});
