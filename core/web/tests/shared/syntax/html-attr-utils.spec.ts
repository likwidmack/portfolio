import { describe, expect, it } from 'vitest';

import { getAttributeValue, setAttributeValue } from '#shared/syntax/tools/html-attr-utils';

describe('html-attr-utils', () => {
  it('does not treat data-class as class attribute', () => {
    const attrs = 'data-class="fake" id="x" class="real"';
    expect(getAttributeValue(attrs, 'class')).toBe('real');
  });

  it('adds class attribute when only data-class exists', () => {
    const attrs = 'data-class="fake" id="x"';
    const updated = setAttributeValue(attrs, 'class', 'real');
    expect(updated).toContain('data-class="fake"');
    expect(updated).toContain('class="real"');
  });
});
