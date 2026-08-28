import { setCssVariable } from './set-css-variable';

/**
 * Writes `--vh` on `:root` as 1% of `window.innerHeight` and refreshes it on resize.
 *
 * Enables reliable full-viewport layouts on mobile where `100vh` ignores dynamic browser chrome.
 */
const o = {
  get vh() {
    return window.innerHeight * 0.01;
  },
  getElementHeight(id: string) {
    return document.getElementById(id)?.offsetHeight ?? 80;
  },
};

type LayoutSizingOptions = {
  headerId?: string;
  footerId?: string;
};

export function styleListener(options: LayoutSizingOptions = {}) {
  const headerId = options.headerId ?? 'site_header';
  const footerId = options.footerId ?? 'site_footer';
  setCssVariable('--vh', `${o.vh}px`);
  setCssVariable('--main-top-padding', `${o.getElementHeight(headerId) + 5}px`);
  setCssVariable('--main-bottom-padding', `${o.getElementHeight(footerId) + 5}px`);
}
