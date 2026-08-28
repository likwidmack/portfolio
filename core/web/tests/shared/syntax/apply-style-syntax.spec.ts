import { describe, expect, it } from 'vitest';

import { applyStyleSyntax } from '#shared/syntax/apply-style-syntax';

describe('applyStyleSyntax', () => {
  it('normalizes css alias to scss language metadata', () => {
    const html = '<pre><code class="language-css">$gap: 16px;</code></pre>';
    const result = applyStyleSyntax(html);

    expect(result).toContain('class="syntax-block language-scss"');
    expect(result).toContain('data-language="scss"');
    expect(result).toContain('<code class="syntax-code language-scss" data-language="scss">');
  });

  it('tokenizes variables and values', () => {
    const html = '<code>$primary: #fff; padding: 12px;</code>';
    const result = applyStyleSyntax(html);

    expect(result).toContain('<span class="token variable">$primary</span>');
    expect(result).toContain('<span class="token number">#fff</span>');
    expect(result).toContain('<span class="token number">12px</span>');
  });

  it('wraps raw source in normalized pre/code tags', () => {
    const source = '$spacing: 8px;';
    const result = applyStyleSyntax(source);

    expect(result).toContain('<pre class="syntax-block language-scss" data-language="scss">');
    expect(result).toContain('<code class="syntax-code language-scss" data-language="scss">');
  });

  it('is idempotent for already-tokenized style blocks', () => {
    const tokenized =
      '<code class="language-scss"><span class="token variable">$spacing</span>: <span class="token number">8px</span>;</code>';
    const firstPass = applyStyleSyntax(tokenized);
    const secondPass = applyStyleSyntax(firstPass);

    expect(secondPass).toBe(firstPass);
  });
});
