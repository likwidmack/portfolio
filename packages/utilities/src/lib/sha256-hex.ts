/**
 * SHA-256 hex digest for Node / Nitro / Lambda cache keys and content addressing.
 */
import { createHash } from 'node:crypto';

/**
 * Return the lowercase hex SHA-256 digest of a string or byte array.
 *
 * @param input - UTF-8 string or binary payload
 */
export function sha256Hex(input: string | Uint8Array): string {
  const hash = createHash('sha256');
  hash.update(typeof input === 'string' ? input : Buffer.from(input));
  return hash.digest('hex');
}

export default sha256Hex;
