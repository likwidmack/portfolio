import { setCssVariable } from './set-css-variable';

/**
 * Writes viewport/chrome CSS variables used by sticky in-page offsets.
 *
 * `--main-*-padding` is clearance for sticky descendants (docs TOC, etc.), not
 * padding on `<main>` — site header/footer already occupy flex rows in `#site_page`.
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
  const headerHeight = o.getElementHeight(headerId);
  const footerHeight = o.getElementHeight(footerId);
  setCssVariable('--vh', `${o.vh}px`);
  setCssVariable('--main-top-padding', `${headerHeight + 5}px`);
  setCssVariable('--main-bottom-padding', `${footerHeight + 5}px`);
  setCssVariable('--page-chrome', `${headerHeight}px`);
}
