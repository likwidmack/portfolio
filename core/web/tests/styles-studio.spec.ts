import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

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

  it('edits one role at a time with a live contrast readout and a sticky draft bar', async () => {
    const studio = await read('app/components/AppStyleStudio/index.vue');
    expect(studio).toContain('aria-label="Role to edit"');
    expect(studio).toContain('evaluateRoleContrast');
    expect(studio).toContain('Darken until it passes');
    expect(studio).toContain('Use nearest passing shade');
    expect(studio).toContain('Derive from primary');
    expect(studio).toContain('label="Apply"');
    expect(studio).toContain('label="Discard changes"');
    expect(studio).toContain('label="Save as setup"');
    expect(studio).toContain('Replace “');
    expect(studio).toContain('role="radiogroup", aria-label="Brand packs"');
    expect(studio).not.toContain('value="Auto"');
    expect(studio).toContain('style-studio__triad');
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
