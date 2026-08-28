// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { renderBlogMarkdown } from './render-blog-markdown';

describe('renderBlogMarkdown', () => {
  it('renders markdown to HTML', () => {
    const html = renderBlogMarkdown('# Hello\n\nA **bold** word.');
    expect(html).toContain('<h1');
    expect(html).toContain('Hello');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('strips script tags', () => {
    const html = renderBlogMarkdown('Hi <script>alert(1)</script>');
    expect(html).not.toContain('<script');
    expect(html).toContain('Hi');
  });

  it('renders draft patterns used by the AI UX post', () => {
    const sample = [
      'Lead paragraph.',
      '',
      '## What it means',
      '',
      'Classical UX asks: *Can people find what they need?*',
      '',
      '- First question',
      '- Second question',
      '',
      '**Expectation.** Users compare products.',
      '',
      '### 1. Show the system state',
      '',
      'See the [Human-Controlled AI Lab](/ai-lab).',
    ].join('\n');

    const html = renderBlogMarkdown(sample);
    expect(html).not.toMatch(/<h1\b/i);
    expect(html).toContain('<h2');
    expect(html).toContain('<h3');
    expect(html).toContain('<em>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<strong>Expectation.</strong>');
    expect(html).toContain('href="/ai-lab"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain('<script');
  });
});
