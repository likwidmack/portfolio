import { aspectRatio, createCdnHelper, toSnakeCase } from '../src/universal.js';

describe('@tgmc/utilities universal entry', () => {
  it('exports runtime-neutral CDN, aspect-ratio, and string helpers', () => {
    expect(createCdnHelper('https://cdn.example.com').resolve('/image.png')).toBe('https://cdn.example.com/image.png');
    expect(toSnakeCase('uiAiEngineer')).toBe('ui_ai_engineer');
    expect(aspectRatio(800, 600).css).toBe('4 / 3');
  });
});
