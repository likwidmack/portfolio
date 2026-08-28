import { describe, expect, it } from 'vitest';

import { app } from '../config-properties/app-prop';

describe('app head icon', () => {
  it('uses origin /favicon.ico when CDN is unset', () => {
    const icon = app('d', 't').head.link.find((link) => link.rel === 'icon');
    expect(icon?.href).toBe('/favicon.ico');
  });

  it('points the icon at the CDN origin when configured', () => {
    const icon = app('d', 't', 'https://d3.cloudfront.net').head.link.find((link) => link.rel === 'icon');
    expect(icon?.href).toBe('https://d3.cloudfront.net/favicon.ico');
  });
});
