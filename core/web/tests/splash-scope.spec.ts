import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveDoorScope } from '../shared/splash-scope';

const root = join(import.meta.dirname, '..');

describe('splash door scope', () => {
  it('fills {caseStudies} with the count, singular when it is one', () => {
    expect(resolveDoorScope('{caseStudies}', { caseStudies: 6 })).toBe('6 case studies');
    expect(resolveDoorScope('{caseStudies}', { caseStudies: 1 })).toBe('1 case study');
    expect(resolveDoorScope('Decision cards', { caseStudies: 6 })).toBe('Decision cards');
    expect(resolveDoorScope(undefined, { caseStudies: 6 })).toBeUndefined();
  });

  it('counts the real collection on the splash (no hard-coded number in content)', async () => {
    const home = JSON.parse(await readFile(join(root, 'content/home.json'), 'utf8')) as {
      splash: { doors: { id: string; scope?: string }[] };
    };
    const discovery = home.splash.doors.find((door) => door.id === 'discovery');
    expect(discovery?.scope).toBe('{caseStudies}');
    expect(JSON.stringify(home)).not.toMatch(/\d+ case stud/);

    const splash = await readFile(join(root, 'app/components/AppSplash/index.vue'), 'utf8');
    expect(splash).toContain("useContentAsyncData('case-studies'");
    expect(splash).toContain('resolveDoorScope(door.scope');
    expect(splash).toContain('doorScopes[index]');

    // Today's content resolves to the number of published case studies.
    const count = (await readdir(join(root, 'content/case-studies'))).filter((f) => f.endsWith('.json')).length;
    expect(resolveDoorScope(discovery?.scope, { caseStudies: count })).toBe(`${count} case studies`);
  });
});
