// @vitest-environment jsdom

import StorageQueue from '../../services/storage/storage-queue';
import storage, { StorageService } from '../../services/storage/storage-service';
import WebStorage from '../../services/storage/web-storage';
import { createCdnHelper, resolveCdnPath } from '../../shared/utils/cdn';
import { debounce } from '../../shared/utils/debounce';
import { throttle } from '../../shared/utils/throttle';
import { toSnakeCase } from '../../shared/utils/to-snake-case';

describe('utility re-export shims', () => {
  it('resolves browser and default utility exports', () => {
    expect(storage).toBeDefined();
    expect(StorageService).toBeTypeOf('function');
    expect(WebStorage).toBeTypeOf('function');
    expect(StorageQueue).toBeTypeOf('function');
    expect(debounce).toBeTypeOf('function');
    expect(throttle).toBeTypeOf('function');
    expect(toSnakeCase).toBeTypeOf('function');
    expect(createCdnHelper).toBeTypeOf('function');
    expect(resolveCdnPath('/x', 'https://cdn.example.com')).toBe('https://cdn.example.com/x');
  });
});
