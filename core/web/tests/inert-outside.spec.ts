import { afterEach, describe, expect, it } from 'vitest';

import { INERT_OUTSIDE_KEEP, inertOutside } from '../app/utils/inert-outside';

function mount() {
  document.body.innerHTML = `
    <a class="skip" href="#main">Skip</a>
    <div id="page">
      <header><button class="menu">Menu</button></header>
      <main>
        <div class="toolbar"><button>Grid</button></div>
        <section class="dialog"><button class="back">Back</button></section>
        <section class="cta" inert><a href="#">Already inert</a></section>
      </main>
      <footer>Footer</footer>
    </div>`;
  return document.querySelector<HTMLElement>('.dialog')!;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('inertOutside (modal background)', () => {
  it('makes every sibling along the ancestor chain inert, but not the dialog or its ancestors', () => {
    const dialog = mount();
    inertOutside(dialog);
    const inert = (selector: string) => document.querySelector(selector)!.hasAttribute('inert');
    for (const selector of ['.skip', 'header', '.toolbar', '.cta', 'footer'])
      expect(inert(selector), selector).toBe(true);
    for (const selector of ['.dialog', 'main', '#page', '.back']) expect(inert(selector), selector).toBe(false);
  });

  it('restore removes only the inert it added', () => {
    const dialog = mount();
    const restore = inertOutside(dialog);
    restore();
    expect(document.querySelectorAll('[inert]')).toHaveLength(1);
    expect(document.querySelector('.cta')!.hasAttribute('inert')).toBe(true);
    restore(); // idempotent
    expect(document.querySelectorAll('[inert]')).toHaveLength(1);
  });

  it('skips script / style / template siblings and tolerates a detached element', () => {
    const dialog = mount();
    const script = document.createElement('script');
    document.body.appendChild(script);
    inertOutside(dialog)();
    expect(script.hasAttribute('inert')).toBe(false);
    expect(() => inertOutside(document.createElement('div'))()).not.toThrow();
  });

  it('keeps live regions and teleport hosts reachable (toasts, #teleports, the route announcer)', () => {
    const dialog = mount();
    document.body.insertAdjacentHTML(
      'beforeend',
      `<div class="p-toast p-component" id="toast"></div>
       <div class="ui-toast-host" aria-live="polite" id="native-toast"></div>
       <div id="teleports"></div>
       <div id="__nuxt-route-announcer" role="status"></div>
       <div class="alert" role="alert" id="alert"></div>
       <aside id="other">Behind</aside>`
    );
    const restore = inertOutside(dialog);
    for (const id of ['toast', 'native-toast', 'teleports', '__nuxt-route-announcer', 'alert'])
      expect(document.getElementById(id)!.hasAttribute('inert'), id).toBe(false);
    expect(document.getElementById('other')!.hasAttribute('inert')).toBe(true);
    restore();
    expect(document.querySelectorAll('[inert]')).toHaveLength(1); // the pre-inert .cta
  });

  it('takes a custom keep selector (replacing the default list)', () => {
    const dialog = mount();
    inertOutside(dialog, 'header');
    expect(document.querySelector('header')!.hasAttribute('inert')).toBe(false);
    expect(document.querySelector('footer')!.hasAttribute('inert')).toBe(true);
    expect(INERT_OUTSIDE_KEEP).toContain('[aria-live]');
  });
});
