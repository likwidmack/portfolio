import { publicSourceUrl, publicTreeUrl } from './public-repo';

/**
 * Repo docs are written for GitHub: their links stay relative to the source file with `.md` dropped
 * (`../docker/README.md` → `../docker/README`). Doc routes mirror the file tree, so resolving
 * against the page path gives the repo path (`/docker/README`, `/docs/web/README`), which 404s
 * in-app. `ProseA` maps them back:
 * - published docs → the lowercase in-app route (folder links → the folder's `readme`);
 * - docs left out of the collection (`DOCS_COLLECTION_EXCLUDE` in `docs-source.ts`) and repo
 *   files / folders that are not app routes → the public repo.
 */
export const UNPUBLISHED_DOC_DIRS = ['superpowers', 'plans'] as const;

const hasExtension = (segment: string) => /.\.[a-z0-9]+$/i.test(segment);

function isPublishedDoc(docPath: string): boolean {
  const segments = docPath.split('/').filter(Boolean);
  if (!segments.length) return true;
  if ((UNPUBLISHED_DOC_DIRS as readonly string[]).includes(segments[0]!)) return false;
  if (segments.some((s) => s.startsWith('_'))) return false;
  return docPath.endsWith('/') || !hasExtension(segments.at(-1)!);
}

function repoUrl(path: string, hash: string): string {
  if (path.endsWith('/')) return publicTreeUrl(path) + hash;
  const file = hasExtension(path.split('/').at(-1)!) ? path : `${path}.md`;
  return publicSourceUrl(file) + hash;
}

/** Resolve a page-relative link against the doc route it appears on; other hrefs pass through. */
function resolveFrom(href: string, pagePath: string): string {
  if (!href || href.startsWith('#') || href.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(href)) return href;
  if (href.startsWith('/')) return href;
  const url = new URL(href, `http://doc.invalid${pagePath}`);
  return url.pathname + url.search + url.hash;
}

/**
 * Map a doc link written for GitHub to its in-app or public-repo target. `pagePath` is the doc
 * route the link appears on; `isAppRoute` reports whether a root path is a page of this site.
 */
export function docsLinkHref(href: string, pagePath: string, isAppRoute: (path: string) => boolean): string {
  href = resolveFrom(href, pagePath);
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  const [, path = '', query = '', hash = ''] = /^([^?#]*)(\?[^#]*)?(#.*)?$/.exec(href) ?? [];
  if (path === '/docs' || path === '/docs/') return `/docs${query}${hash}`;
  if (path.startsWith('/docs/')) {
    const doc = path.slice('/docs/'.length);
    if (!isPublishedDoc(doc)) return repoUrl(path, hash);
    const route = doc.endsWith('/') ? `${doc}readme` : doc;
    return `/docs/${route.toLowerCase()}${query}${hash}`;
  }
  return isAppRoute(path) ? href : repoUrl(path, hash);
}
