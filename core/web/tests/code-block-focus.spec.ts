import { mount } from '@vue/test-utils';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { computed, defineComponent, type Component } from 'vue';

const root = join(import.meta.dirname, '../../..');
const syntax = readFileSync(join(root, 'theme/core/scss/globals/_syntax.scss'), 'utf8');

/** Every code frame is the scroll container, so it must be a named, keyboard-focusable region (WCAG 2.1.1 / 2.4.7). */
describe('UiCodeBlock keyboard access', () => {
  // Nuxt auto-imports `computed`; `ClientOnly` renders its default slot after mount and its
  // `#fallback` during SSR — the stubs render one or the other so all three frames are mounted.
  let UiCodeBlock: Component;
  beforeAll(async () => {
    (globalThis as Record<string, unknown>).computed = computed;
    UiCodeBlock = (await import('../app/components/ui/UiCodeBlock.vue')).default;
  }, 60_000); // first import compiles the SFC (Pug + SCSS) and the syntax highlighters
  const clientOnly = (slot: 'default' | 'fallback') =>
    defineComponent({
      setup:
        (_, { slots }) =>
        () =>
          slots[slot]?.(),
    });

  const frames = (props: Record<string, unknown>) =>
    (['default', 'fallback'] as const)
      .map((slot) => mount(UiCodeBlock, { props, global: { stubs: { ClientOnly: clientOnly(slot) } } }))
      .concat(
        mount(UiCodeBlock, {
          props: { ...props, renderMode: 'ssr' },
          global: { stubs: { ClientOnly: clientOnly('default') } },
        })
      )
      .map((wrapper) => wrapper.get('.syntax-frame').element as HTMLElement);

  it('renders each frame (client-only, fallback, ssr) as a focusable named region', () => {
    const rendered = frames({ code: 'const a = 1;', language: 'ts' });
    expect(rendered).toHaveLength(3);
    expect(rendered[1].hasAttribute('data-fallback')).toBe(true);
    for (const frame of rendered) {
      expect(frame.getAttribute('role')).toBe('region');
      expect(frame.getAttribute('tabindex')).toBe('0');
      expect(frame.tabIndex).toBe(0);
      expect(frame.getAttribute('aria-label')).toBe('Code: ts');
      expect(frame.hasAttribute('data-preview')).toBe(false);
    }
  });

  it('names the region "Code: <language>" unless the caller passes a non-empty label', () => {
    for (const frame of frames({ code: 'x', language: 'bash', ariaLabel: 'deploy.sh' })) {
      expect(frame.getAttribute('aria-label')).toBe('deploy.sh');
    }
    for (const frame of frames({ code: 'x', language: 'bash', ariaLabel: '   ' })) {
      expect(frame.getAttribute('aria-label')).toBe('Code: bash');
    }
  });

  it('a static preview (focusable: false) is no tab stop and no landmark, and crops', () => {
    for (const frame of frames({ code: 'x', language: 'ts', focusable: false })) {
      expect(frame.hasAttribute('tabindex')).toBe(false);
      expect(frame.hasAttribute('role')).toBe(false);
      expect(frame.hasAttribute('aria-label')).toBe(false);
      expect(frame.hasAttribute('data-preview')).toBe(true);
    }
    const block = readFileSync(join(root, 'core/web/app/components/ui/UiCodeBlock.vue'), 'utf8');
    expect(block).toMatch(/:deep\(\.syntax-frame\[data-preview\]\)\s*\{\s*overflow: hidden;/);
  });

  it('the wrapper never clips the frame ring (the app global gives .ui-code-block overflow-x: auto)', () => {
    const block = readFileSync(join(root, 'core/web/app/components/ui/UiCodeBlock.vue'), 'utf8');
    expect(block).toMatch(/\.ui-code-block \{\s*min-width: 0;\s*(?:\/\/[^\n]*\n\s*)*overflow: visible;/);
  });

  it('the gallery grid passes focusable: false (its "Open in feed" button is the control)', () => {
    const page = readFileSync(join(root, 'core/web/app/pages/gallery/index.vue'), 'utf8');
    const exhibit = readFileSync(join(root, 'core/web/app/components/gallery/GalleryExhibit.vue'), 'utf8');
    expect(page).toContain(':code-focusable="false"');
    expect(exhibit).toContain(':focusable="codeFocusable"');
  });

  it('draws the 2px focus ring on the frame from the theme', () => {
    expect(syntax).toMatch(
      /\.syntax-frame\s*\{[\s\S]*?&:focus-visible\s*\{\s*outline: 2px solid var\(--theme-focus-ring-color\);\s*outline-offset: 2px;/
    );
  });

  it('does not clip that outward ring inside gallery code exhibits', () => {
    const exhibit = readFileSync(join(root, 'core/web/app/components/gallery/GalleryExhibit.vue'), 'utf8');
    const feed = readFileSync(join(root, 'core/web/app/components/gallery/GalleryFeedCard.vue'), 'utf8');
    expect(exhibit).toMatch(/&:not\(\[data-kind='code'\]\)\s*\{\s*overflow:\s*hidden;/);
    expect(feed).toMatch(/&\[data-kind='code'\]\s*&__frame\s*\{\s*overflow:\s*visible;/);
  });
});
