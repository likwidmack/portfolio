import { fileURLToPath, URL } from 'node:url';

const resolvePath = (strUrl: string | URL) => fileURLToPath(new URL(strUrl, import.meta.url));

/**
 * Vite dev-server filesystem allow list: the web app and the workspace root only.
 * Icons are inline SVG from @nuxt/icon (bundled at build time), so no icon-font
 * package needs an extra allow entry — the old PrimeIcons font root was removed.
 */
export const viteFsAllowRoots = [resolvePath('.'), resolvePath('../../..')];
