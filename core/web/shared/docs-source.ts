import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Absolute path to the repo `docs/` tree.
 * In-app technical docs (`/docs`) read these files in place — do not copy them into `core/web/content/`.
 * Editing `docs/*.md` updates the next Nuxt Content build; follow `docs/contributing.md`
 * (“Whenever documentation is altered”) for catalogs and matching inline comments.
 * Nuxt Content parses them at **build** into the Content SQLite dump (Lambda restores that dump).
 */
export const REPO_DOCS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../docs');

export const DOCS_COLLECTION_INCLUDE = '**/*.md';

export const DOCS_COLLECTION_EXCLUDE = ['index.md', '_catalog.md', '**/_*.md', 'superpowers/**', 'plans/**'] as const;
