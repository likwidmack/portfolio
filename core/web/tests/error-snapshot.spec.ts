import { describe, expect, it } from 'vitest';

import {
  buildErrorSnapshot,
  htmlTemplateHint,
  isPageOriginatedError,
  serializeErrorData,
  statusTagSeverityFor,
} from '../app/utils/error-snapshot';

describe('error-snapshot helpers', () => {
  it('serializes error data', () => {
    expect(serializeErrorData(undefined)).toBe('');
    expect(serializeErrorData('plain')).toBe('plain');
    expect(serializeErrorData({ a: 1 })).toContain('"a": 1');
  });

  it('builds snapshots with cause traces and data tags', () => {
    const snapshot = buildErrorSnapshot({
      statusCode: 500,
      statusMessage: 'Boom',
      message: 'Failed',
      stack: 'Error: Failed\n at /app/pages/home.vue',
      data: { origin: 'page', scope: 'pages' },
      cause: { message: 'root', stack: 'Error: root' },
    } as never);

    expect(snapshot.statusCode).toBe(500);
    expect(snapshot.origin).toBe('page');
    expect(snapshot.scope).toBe('pages');
    expect(snapshot.trace).toContain('Caused by:');
    expect(snapshot.trace).toContain('root');
  });

  it('maps status severities and html hints', () => {
    expect(statusTagSeverityFor(500)).toBe('danger');
    expect(statusTagSeverityFor(404)).toBe('warn');
    expect(statusTagSeverityFor(200)).toBe('success');
    expect(htmlTemplateHint('invalid end tag', '')).toContain('HTML/template');
    expect(htmlTemplateHint('other', 'nope')).toBe('');
  });

  it('detects page-originated errors', () => {
    expect(
      isPageOriginatedError({
        trace: 'at /app/pages/blog.vue',
        routePath: '/blog',
        origin: '',
        scope: '',
        htmlHint: '',
      })
    ).toBe(true);
    expect(
      isPageOriginatedError({
        trace: 'elsewhere',
        routePath: '/',
        origin: 'middleware',
        scope: 'server',
        htmlHint: '',
      })
    ).toBe(false);
  });
});
