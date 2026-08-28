/**
 * Writes `--vh` on `:root` as 1% of `window.innerHeight` and refreshes it on resize.
 *
 * Enables reliable full-viewport layouts on mobile where `100vh` ignores dynamic browser chrome.
 */
export function adjustVhStyle() {
  const o = {
    get vh() {
      return window.innerHeight * 0.01;
    },
  };
  document.documentElement.style.setProperty('--vh', `${o.vh}px`);
  window.addEventListener('resize', () => {
    document.documentElement.style.setProperty('--vh', `${o.vh}px`);
  });
}
