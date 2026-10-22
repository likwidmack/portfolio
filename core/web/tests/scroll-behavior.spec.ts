import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..');
const themeLayout = join(root, '../../theme/core/scss/_layout.scss');

// KI-9: `scrollIntoView({ behavior: 'auto' })` defers to the CSS `scroll-behavior`, so a global
// `html { scroll-behavior: smooth }` made reduced-motion jumps smooth (and long ones unreliable).
describe('scripted scrolls honour reduced motion', () => {
  it('the theme only scrolls smoothly when neither the OS nor the site motion setting reduces motion', async () => {
    const scss = await readFile(themeLayout, 'utf8');
    const html = scss.slice(scss.indexOf('html {'), scss.indexOf('}', scss.indexOf('html {')));
    expect(html).not.toContain('scroll-behavior');
    expect(scss).toMatch(
      /@media \(prefers-reduced-motion: no-preference\) \{\s*html:not\(\[data-motion='reduced'\]\) \{\s*scroll-behavior: smooth;/
    );
    // `playful` opts in (as usePrefersReducedMotion does); no other unconditional smooth rule.
    expect(scss).toMatch(/\nhtml\[data-motion='playful'\] \{\s*scroll-behavior: smooth;/);
    expect(scss.match(/scroll-behavior: smooth/g)).toHaveLength(2);
  });

  it.each(['app/pages/work/index.vue', 'app/pages/gallery/index.vue'])(
    '%s jumps instantly when motion is reduced',
    async (rel) => {
      const page = await readFile(join(root, rel), 'utf8');
      expect(page).toContain("reducedMotion.value ? 'instant' : 'smooth'");
      expect(page).not.toContain("reducedMotion.value ? 'auto'");
    }
  );
});
