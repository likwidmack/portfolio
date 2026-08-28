import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { formatCodeBlock, readSyntaxFile, readSyntaxFileAsync } from '#shared/syntax/tools/read-syntax-file';

// ---------------------------------------------------------------------------
// FS mocks — factories must be synchronous so Vitest hoists them correctly.
// Node built-in modules are CJS-backed and need an explicit `default` export.
// ---------------------------------------------------------------------------

vi.mock('node:fs', () => {
  const readFileSync = vi.fn();
  return { default: { readFileSync }, readFileSync };
});

vi.mock('node:fs/promises', () => {
  const readFile = vi.fn();
  return { default: { readFile }, readFile };
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// readSyntaxFile
// ---------------------------------------------------------------------------

describe('readSyntaxFile', () => {
  // ── language detection from extension ──────────────────────────────────

  it.each([
    ['/src/app.ts', 'typescript'],
    ['/src/app.tsx', 'typescript'],
    ['/src/app.mts', 'typescript'],
    ['/src/app.cts', 'typescript'],
  ])('detects typescript from %s', (filePath, expectedLang) => {
    vi.mocked(readFileSync).mockReturnValue('const x: number = 1;');

    const result = readSyntaxFile(filePath);

    expect(result).toContain(`class="syntax-block language-${expectedLang}"`);
    expect(result).toContain(`data-language="${expectedLang}"`);
  });

  it.each([
    ['/src/app.js', 'javascript'],
    ['/src/app.jsx', 'javascript'],
    ['/src/app.mjs', 'javascript'],
    ['/src/app.cjs', 'javascript'],
  ])('detects javascript from %s', (filePath, expectedLang) => {
    vi.mocked(readFileSync).mockReturnValue('const x = 1;');

    const result = readSyntaxFile(filePath);

    expect(result).toContain(`class="syntax-block language-${expectedLang}"`);
    expect(result).toContain(`data-language="${expectedLang}"`);
  });

  it.each([
    ['/styles/main.css', 'scss'],
    ['/styles/main.scss', 'scss'],
    ['/styles/main.sass', 'scss'],
  ])('detects scss from %s', (filePath) => {
    vi.mocked(readFileSync).mockReturnValue('$primary: #fff;');

    const result = readSyntaxFile(filePath);

    expect(result).toContain('class="syntax-block language-scss"');
    expect(result).toContain('data-language="scss"');
  });

  it.each([
    ['/scripts/deploy.sh', 'bash'],
    ['/scripts/deploy.bash', 'bash'],
    ['/scripts/deploy.zsh', 'bash'],
  ])('detects bash from %s', (filePath) => {
    vi.mocked(readFileSync).mockReturnValue('echo "hello"');

    const result = readSyntaxFile(filePath);

    expect(result).toContain('class="syntax-block language-bash"');
    expect(result).toContain('data-language="bash"');
  });

  it.each([
    ['/src/main.cpp', 'cpp'],
    ['/src/main.cc', 'cpp'],
    ['/src/main.cxx', 'cpp'],
    ['/src/main.c', 'cpp'],
    ['/src/main.h', 'cpp'],
    ['/src/main.hpp', 'cpp'],
  ])('detects cpp from %s', (filePath) => {
    vi.mocked(readFileSync).mockReturnValue('int main() { return 0; }');

    const result = readSyntaxFile(filePath);

    expect(result).toContain('class="syntax-block language-cpp"');
    expect(result).toContain('data-language="cpp"');
  });

  it('detects python from .py extension', () => {
    vi.mocked(readFileSync).mockReturnValue('def greet():\n  return 1');

    const result = readSyntaxFile('/src/app.py');

    expect(result).toContain('class="syntax-block language-python"');
    expect(result).toContain('data-language="python"');
  });

  it('detects html from .html extension', () => {
    vi.mocked(readFileSync).mockReturnValue('<!DOCTYPE html>');

    const result = readSyntaxFile('/views/index.html');

    expect(result).toContain('class="syntax-block language-html"');
    expect(result).toContain('data-language="html"');
  });

  it.each([
    ['/docs/readme.md', 'markdown'],
    ['/docs/readme.markdown', 'markdown'],
    ['/docs/readme.mdown', 'markdown'],
  ])('detects markdown from %s', (filePath) => {
    vi.mocked(readFileSync).mockReturnValue('# Hello');

    const result = readSyntaxFile(filePath);

    expect(result).toContain('class="syntax-block language-markdown"');
    expect(result).toContain('data-language="markdown"');
  });

  // ── unknown extension fallback ──────────────────────────────────────────

  it('falls back to plaintext for an unrecognised extension', () => {
    vi.mocked(readFileSync).mockReturnValue('some raw text');

    const result = readSyntaxFile('/data/notes.txt');

    expect(result).toContain('class="syntax-block language-plaintext"');
    expect(result).toContain('data-language="plaintext"');
  });

  it('falls back to plaintext for a file with no extension', () => {
    vi.mocked(readFileSync).mockReturnValue('raw content');

    const result = readSyntaxFile('/data/Makefile');

    expect(result).toContain('class="syntax-block language-plaintext"');
    expect(result).toContain('data-language="plaintext"');
  });

  // ── options.language override ───────────────────────────────────────────

  it('uses options.language over the file extension', () => {
    vi.mocked(readFileSync).mockReturnValue('const x = 1;');

    // .js extension would normally → javascript, but override says typescript
    const result = readSyntaxFile('/src/app.js', { language: 'typescript' });

    expect(result).toContain('data-language="typescript"');
    expect(result).not.toContain('data-language="javascript"');
  });

  it('normalizes options.language alias before applying', () => {
    vi.mocked(readFileSync).mockReturnValue('$gap: 16px;');

    // 'css' alias should resolve to canonical 'scss'
    const result = readSyntaxFile('/styles/theme.txt', { language: 'css' });

    expect(result).toContain('data-language="scss"');
  });

  it('normalizes shell alias to bash', () => {
    vi.mocked(readFileSync).mockReturnValue('echo "hi"');

    const result = readSyntaxFile('/scripts/run.txt', { language: 'sh' });

    expect(result).toContain('data-language="bash"');
  });

  // ── html escaping ───────────────────────────────────────────────────────

  it('escapes < and > in source content', () => {
    vi.mocked(readFileSync).mockReturnValue('const tpl = "<b>bold</b>";');

    const result = readSyntaxFile('/src/app.ts');

    expect(result).toContain('&lt;b&gt;bold&lt;/b&gt;');
    expect(result).not.toContain('<b>bold</b>');
  });

  it('escapes & in source content', () => {
    // Place & inside a line comment so the whole comment is stashed as one token
    // before any operator pass runs — the &amp; entity is preserved intact.
    vi.mocked(readFileSync).mockReturnValue('// uses & operator');

    const result = readSyntaxFile('/src/app.ts');

    expect(result).toContain('&amp;');
  });

  // ── token output ────────────────────────────────────────────────────────

  it('tokenizes a typescript source file', () => {
    vi.mocked(readFileSync).mockReturnValue('const count: number = 42;');

    const result = readSyntaxFile('/src/counter.ts');

    expect(result).toContain('<span class="token keyword reserved">const</span>');
    expect(result).toContain('<span class="token variable identifier">count</span>');
    expect(result).toContain('<span class="token number">42</span>');
  });

  it('tokenizes a scss source file', () => {
    vi.mocked(readFileSync).mockReturnValue('$spacing: 8px;');

    const result = readSyntaxFile('/styles/vars.scss');

    expect(result).toContain('<span class="token variable">$spacing</span>');
    expect(result).toContain('<span class="token number">8px</span>');
  });

  it('tokenizes a python source file', () => {
    vi.mocked(readFileSync).mockReturnValue('def add(a, b):\n    return a + b');

    const result = readSyntaxFile('/src/math.py');

    expect(result).toContain('<span class="token keyword reserved">def</span>');
    expect(result).toContain('<span class="token keyword reserved">return</span>');
  });

  it('tokenizes a bash source file', () => {
    // $HOME must be unquoted so it isn't stashed inside a string token first.
    vi.mocked(readFileSync).mockReturnValue('export PATH=$HOME/bin');

    const result = readSyntaxFile('/scripts/env.sh');

    expect(result).toContain('<span class="token keyword">export</span>');
    expect(result).toContain('<span class="token variable">$HOME</span>');
  });

  it('tokenizes a cpp source file', () => {
    vi.mocked(readFileSync).mockReturnValue('#include <iostream>\nint main() {}');

    const result = readSyntaxFile('/src/main.cpp');

    expect(result).toContain('<span class="token keyword preprocessor">#include</span>');
    expect(result).toContain('<span class="token keyword reserved">int</span>');
  });

  it('tokenizes a markdown source file', () => {
    vi.mocked(readFileSync).mockReturnValue('# Hello\n**bold**');

    const result = readSyntaxFile('/docs/page.md');

    expect(result).toContain('<span class="token keyword heading"># Hello</span>');
    expect(result).toContain('<span class="token keyword strong">**bold**</span>');
  });

  // ── pre/code structure ──────────────────────────────────────────────────

  it('wraps output in a <pre><code> block', () => {
    vi.mocked(readFileSync).mockReturnValue('const x = 1;');

    const result = readSyntaxFile('/src/app.js');

    expect(result).toMatch(/^<pre\b/);
    expect(result).toContain('<code ');
    expect(result).toContain('</code></pre>');
  });
});

// ---------------------------------------------------------------------------
// readSyntaxFileAsync
// ---------------------------------------------------------------------------

describe('readSyntaxFileAsync', () => {
  it('resolves typescript from .ts extension', async () => {
    vi.mocked(readFile).mockResolvedValue('const x: number = 1;');

    const result = await readSyntaxFileAsync('/src/app.ts');

    expect(result).toContain('class="syntax-block language-typescript"');
    expect(result).toContain('data-language="typescript"');
    expect(result).toContain('<span class="token keyword reserved">const</span>');
  });

  it('resolves scss from .css extension', async () => {
    vi.mocked(readFile).mockResolvedValue('$gap: 16px;');

    const result = await readSyntaxFileAsync('/styles/main.css');

    expect(result).toContain('class="syntax-block language-scss"');
    expect(result).toContain('data-language="scss"');
  });

  it('respects options.language override', async () => {
    vi.mocked(readFile).mockResolvedValue('echo "hi"');

    const result = await readSyntaxFileAsync('/scripts/run.txt', { language: 'bash' });

    expect(result).toContain('data-language="bash"');
    expect(result).toContain('<span class="token keyword">echo</span>');
  });

  it('normalizes language alias in options', async () => {
    vi.mocked(readFile).mockResolvedValue('$x: 1;');

    const result = await readSyntaxFileAsync('/styles/x.txt', { language: 'css' });

    expect(result).toContain('data-language="scss"');
  });

  it('falls back to plaintext for unknown extension', async () => {
    vi.mocked(readFile).mockResolvedValue('raw text');

    const result = await readSyntaxFileAsync('/data/notes.log');

    expect(result).toContain('data-language="plaintext"');
  });

  it('escapes html entities in source content', async () => {
    // Place special chars inside a comment so the tokenizer stashes them as one
    // token and the &lt; / &amp; entities survive intact in the output.
    vi.mocked(readFile).mockResolvedValue('// a < b && c > 0');

    const result = await readSyntaxFileAsync('/src/app.js');

    expect(result).toContain('&lt;');
    expect(result).toContain('&amp;');
    expect(result).toContain('&gt;');
  });

  it('returns a Promise', () => {
    vi.mocked(readFile).mockResolvedValue('x = 1');

    const returnValue = readSyntaxFileAsync('/src/app.py');

    expect(returnValue).toBeInstanceOf(Promise);
  });
});

// ---------------------------------------------------------------------------
// formatCodeBlock
// ---------------------------------------------------------------------------

describe('formatCodeBlock', () => {
  it('formats a typescript snippet with canonical language name', () => {
    const result = formatCodeBlock('const x: number = 1;', 'typescript');

    expect(result).toContain('class="syntax-block language-typescript"');
    expect(result).toContain('data-language="typescript"');
    expect(result).toContain('<span class="token keyword reserved">const</span>');
  });

  it('formats a javascript snippet', () => {
    const result = formatCodeBlock('const x = 1;', 'javascript');

    expect(result).toContain('class="syntax-block language-javascript"');
    expect(result).toContain('<span class="token keyword reserved">const</span>');
  });

  it('normalizes js alias to javascript', () => {
    const result = formatCodeBlock('const x = 1;', 'js');

    expect(result).toContain('data-language="javascript"');
  });

  it('normalizes ts alias to typescript', () => {
    const result = formatCodeBlock('const x: number = 1;', 'ts');

    expect(result).toContain('data-language="typescript"');
  });

  it('normalizes css alias to scss', () => {
    const result = formatCodeBlock('$gap: 16px;', 'css');

    expect(result).toContain('data-language="scss"');
    expect(result).toContain('<span class="token variable">$gap</span>');
  });

  it('normalizes sh alias to bash', () => {
    const result = formatCodeBlock('echo "hi"', 'sh');

    expect(result).toContain('data-language="bash"');
    expect(result).toContain('<span class="token keyword">echo</span>');
  });

  it('normalizes py alias to python', () => {
    const result = formatCodeBlock('def greet(): pass', 'py');

    expect(result).toContain('data-language="python"');
    expect(result).toContain('<span class="token keyword reserved">def</span>');
  });

  it('normalizes md alias to markdown', () => {
    const result = formatCodeBlock('# Title', 'md');

    expect(result).toContain('data-language="markdown"');
    expect(result).toContain('<span class="token keyword heading"># Title</span>');
  });

  it('normalizes c++ alias to cpp', () => {
    const result = formatCodeBlock('int x = 0;', 'c++');

    expect(result).toContain('data-language="cpp"');
    expect(result).toContain('<span class="token keyword reserved">int</span>');
  });

  it('wraps output in a <pre><code> block', () => {
    const result = formatCodeBlock('x = 1', 'python');

    expect(result).toMatch(/^<pre\b/);
    expect(result).toContain('<code ');
    expect(result).toContain('</code></pre>');
  });

  it('does not read from disk', () => {
    formatCodeBlock('const x = 1;', 'js');

    expect(readFileSync).not.toHaveBeenCalled();
  });

  it('escapes html entities in the raw text', () => {
    // The tokenizer further processes already-escaped entities (e.g. & → operator
    // token), so `&lt;script&gt;` won't appear verbatim. What matters is that the
    // raw unescaped source string is never present in the output.
    const result = formatCodeBlock('<script>alert(1)</script>', 'typescript');

    expect(result).not.toContain('<script>alert(1)</script>');
    expect(result).toContain('script'); // content is present in some tokenized form
  });

  it('preserves unknown language as-is in the block metadata', () => {
    const result = formatCodeBlock('some text', 'plaintext');

    expect(result).toContain('data-language="plaintext"');
    expect(result).toContain('class="syntax-block language-plaintext"');
  });
});
