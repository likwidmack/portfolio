import { realpathSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

const resolvePath = (strUrl: string | URL) => fileURLToPath(new URL(strUrl, import.meta.url));

/**
 * Git worktrees commonly link node_modules from the primary checkout. Vite
 * checks the resolved target, so allow only PrimeIcons' real package root for
 * its CSS-referenced font files instead of opening the whole external checkout.
 */
export const primeIconsRoot = realpathSync(resolvePath('../../../node_modules/primeicons'));

export const viteFsAllowRoots = [resolvePath('.'), resolvePath('../../..'), primeIconsRoot];
