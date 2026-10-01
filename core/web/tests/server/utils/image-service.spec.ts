/**
 * Unit coverage for image-service guards (path jail, env gate, query validation).
 */
import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.stubGlobal('createError', (input: { statusCode: number; statusMessage: string }) => {
  const err = new Error(input.statusMessage) as Error & { statusCode: number };
  err.statusCode = input.statusCode;
  return err;
});

describe('image-service', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('resolves paths under public and rejects traversal', async () => {
    const { resolvePublicImagePath, imagePublicRoot } = await import('../../../server/utils/image-service');
    const ok = await resolvePublicImagePath('i/portfolio/x.webp');
    expect(ok.startsWith(imagePublicRoot())).toBe(true);

    await expect(resolvePublicImagePath('../package.json')).rejects.toThrow(/Invalid image path/);
    await expect(resolvePublicImagePath('//cdn.example/x.jpg')).rejects.toThrow(/Invalid image path/);
    await expect(resolvePublicImagePath('https://cdn.example/x.jpg')).rejects.toThrow(/Invalid image path/);
  });

  it('realpath-jails an existing public file and rejects symlink escape', async () => {
    const { resolvePublicImagePath, imagePublicRoot } = await import('../../../server/utils/image-service');
    const publicRoot = imagePublicRoot();
    const jailDir = join(publicRoot, 'i', '_test-jail');
    await fs.mkdir(jailDir, { recursive: true });
    const samplePath = join(jailDir, 'sample.png');
    // Minimal PNG header bytes — file only needs to exist for realpath.
    await fs.writeFile(samplePath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

    const real = await resolvePublicImagePath('i/_test-jail/sample.png');
    expect(real).toBe(await fs.realpath(samplePath));

    const linkPath = join(jailDir, 'escape-link');
    const outside = resolve(process.cwd(), 'package.json');
    let linked = false;
    try {
      await fs.symlink(outside, linkPath);
      linked = true;
    } catch {
      // Windows without SeCreateSymbolicLinkPrivilege — skip symlink assertion.
    }
    try {
      if (linked) {
        await expect(resolvePublicImagePath('i/_test-jail/escape-link')).rejects.toThrow(/Invalid image path/);
      }
    } finally {
      await fs.unlink(linkPath).catch(() => undefined);
      await fs.unlink(samplePath).catch(() => undefined);
      await fs.rmdir(jailDir).catch(() => undefined);
    }
  });

  it('blocks image APIs outside local/development', async () => {
    vi.stubEnv('SYS_ENV', 'production');
    const { assertImageApiEnabled, runOnDemandTransform, runIngest } =
      await import('../../../server/utils/image-service');
    expect(() => assertImageApiEnabled()).toThrow(/Not Found/);
    await expect(runOnDemandTransform({ src: 'i/x.webp' })).rejects.toMatchObject({ statusCode: 404 });
    await expect(runIngest({ src: 'i/x.webp' })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('blocks image APIs for test, empty, typo, and whitespace SYS_ENV', async () => {
    for (const value of ['test', '', 'prodution', 'Production', 'local ', ' local', 'local\n']) {
      vi.stubEnv('SYS_ENV', value);
      vi.resetModules();
      const { assertImageApiEnabled } = await import('../../../server/utils/image-service');
      expect(() => assertImageApiEnabled()).toThrow(/Not Found/);
    }
    vi.stubEnv('SYS_ENV', undefined as unknown as string);
    vi.resetModules();
    // Unset: delete and re-import
    const prev = process.env.SYS_ENV;
    delete process.env.SYS_ENV;
    try {
      const { assertImageApiEnabled } = await import('../../../server/utils/image-service');
      expect(() => assertImageApiEnabled()).toThrow(/Not Found/);
    } finally {
      if (prev === undefined) {
        delete process.env.SYS_ENV;
      } else {
        process.env.SYS_ENV = prev;
      }
    }
  });

  it('allows image APIs for local, development, and legacy remote', async () => {
    for (const value of ['local', 'development', 'remote']) {
      vi.stubEnv('SYS_ENV', value);
      vi.resetModules();
      const { assertImageApiEnabled } = await import('../../../server/utils/image-service');
      expect(() => assertImageApiEnabled()).not.toThrow();
    }
  });

  it('rejects missing src and invalid ops JSON', async () => {
    vi.stubEnv('SYS_ENV', 'local');
    const { runOnDemandTransform } = await import('../../../server/utils/image-service');
    await expect(runOnDemandTransform({})).rejects.toMatchObject({ statusCode: 400 });
    await expect(runOnDemandTransform({ src: 'i/x.webp', ops: '{not-json' })).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(runOnDemandTransform({ src: 'i/x.webp', ops: '{"type":"resize"}' })).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(runOnDemandTransform({ src: 'i/x.webp', ops: '[]', w: 'NaN' })).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(runOnDemandTransform({ src: 'i/x.webp', ops: '[{"type":"resize","ops":{}}]' })).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(
      runOnDemandTransform({ src: 'i/x.webp', ops: '[{"type":"format","format":"jpeg"}]' })
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      runOnDemandTransform({ src: 'i/x.webp', ops: '[{"type":"color","ops":{"brightness":999}}]' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
