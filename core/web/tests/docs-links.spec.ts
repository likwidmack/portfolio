import { describe, expect, it } from 'vitest';

import { docsLinkHref, UNPUBLISHED_DOC_DIRS } from '../shared/docs-links';
import { DOCS_COLLECTION_EXCLUDE } from '../shared/docs-source';
import { PUBLIC_REPO } from '../shared/public-repo';

const APP_ROUTES = new Set(['/', '/work', '/about', '/gallery', '/blog', '/code', '/process', '/ai-lab', '/styles']);
const isAppRoute = (path: string) => APP_ROUTES.has(path) || path.startsWith('/work/');
const blob = (path: string) => `${PUBLIC_REPO.url}/blob/main/${path}`;
const tree = (path: string) => `${PUBLIC_REPO.url}/tree/main/${path}`;
const map = (href: string, page = '/docs/readme') => docsLinkHref(href, page, isAppRoute);

describe('docsLinkHref', () => {
  it('maps README links to the lowercase doc route', () => {
    expect(map('./agents/README')).toBe('/docs/agents/readme');
    expect(map('./web/README#setup')).toBe('/docs/web/readme#setup');
    expect(map('../README', '/docs/web/features/admin')).toBe('/docs/web/readme');
  });

  it('maps doc folder links to the folder readme', () => {
    expect(map('./templates/commit-pr-rules/')).toBe('/docs/templates/commit-pr-rules/readme');
    expect(map('../agents/', '/docs/web/readme')).toBe('/docs/agents/readme');
    expect(map('./', '/docs/readme')).toBe('/docs');
  });

  it('keeps published doc links in-app', () => {
    expect(map('./cicd')).toBe('/docs/cicd');
    expect(map('../../packages/theme#contrast-roles', '/docs/web/features/personalization')).toBe(
      '/docs/packages/theme#contrast-roles'
    );
  });

  it('sends unpublished docs to the public repo', () => {
    expect(map('./superpowers/plans/')).toBe(tree('docs/superpowers/plans'));
    expect(map('../../superpowers/specs/2026-09-24-color-system-design', '/docs/web/features/app-scss')).toBe(
      blob('docs/superpowers/specs/2026-09-24-color-system-design.md')
    );
    expect(map('../plans/2026-09-22-001-feat-media-library-sdk-plan', '/docs/packages/media')).toBe(
      blob('docs/plans/2026-09-22-001-feat-media-library-sdk-plan.md')
    );
    expect(map('../_config.yml', '/docs/dev/github-access')).toBe(blob('docs/_config.yml'));
  });

  it('sends repo files and folders that are not app routes to the public repo', () => {
    expect(map('../core/web/')).toBe(tree('core/web'));
    expect(map('../AGENTS')).toBe(blob('AGENTS.md'));
    expect(map('../../../docker/README#topology', '/docs/web/features/admin')).toBe(blob('docker/README.md#topology'));
    expect(map('../scripts/setup-github-rulesets.mjs')).toBe(blob('scripts/setup-github-rulesets.mjs'));
    expect(map('../.env.admin.example')).toBe(blob('.env.admin.example'));
  });

  it('leaves app routes, anchors and external links alone', () => {
    expect(map('/work/media-systems')).toBe('/work/media-systems');
    expect(map('#catalog')).toBe('#catalog');
    expect(map('https://example.com/a')).toBe('https://example.com/a');
    expect(map('mailto:someone@example.com')).toBe('mailto:someone@example.com');
  });

  it('lists the same unpublished folders as the docs collection', () => {
    for (const dir of UNPUBLISHED_DOC_DIRS) expect(DOCS_COLLECTION_EXCLUDE).toContain(`${dir}/**`);
  });
});
