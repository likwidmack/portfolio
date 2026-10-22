// @vitest-environment node

import { describe, expect, it } from 'vitest';

import { applySyntaxByLanguage } from '../shared/syntax/tools/apply-syntax-by-language';
import { escapeHtmlText } from '../shared/syntax/tools/code-block-utils';

/** Render highlighted HTML the way a browser would read it back as text. */
function visibleText(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function highlight(language: string, code: string): string {
  const block = `<pre class="syntax-block language-${language}" data-language="${language}"><code class="syntax-code language-${language}">${escapeHtmlText(code)}</code></pre>`;
  return applySyntaxByLanguage(language, block);
}

// Regression: tokenizers ran on escaped text, so `=>` rendered as a literal "=&gt;" and `&&` as "&amp;&amp;".
const CASES: Array<[string, string]> = [
  [
    'typescript',
    'return posts.filter((post) => a(post) && b(post) || c < d >= e);\nconst x: Array<string> = [];\n// a => b\nconst s = "<b> & </b>";',
  ],
  ['javascript', 'const ok = a >= 1 && b <= 2 ? "x" : \'<y>\';'],
  ['python', 'if a <= b and c >= d: print("x & y")  # a -> b'],
  ['scss', '.a > .b { width: calc(100% - 2px); } // x & y\n.c { &:hover { color: red; } }'],
  ['bash', 'echo "a" > out.txt && cat out.txt | grep "<x>" # a > b'],
  ['cpp', 'if (a < b && c > d) { std::cout << "x & y"; } // a -> b'],
];

describe('syntax highlighter HTML entities', () => {
  for (const [language, code] of CASES) {
    it(`${language}: every character is escaped exactly once`, () => {
      const html = highlight(language, code);
      // No entity split across tokens, and no double-escaped entity.
      expect(html).not.toMatch(/&amp;(?:amp|lt|gt|quot|#39);/);
      expect(html).not.toMatch(/&<\/span>|>gt<|>lt<|>amp</);
      // No raw `<`/`>`/`&` outside of tags/entities.
      expect(html.replace(/<\/?[a-z][^>]*>/gi, '')).not.toMatch(/[<>]|&(?!(?:amp|lt|gt|quot|#39);)/);
      expect(visibleText(html)).toBe(code);
    });
  }

  it('still tokenizes operators as whole tokens', () => {
    const html = highlight('typescript', 'a => b && c');
    expect(html).toContain('<span class="token operator">=&gt;</span>');
    expect(html).toContain('<span class="token operator">&amp;&amp;</span>');
  });
});
