import { describe, expect, it } from 'vitest';

import { applyMarkdownSyntax } from '#shared/syntax/apply-markdown-syntax';

describe('applyMarkdownSyntax', () => {
  it('normalizes markdown alias metadata', () => {
    const html = '<pre><code class="language-md"># Title</code></pre>';
    const result = applyMarkdownSyntax(html);

    expect(result).toContain('class="syntax-block language-markdown"');
    expect(result).toContain('<code class="syntax-code language-markdown" data-language="markdown">');
  });

  it('tokenizes headings, emphasis and links', () => {
    const markdown = '<code># Heading\nSee **docs** and [guide](https://example.com)</code>';
    const result = applyMarkdownSyntax(markdown);

    expect(result).toContain('<span class="token keyword heading"># Heading</span>');
    expect(result).toContain('<span class="token keyword strong">**docs**</span>');
    expect(result).toContain('guide');
    expect(result).toContain('https');
  });

  it('wraps raw markdown in normalized pre/code tags', () => {
    const source = '# Title\n- one';
    const result = applyMarkdownSyntax(source);

    expect(result).toContain('<pre class="syntax-block language-markdown" data-language="markdown">');
    expect(result).toContain('<code class="syntax-code language-markdown" data-language="markdown">');
  });

  it('is idempotent for already-tokenized markdown blocks', () => {
    const tokenized = '<code class="language-markdown"><span class="token keyword heading"># Title</span></code>';
    const firstPass = applyMarkdownSyntax(tokenized);
    const secondPass = applyMarkdownSyntax(firstPass);

    expect(secondPass).toBe(firstPass);
  });
});
