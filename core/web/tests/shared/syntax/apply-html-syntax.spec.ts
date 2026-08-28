import { describe, expect, it } from 'vitest';

import { applyHtmlSyntax } from '#shared/syntax/apply-html-syntax';

describe('applySyntaxStylesToHtml', () => {
  it('adds syntax classes and data-language from nested code language class', () => {
    const html = '<pre><code class="language-js">const value = 1;</code></pre>';

    const result = applyHtmlSyntax(html);

    expect(result).toContain('class="syntax-block language-javascript"');
    expect(result).toContain('data-language="javascript"');
    expect(result).toContain('<code class="language-javascript">');
  });

  it('uses pre data-language as source of truth', () => {
    const html = '<pre class="foo" data-language="python"><code>print("ok")</code></pre>';

    const result = applyHtmlSyntax(html);

    expect(result).toContain('class="foo syntax-block language-python"');
    expect(result).toContain('data-language="python"');
    expect(result).toContain('<code class="language-python">print("ok")</code>');
  });

  it('normalizes markdown alias and is idempotent', () => {
    const html = '<pre class="language-md"><code># Heading</code></pre>';

    const firstPass = applyHtmlSyntax(html);
    const secondPass = applyHtmlSyntax(firstPass);

    expect(firstPass).toContain('class="syntax-block language-markdown"');
    expect(firstPass).toContain('data-language="markdown"');
    expect(secondPass).toBe(firstPass);
  });

  it('returns input unchanged when there are no pre tags', () => {
    const html = '<p>No code block here</p>';

    expect(applyHtmlSyntax(html)).toBe(html);
  });
});
