import { describe, expect, it } from 'vitest';

import { applyTerminalSyntax } from '#shared/syntax/apply-terminal-syntax';

describe('applyTerminalSyntax', () => {
  it('normalizes shell alias to bash', () => {
    const html = '<pre><code class="language-shell">echo "hi"</code></pre>';
    const result = applyTerminalSyntax(html);

    expect(result).toContain('class="syntax-block language-bash"');
    expect(result).toContain('<code class="syntax-code language-bash" data-language="bash">');
  });

  it('tokenizes command keywords and vars', () => {
    const html = '<code>export PATH="$HOME/bin"</code>';
    const result = applyTerminalSyntax(html);

    expect(result).toContain('<span class="token keyword">export</span>');
    expect(result).toContain('<span class="token string">"$HOME/bin"</span>');
  });

  it('wraps raw source in normalized pre/code tags', () => {
    const source = 'echo "hello"';
    const result = applyTerminalSyntax(source);

    expect(result).toContain('<pre class="syntax-block language-bash" data-language="bash">');
    expect(result).toContain('<code class="syntax-code language-bash" data-language="bash">');
  });

  it('is idempotent for already-tokenized terminal blocks', () => {
    const tokenized =
      '<code class="language-bash"><span class="token keyword">echo</span> <span class="token string">"hello"</span></code>';
    const firstPass = applyTerminalSyntax(tokenized);
    const secondPass = applyTerminalSyntax(firstPass);

    expect(secondPass).toBe(firstPass);
  });
});
