import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as utilities from '../src/index.js';
import { DATA_BACKENDS, resolveDataBackend } from '../src/index.js';

const utilitiesDoc = join(dirname(fileURLToPath(import.meta.url)), '../../../docs/packages/utilities.md');

describe('docs/packages/utilities.md resolveDataBackend section', () => {
  it('names only helpers the Node entry exports', () => {
    const doc = readFileSync(utilitiesDoc, 'utf8');
    const section = doc.slice(doc.indexOf('### `resolveDataBackend`'), doc.indexOf('### `deepAssign`'));
    const helpers = [...section.matchAll(/`([A-Za-z_]\w*)\(/g)].map((match) => match[1]);
    expect(helpers).toContain('resolveDataBackend');
    for (const helper of helpers) {
      expect(utilities, `${helper} is documented but not exported`).toHaveProperty(helper);
    }
  });
});

describe('resolveDataBackend', () => {
  it('defaults SYS_ENV=local to sqlite', () => {
    expect(resolveDataBackend({ SYS_ENV: 'local' })).toBe('sqlite');
  });

  it('defaults a missing or blank SYS_ENV to sqlite (host `npm run dev`)', () => {
    expect(resolveDataBackend({})).toBe('sqlite');
    expect(resolveDataBackend({ SYS_ENV: '' })).toBe('sqlite');
    expect(resolveDataBackend({ SYS_ENV: '  ' })).toBe('sqlite');
  });

  it.each(['development', 'test', 'production'])('defaults SYS_ENV=%s to dynamodb', (sysEnv) => {
    expect(resolveDataBackend({ SYS_ENV: sysEnv })).toBe('dynamodb');
  });

  it('treats the legacy SYS_ENV=remote as development (dynamodb)', () => {
    expect(resolveDataBackend({ SYS_ENV: 'remote' })).toBe('dynamodb');
  });

  it('falls back to sqlite for an unknown SYS_ENV, like the Nuxt SYS_ENV normalizer', () => {
    expect(resolveDataBackend({ SYS_ENV: 'staging' })).toBe('sqlite');
  });

  it.each(DATA_BACKENDS)('lets DATA_BACKEND=%s override the SYS_ENV default', (backend) => {
    expect(resolveDataBackend({ SYS_ENV: 'local', DATA_BACKEND: backend })).toBe(backend);
    expect(resolveDataBackend({ SYS_ENV: 'production', DATA_BACKEND: backend })).toBe(backend);
  });

  it('makes docker:local use DynamoDB when compose sets DATA_BACKEND=dynamodb with SYS_ENV=local', () => {
    expect(resolveDataBackend({ SYS_ENV: 'local', DATA_BACKEND: 'dynamodb' })).toBe('dynamodb');
  });

  it('accepts surrounding whitespace and any letter case in DATA_BACKEND', () => {
    expect(resolveDataBackend({ DATA_BACKEND: ' DynamoDB ' })).toBe('dynamodb');
    expect(resolveDataBackend({ DATA_BACKEND: 'POSTGRES' })).toBe('postgres');
  });

  it('treats a blank DATA_BACKEND as unset', () => {
    expect(resolveDataBackend({ SYS_ENV: 'production', DATA_BACKEND: '' })).toBe('dynamodb');
    expect(resolveDataBackend({ SYS_ENV: 'local', DATA_BACKEND: '   ' })).toBe('sqlite');
  });

  it('throws a clear error naming the variable, the bad value and the valid choices', () => {
    expect(() => resolveDataBackend({ DATA_BACKEND: 'mysql' })).toThrow(
      'Invalid DATA_BACKEND "mysql": expected one of sqlite, postgres, dynamodb'
    );
  });

  it('lets E2E_STORE_SYS_ENV replace SYS_ENV for the default, like the message and post stores', () => {
    expect(resolveDataBackend({ SYS_ENV: 'test', E2E_STORE_SYS_ENV: 'local' })).toBe('sqlite');
    expect(resolveDataBackend({ SYS_ENV: 'local', E2E_STORE_SYS_ENV: 'production' })).toBe('dynamodb');
    expect(resolveDataBackend({ SYS_ENV: 'test', E2E_STORE_SYS_ENV: '  ' })).toBe('dynamodb');
    expect(resolveDataBackend({ SYS_ENV: 'test', E2E_STORE_SYS_ENV: 'local', DATA_BACKEND: 'dynamodb' })).toBe(
      'dynamodb'
    );
  });

  it('reads process.env by default', () => {
    const previous = process.env.DATA_BACKEND;
    process.env.DATA_BACKEND = 'postgres';
    try {
      expect(resolveDataBackend()).toBe('postgres');
    } finally {
      if (previous === undefined) {
        Reflect.deleteProperty(process.env, 'DATA_BACKEND');
      } else {
        process.env.DATA_BACKEND = previous;
      }
    }
  });
});
