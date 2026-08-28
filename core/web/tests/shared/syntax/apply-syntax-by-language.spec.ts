import { describe, expect, it } from 'vitest';

import { applySyntaxByLanguage } from '#shared/syntax/tools/apply-syntax-by-language';

describe('applySyntaxByLanguage', () => {
  it.each([
    ['js', '<code>const value = 1;</code>', 'language-javascript'],
    ['ts', '<code>interface User { id: number }</code>', 'language-typescript'],
    ['css', '<code>$gap: 16px;</code>', 'language-scss'],
    ['py', '<code>def greet():\n  return 1</code>', 'language-python'],
    ['sh', '<code>echo "hello"</code>', 'language-bash'],
    ['md', '<code># Heading</code>', 'language-markdown'],
    ['c++', '<code>int value = 7;</code>', 'language-cpp'],
  ])('routes %s alias to expected normalized language', (alias, html, expectedLanguageClass) => {
    const result = applySyntaxByLanguage(alias, html);
    expect(result).toContain(expectedLanguageClass);
  });

  it('routes script aliases to script syntax', () => {
    const html = '<code class="language-js">const value = 1;</code>';
    const result = applySyntaxByLanguage('js', html);

    expect(result).toContain('language-javascript');
    expect(result).toContain('<span class="token keyword reserved">const</span>');
  });

  it('routes css alias to style syntax', () => {
    const html = '<code class="language-css">$gap: 16px;</code>';
    const result = applySyntaxByLanguage('css', html);

    expect(result).toContain('language-scss');
    expect(result).toContain('<span class="token variable">$gap</span>');
  });

  it('routes shell alias to terminal syntax', () => {
    const html = '<code class="language-shell">export PATH="$HOME/bin"</code>';
    const result = applySyntaxByLanguage('shell', html);

    expect(result).toContain('language-bash');
    expect(result).toContain('<span class="token keyword">export</span>');
  });

  it('routes c++ alias to cpp syntax', () => {
    const html = '<code>int value = 7;</code>';
    const result = applySyntaxByLanguage('c++', html);

    expect(result).toContain('language-cpp');
    expect(result).toContain('<span class="token keyword reserved">int</span>');
  });

  it('routes mdown alias to markdown syntax', () => {
    const html = '<code># Heading</code>';
    const result = applySyntaxByLanguage('mdown', html);

    expect(result).toContain('language-markdown');
    expect(result).toContain('<span class="token keyword heading"># Heading</span>');
  });

  it('handles null language by falling back to html syntax', () => {
    const html = '<pre><code class="language-js">const value = 1;</code></pre>';
    const result = applySyntaxByLanguage(null, html);

    expect(result).toContain('class="syntax-block language-javascript"');
    expect(result).toContain('data-language="javascript"');
  });

  it('falls back to html syntax for unknown language', () => {
    const html = '<pre><code class="language-unknown">x</code></pre>';
    const result = applySyntaxByLanguage('unknown', html);

    expect(result).toContain('class="syntax-block language-unknown"');
    expect(result).toContain('data-language="unknown"');
  });
});
