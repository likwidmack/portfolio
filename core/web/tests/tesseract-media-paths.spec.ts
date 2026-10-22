// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '../../..');
const read = (relativePath: string) => readFileSync(join(root, relativePath), 'utf8');

const NOTE_HEADING = '## Intentional case-study paths (do not flag)';
const NOTE_ANCHOR = 'site-media.md#intentional-case-study-paths-do-not-flag';

/** Owner decision (#279): these paths are intentional. Do not "fix" them. */
describe('tesseract case-study media paths', () => {
  it('the case studies keep their /i/portfolio/tesseract/ paths', () => {
    const spatial = read('core/web/content/case-studies/spatial-experiences.json');
    expect(spatial).toContain('"/i/portfolio/tesseract/blue-8-cell-simple.png"');
    expect(spatial).toContain('"/i/portfolio/tesseract/schlegel-wireframe-8-cell.png"');
    expect(read('core/web/content/case-studies/innovation-prototyping.json')).toContain(
      '"/i/portfolio/tesseract/blue-8-cell-simple.png"'
    );
  });

  it('site-media.md records that they are intentional', () => {
    const doc = read('docs/web/features/site-media.md');
    expect(doc).toContain(NOTE_HEADING);
    expect(doc).not.toContain('<<OBSERVED-MECHANISM');
  });

  it.each(['docs/agents/README.md', 'scripts/update-agents.mjs', 'AGENTS.md'])(
    '%s points agents at the note',
    (file) => {
      expect(read(file)).toContain(NOTE_ANCHOR);
    }
  );
});
