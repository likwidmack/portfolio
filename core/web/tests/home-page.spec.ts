import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const homePagePath = join(import.meta.dirname, '../app/pages/index.vue');
const homeDataPath = join(import.meta.dirname, '../content/home.json');
const contentConfigPath = join(import.meta.dirname, '../content.config.ts');

describe('home page content', () => {
  it('loads copy from the Nuxt Content home collection', async () => {
    const homePage = await readFile(homePagePath, 'utf8');
    const homeData = await readFile(homeDataPath, 'utf8');
    const contentConfig = await readFile(contentConfigPath, 'utf8');

    expect(homePage).toContain("fetchContentCollection<HomeContent>('home'");
    expect(contentConfig).toContain("source: 'home.json'");
    expect(homeData).toContain('Tamara Mack');
    expect(homeData).toContain('Creative Technologist');
    expect(homeData).toContain('Principal & Distinguished SE');
    expect(homeData).toContain('Software Architect');
    expect(homeData).toContain('human-controlled-ai-lab');
    expect(homeData).toContain('spatial-experiences');
    expect(homeData).toContain('data-visualization');
    expect(homeData).toContain('experience-systems');
    expect(homePage).toContain("fetchContentCollection<CaseStudy[]>('caseStudies'");
    expect(homePage).toContain('AppWorkCard');
    expect(await readFile(join(import.meta.dirname, '../app/components/AppWorkCard.vue'), 'utf8')).toContain(
      'work-card__media'
    );
    expect(homePage).not.toContain('Stand-in');
    expect(homePage).not.toContain('queryCollection(');
  });
});
