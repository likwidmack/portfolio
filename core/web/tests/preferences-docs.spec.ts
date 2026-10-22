import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PREFERENCE_KEYS } from '../shared/preferences/storage';

const DOC = join(import.meta.dirname, '../../../docs/web/features/personalization.md');

/** Backticked `tgmc-*` keys in the first column of the tables under `## Storage`. */
function storageTableKeys(markdown: string): string[] {
  const start = markdown.indexOf('\n## Storage\n');
  expect(start).toBeGreaterThan(-1);
  const next = markdown.indexOf('\n## ', start + 1);
  const section = markdown.slice(start, next < 0 ? undefined : next);
  return section
    .split('\n')
    .map((line) => /^\|\s*`(tgmc-[a-z-]+)`\s*\|/.exec(line)?.[1])
    .filter((key): key is string => key != null);
}

describe('personalization.md storage table', () => {
  it('lists exactly PREFERENCE_KEYS.current', () => {
    const keys = storageTableKeys(readFileSync(DOC, 'utf8'));
    expect([...keys].sort()).toEqual([...PREFERENCE_KEYS.current].sort());
  });
});
