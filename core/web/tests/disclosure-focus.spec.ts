import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { focusIsInside, returnFocusToTrigger, shouldReturnFocus } from '../app/utils/disclosure-focus';

const root = join(import.meta.dirname, '..');

function mount(): { trigger: HTMLButtonElement; panel: HTMLElement; link: HTMLAnchorElement } {
  document.body.innerHTML = `
    <button type="button" class="trigger">Menu</button>
    <nav id="panel"><a href="/work">Work</a></nav>
    <a href="/elsewhere" class="outside">Elsewhere</a>`;
  return {
    trigger: document.querySelector<HTMLButtonElement>('.trigger')!,
    panel: document.getElementById('panel')!,
    link: document.querySelector<HTMLAnchorElement>('#panel a')!,
  };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('disclosure focus return (KI-4: Menu sheet Esc)', () => {
  it('Esc always returns focus to the trigger', () => {
    expect(shouldReturnFocus('escape', true)).toBe(true);
    expect(shouldReturnFocus('escape', false)).toBe(true);
  });

  it('a link navigation or an outside click leaves focus alone', () => {
    expect(shouldReturnFocus('navigate', true)).toBe(false);
    expect(shouldReturnFocus('outside', true)).toBe(false);
  });

  it('a sheet link that stays on the page (mailto, the current page) always returns focus', () => {
    // Neither navigates, so nothing else takes focus once the sheet unmounts.
    expect(shouldReturnFocus('stay', true)).toBe(true);
    expect(shouldReturnFocus('stay', false)).toBe(true);
  });

  it('a mailto link in the sheet: focus lands on the trigger, not <body>', () => {
    const { trigger, panel, link } = mount();
    link.href = 'mailto:hello@example.com';
    link.focus();
    const inside = focusIsInside(panel);
    panel.remove();
    expect(returnFocusToTrigger(trigger, 'stay', inside)).toBe(true);
    expect(document.activeElement).toBe(trigger);
  });

  it('any other close returns focus only when it was inside the panel', () => {
    expect(shouldReturnFocus('toggle', true)).toBe(true);
    expect(shouldReturnFocus('other', true)).toBe(true);
    expect(shouldReturnFocus('other', false)).toBe(false);
  });

  it('Esc from a sheet link: focus lands on the trigger after the sheet unmounts', () => {
    const { trigger, panel, link } = mount();
    link.focus();
    const inside = focusIsInside(panel);
    expect(inside).toBe(true);
    panel.remove(); // v-if unmount: focus falls to <body>
    expect(document.activeElement).toBe(document.body);
    expect(returnFocusToTrigger(trigger, 'escape', inside)).toBe(true);
    expect(document.activeElement).toBe(trigger);
  });

  it('does not steal focus that moved outside the panel', () => {
    const { trigger, panel } = mount();
    const outside = document.querySelector<HTMLAnchorElement>('.outside')!;
    outside.focus();
    const inside = focusIsInside(panel);
    expect(inside).toBe(false);
    expect(returnFocusToTrigger(trigger, 'other', inside)).toBe(false);
    expect(document.activeElement).toBe(outside);
  });

  it('tolerates a missing trigger or panel', () => {
    expect(focusIsInside(null)).toBe(false);
    expect(returnFocusToTrigger(null, 'escape', true)).toBe(false);
  });

  it('AppPrimaryNav routes every close through closeMenu with its reason', async () => {
    const nav = await readFile(join(root, 'app/components/AppPrimaryNav/index.vue'), 'utf8');
    expect(nav).toContain('ref="menuTrigger"');
    expect(nav).toContain("closeMenu('escape')");
    expect(nav).toContain("closeMenu('outside')");
    expect(nav).toContain("closeMenu('navigate')");
    expect(nav).toContain("closeMenu('toggle')");
    // Links that do not leave the page close as 'stay' (focus returns to Menu).
    expect(nav).toContain("closeMenu('stay')");
    expect(nav).toContain('@click="onSheetContactClick"');
    expect(nav).toContain('@click="onSheetLinkClick(item.to)"');
    expect(nav).toContain('returnFocusToTrigger(menuTrigger.value, reason, focusWasInPanel)');
  });
});
