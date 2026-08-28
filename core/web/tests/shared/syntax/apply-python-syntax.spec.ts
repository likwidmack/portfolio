import { describe, expect, it } from 'vitest';

import { applyPythonSyntax } from '#shared/syntax/apply-python-syntax';

describe('applyPythonSyntax', () => {
  it('normalizes python alias metadata', () => {
    const html = '<pre><code class="language-py">def greet(name):\n  return name</code></pre>';
    const result = applyPythonSyntax(html);

    expect(result).toContain('class="syntax-block language-python"');
    expect(result).toContain('<code class="syntax-code language-python" data-language="python">');
  });

  it('tokenizes keywords, numbers and comments', () => {
    const html = '<code>for i in range(3): # loop</code>';
    const result = applyPythonSyntax(html);

    expect(result).toContain('<span class="token keyword reserved">for</span>');
    expect(result).toContain('<span class="token number">3</span>');
    expect(result).toContain('<span class="token comment"># loop</span>');
  });

  it('wraps raw source in normalized pre/code tags', () => {
    const source = 'def greet(name):\n  return name';
    const result = applyPythonSyntax(source);

    expect(result).toContain('<pre class="syntax-block language-python" data-language="python">');
    expect(result).toContain('<code class="syntax-code language-python" data-language="python">');
  });

  it('is idempotent for already-tokenized python blocks', () => {
    const tokenized =
      '<code class="language-python"><span class="token keyword reserved">return</span> <span class="token number">1</span></code>';
    const firstPass = applyPythonSyntax(tokenized);
    const secondPass = applyPythonSyntax(firstPass);

    expect(secondPass).toBe(firstPass);
  });
});
