/**
 * Shared utilities for safe regex tokenization passes.
 */

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isWordToken(token: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(token);
}

/**
 * Creates a regex for non-word tokens (punctuation/operators), sorted longest-first.
 */
export function createNonWordTokenRegex(tokens: ReadonlySet<string>): RegExp | null {
  const patterns = [...tokens]
    .filter(Boolean)
    .filter((token) => !isWordToken(token))
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex);

  if (!patterns.length) return null;
  return new RegExp(`(?:${patterns.join('|')})`, 'g');
}

/**
 * Creates stash/restore helpers so tokenized segments are protected during later passes.
 */
export function createTokenStash(seedSource = '') {
  const placeholders: string[] = [];
  const start = '\u0001';
  const body = '\u0002';
  const end = '\u0003';
  let baseCount = 32 + Math.floor(Math.random() * 64);
  while (seedSource.includes(`${start}${body.repeat(baseCount)}${end}`)) {
    baseCount = 32 + Math.floor(Math.random() * 64);
  }

  const stash = (value: string): string => {
    const key = `${start}${body.repeat(baseCount + placeholders.length)}${end}`;
    placeholders.push(value);
    return key;
  };

  const restoreRegex = new RegExp(`${escapeRegex(start)}(${escapeRegex(body)}+)${escapeRegex(end)}`, 'g');

  const restore = (source: string): string =>
    source.replace(restoreRegex, (_full, marks) => {
      const index = marks.length - baseCount;
      return placeholders[index] ?? '';
    });

  return { stash, restore };
}

/**
 * Wraps a token value in shared syntax-token markup.
 */
export function wrapToken(value: string, tokenClass: string): string {
  return `<span class="token ${tokenClass}">${value}</span>`;
}
