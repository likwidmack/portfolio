import { describe, expect, it } from 'vitest';

import { applyScriptSyntax } from '#shared/syntax/apply-script-syntax';

describe('applyScriptSyntax', () => {
  it('normalizes a pre/code javascript block from alias class', () => {
    const html = '<pre><code class="language-js">const value = 1;</code></pre>';

    const result = applyScriptSyntax(html);

    expect(result).toContain('class="syntax-block language-javascript"');
    expect(result).toContain('data-language="javascript"');
    expect(result).toContain('<code class="syntax-code language-javascript" data-language="javascript">');
    expect(result).toContain('<span class="token keyword reserved">const</span>');
    expect(result).toContain('<span class="token variable identifier">value</span>');
  });

  it('keeps explicit typescript language when provided', () => {
    const html = '<pre data-language="typescript"><code>const count: number = 1;</code></pre>';

    const result = applyScriptSyntax(html);

    expect(result).toContain('class="syntax-block language-typescript"');
    expect(result).toContain('data-language="typescript"');
    expect(result).toContain('<code class="syntax-code language-typescript" data-language="typescript">');
  });

  it('infers typescript for plain source strings and wraps in pre/code', () => {
    const source = 'interface User { id: number }';

    const result = applyScriptSyntax(source);

    expect(result).toContain('<pre class="syntax-block language-typescript" data-language="typescript">');
    expect(result).toContain('<code class="syntax-code language-typescript" data-language="typescript">');
    expect(result).toContain('<span class="token keyword reserved">interface</span>');
    expect(result).toContain('<span class="token class-name identifier">User</span>');
  });

  it('normalizes standalone code tags without pre wrapper', () => {
    const html = '<code>const sum = (a, b) => a + b;</code>';

    const result = applyScriptSyntax(html);

    expect(result).toContain('<code class="syntax-code language-javascript" data-language="javascript">');
  });

  it('is idempotent for already-tokenized code blocks', () => {
    const html = '<pre><code class="language-js">const value = 1;</code></pre>';

    const firstPass = applyScriptSyntax(html);
    const secondPass = applyScriptSyntax(firstPass);

    expect(secondPass).toBe(firstPass);
    expect(secondPass).toContain('<span class="token keyword reserved">const</span>');
    expect(secondPass).toContain('<span class="token variable identifier">value</span>');
  });

  it('is idempotent for standalone tokenized code with language alias class', () => {
    const tokenizedHtml =
      '<code class="language-js"><span class="token keyword reserved">const</span> <span class="token variable identifier">value</span> = <span class="token number">1</span>;</code>';

    const firstPass = applyScriptSyntax(tokenizedHtml);
    const secondPass = applyScriptSyntax(firstPass);

    expect(firstPass).toContain('class="syntax-code language-javascript"');
    expect(firstPass).toContain('data-language="javascript"');
    expect(secondPass).toBe(firstPass);
  });

  it('does not replace user text that looks like an internal placeholder key', () => {
    const html = '<code>__TK_A__ + 1</code>';

    const result = applyScriptSyntax(html);

    expect(result).toContain('__TK_A__');
  });

  it('escapes raw html when wrapping plain source content', () => {
    const source = 'const tpl = "<span data-x=1>unsafe</span>";';

    const result = applyScriptSyntax(source);

    expect(result).toContain('&lt;span data-x=1&gt;unsafe&lt;/span&gt;');
    expect(result).not.toContain('<span data-x=1>unsafe</span>');
  });
});
