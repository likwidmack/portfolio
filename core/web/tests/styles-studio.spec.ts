import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { readStudioPaintedColors, studioReadout } from '../shared/studio-readout';

const root = join(import.meta.dirname, '..');
const read = (path: string) => readFile(join(root, path), 'utf8');

describe('Style Studio page', () => {
  it('keeps /styles for Style Studio and moves the kitchen sink to /styles/parity', async () => {
    const page = await read('app/pages/styles/index.vue');
    expect(page).toContain('Style Studio');
    expect(page).toContain('AppStyleStudio');
    expect(page).not.toContain('AppStylesParity');
    expect(page).toContain('to="/styles/parity"');

    const parity = await read('app/pages/styles/parity.vue');
    expect(parity).toContain('AppStylesParity');
    expect(parity).toContain('Component parity');
    expect(parity).toContain("id: 'buttons'");
    expect(parity).toContain('to="/styles"');
  });

  it('keeps Native / Foundation / PrimeVue parity lanes in AppStylesParity', async () => {
    const parity = await read('app/components/AppStylesParity/index.vue');
    expect(parity).toContain('data-lane="native"');
    expect(parity).toContain('data-lane="foundation"');
    expect(parity).toContain('data-lane="primevue"');
    expect(parity).toContain('section#theme-mode');
    expect(parity).toContain('#parity.styles-parity');
  });

  it('names the palette swatches as a group, not a list without list items (axe aria-required-children)', async () => {
    const studio = await read('app/components/AppStyleStudio/index.vue');
    expect(studio).toContain('span#studio-palette-label.style-studio__label Palette');
    expect(studio).toContain('.style-studio__swatches(role="group", aria-labelledby="studio-palette-label")');
    expect(studio).not.toContain('.style-studio__swatches(role="list")');
  });

  it('edits one role at a time with a live contrast readout and a sticky draft bar', async () => {
    const studio = await read('app/components/AppStyleStudio/index.vue');
    expect(studio).toContain('aria-label="Role to edit"');
    expect(studio).toContain('studioReadout(');
    // Fix round 1: the pick is adjusted automatically, so the readout shows the raw pick's ratio and
    // the colour it paints — no "fix it" buttons any more.
    expect(studio).toContain('Your pick');
    expect(studio).toContain('shown as');
    expect(studio).toContain('Button text');
    expect(studio).not.toContain('Darken until it passes');
    expect(studio).not.toContain('Use nearest passing shade');
    expect(studio).not.toContain('nearestPassingShade');
    expect(studio).toContain('Derive from primary');
    expect(studio).toContain('label="Apply"');
    expect(studio).toContain('label="Discard changes"');
    expect(studio).toContain('label="Save as setup"');
    expect(studio).toContain('Replace “');
    expect(studio).toContain('role="radiogroup", aria-label="Brand packs"');
    expect(studio).not.toContain('value="Auto"');
    expect(studio).toContain('style-studio__triad');
  });

  it('reads the contrast readout from the painted --theme-* colours (colour system Task 3)', () => {
    // Behaviour, not source strings: a resolver that paints the active variation (the pick moved to
    // 3:1), the page and the primary button; the readout must use what is painted.
    const painted: Record<string, string> = {
      'var(--theme-main-background-color)': '#faf6f3',
      'var(--theme-primary-color)': '#d9531d',
      'var(--theme-secondary-color)': '#6e1622',
      'var(--theme-button-fill-color)': '#c74c1b',
      'var(--theme-button-fg-color)': '#ffffff',
    };
    const asked: string[] = [];
    const resolve = (css: string) => (asked.push(css), painted[css] ?? null);
    const colors = readStudioPaintedColors('primary', resolve);
    expect(colors).toEqual({
      pageBackground: '#faf6f3',
      role: '#d9531d',
      button: { fill: '#c74c1b', ink: '#ffffff' },
    });
    // Old (pre-colour-system) names are never read.
    expect(asked.filter((css) => /var\(--(main-background|text-color|primary-color|button-fg)\)/.test(css))).toEqual(
      []
    );

    // A pale pick fails 3:1 on light paper; the readout reports the pick but judges what is shown.
    const readout = studioReadout('#ffd0bb', colors);
    expect(readout.pick.pass).toBe(false);
    expect(readout.shownHex).toBe('#d9531d');
    expect(readout.shown).toEqual({ ratio: 3.75, min: 3, pass: true });
    expect(readout.button).toEqual({ ratio: 4.69, min: 4.5, pass: true });

    // Nothing painted yet (SSR / no canvas): fall back to the pick, the dark page and white text.
    const bare = studioReadout(
      '#6e1622',
      readStudioPaintedColors('secondary', () => null)
    );
    expect(bare.shownHex).toBe('#6e1622');
    expect(bare.buttonColors).toEqual({ fill: '#6e1622', ink: '#ffffff' });
    expect(bare.pageBackground).toBe('#0f0908');
  });

  it('picks pack label text from the painted ink / paper with a halo of the other (narrow pin)', async () => {
    // Text and text-secondary share a lightness direction, so neither reads on light fills in dark
    // mode: the label helper keeps the better of ink and paper on the fills and haloes it with the
    // other. The pre-colour-system names must not come back.
    const studio = await read('app/components/AppStyleStudio/index.vue');
    expect(studio).toContain("const INK_VAR = 'var(--theme-ink-color)';");
    expect(studio).toContain("const PAPER_VAR = 'var(--theme-paper-color)';");
    expect(studio).toMatch(/resolveCssColorToHex\(INK_VAR\)[\s\S]*resolveCssColorToHex\(PAPER_VAR\)/);
    expect(studio).toMatch(/textShadow:\s*`0 0 0\.2em \$\{halo\}/);
    for (const old of ["'var(--main-background)'", "'var(--text-color)'", "'var(--text-secondary-color)'"])
      expect(studio).not.toContain(old);
  });

  it('keeps the draft on unmount and guards reloads while dirty', async () => {
    const studio = await read('app/components/AppStyleStudio/index.vue');
    expect(studio).not.toMatch(/onBeforeUnmount\(\(\) => \{\s*if \(dirty\.value\)/);
    const plugin = await read('app/plugins/style-draft-guard.client.ts');
    expect(plugin).toContain("useState<boolean>('style-studio-draft-dirty'");
    expect(plugin).toContain('useUnsavedDraftGuard(dirty)');
    const guard = await read('app/composables/useUnsavedDraftGuard.ts');
    expect(guard).toContain("'beforeunload'");
  });

  it('offers Undo after deleting a saved setup', async () => {
    const studio = await read('app/components/AppStyleStudio/index.vue');
    expect(studio).toContain('SETUP_UNDO_MS = 8000');
    expect(studio).toContain('restoreSetup(');
    expect(studio).toContain('undoDeleteSetup');
  });

  it('asks before switching to the camera background, in one shared picker', async () => {
    const picker = await read('app/components/AppBackgroundPicker.vue');
    expect(picker).toContain('Uses your camera locally — nothing is recorded or sent.');
    expect(picker).toContain('Turn on camera');
    expect(picker).toContain('`${name}-custom-picker`');
    expect(picker).toContain('BACKGROUND_CUSTOM_OPTIONS');
    expect(picker).toContain('Background ${option.label}');
    const studio = await read('app/components/AppStyleStudio/index.vue');
    expect(studio).toContain('AppBackgroundPicker');
  });

  it('keeps Personalize thin with Open studio, the shared background picker, and no brand role pickers', async () => {
    const personalize = await read('app/components/AppPersonalize/index.vue');
    expect(personalize).toContain('Open studio');
    expect(personalize).toContain("navigateTo('/styles')");
    expect(personalize).toContain('AppBackgroundPicker');
    expect(personalize).toContain('name="theme-background"');
    expect(personalize).not.toContain('Palette swatches');
    expect(personalize).not.toContain('setPrimary');
    expect(personalize).not.toContain('brand-primary-picker');
  });
});
