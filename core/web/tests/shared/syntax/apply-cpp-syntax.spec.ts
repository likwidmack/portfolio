import { describe, expect, it } from 'vitest';

import { applyCppSyntax } from '#shared/syntax/apply-cpp-syntax';

describe('applyCppSyntax', () => {
  it('normalizes cplusplus alias to cpp', () => {
    const html = '<pre><code class="language-cplusplus">int main() { return 0; }</code></pre>';
    const result = applyCppSyntax(html);

    expect(result).toContain('class="syntax-block language-cpp"');
    expect(result).toContain('<code class="syntax-code language-cpp" data-language="cpp">');
  });

  it('tokenizes cpp keywords, numbers and comments', () => {
    const html = '<code>// note\nint value = 42;</code>';
    const result = applyCppSyntax(html);

    expect(result).toContain('<span class="token comment">// note</span>');
    expect(result).toContain('<span class="token keyword reserved">int</span>');
    expect(result).toContain('<span class="token number">42</span>');
  });

  it('wraps raw source in normalized pre/code tags', () => {
    const source = 'int main() { return 0; }';
    const result = applyCppSyntax(source);

    expect(result).toContain('<pre class="syntax-block language-cpp" data-language="cpp">');
    expect(result).toContain('<code class="syntax-code language-cpp" data-language="cpp">');
  });

  it('is idempotent for already-tokenized cpp blocks', () => {
    const tokenized =
      '<code class="language-cpp"><span class="token keyword reserved">int</span> <span class="token number">7</span></code>';
    const firstPass = applyCppSyntax(tokenized);
    const secondPass = applyCppSyntax(firstPass);

    expect(secondPass).toBe(firstPass);
  });
});
