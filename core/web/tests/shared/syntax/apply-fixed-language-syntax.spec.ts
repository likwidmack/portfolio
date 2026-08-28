import { describe, expect, it, vi } from 'vitest';

import { applyFixedLanguageSyntax } from '#shared/syntax/tools/apply-fixed-language-syntax';

describe('applyFixedLanguageSyntax', () => {
  it('escapes raw html when wrapping plain source input', () => {
    const tokenize = vi.fn((codeInnerHtml: string) => codeInnerHtml);

    const result = applyFixedLanguageSyntax('print("<span>unsafe</span>")', {
      defaultLanguage: 'python',
      allowedLanguages: new Set(['python'] as const),
      tokenize,
    });

    expect(result).toContain('<pre class="syntax-block language-python" data-language="python">');
    expect(result).toContain('<code class="syntax-code language-python" data-language="python">');
    expect(result).toContain('&lt;span&gt;unsafe&lt;/span&gt;');
    expect(result).not.toContain('<span>unsafe</span>');
    expect(tokenize).toHaveBeenCalledOnce();
  });

  it('does not tokenize code blocks that already contain html tags', () => {
    const tokenize = vi.fn((codeInnerHtml: string) => `[TOK]${codeInnerHtml}[/TOK]`);

    const html = '<pre><code class="language-python">print("ok") <em>tag</em></code></pre>';
    const result = applyFixedLanguageSyntax(html, {
      defaultLanguage: 'python',
      allowedLanguages: new Set(['python'] as const),
      tokenize,
    });

    expect(result).toContain('class="syntax-block language-python"');
    expect(result).toContain('<code class="syntax-code language-python" data-language="python">');
    expect(result).toContain('<em>tag</em>');
    expect(result).not.toContain('[TOK]');
    expect(tokenize).not.toHaveBeenCalled();
  });
});
