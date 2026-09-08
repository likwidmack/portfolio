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
    expect(homeData).toContain('Founder of HyperActivity');
    expect(homeData).toContain('get shipped.');
    expect(homeData).toContain('Interfaces built the way they');
    // Spatial redesign (Claude Design handoff, docs/packages/Portfolio design review):
    // the hero visual is the drag-to-orbit case-study ring, not the old tesseract
    // image + ambient-video figure, so those hooks no longer apply here.
    expect(homePage).toContain('title-accent');
    expect(homeData).toContain('human-controlled-ai-lab');
    expect(homeData).toContain('spatial-experiences');
    expect(homeData).toContain('data-visualization');
    expect(homeData).toContain('experience-systems');
    expect(homeData).toContain('Design systems');
    expect(homePage).toContain('view-all-link');
    expect(homePage).toContain("fetchContentCollection<CaseStudy[]>('caseStudies'");
    // The orbit ring and Selected Proof grid replace AppWorkCard on Home, but both
    // still resolve real case-study media through the shared helper.
    expect(homePage).toContain('getCaseStudyCardMedia');
    expect(homePage).toContain('orbit-card');
    expect(homePage).toContain('proof-card');
    expect(homePage).not.toContain('Stand-in');
    expect(homePage).not.toContain('queryCollection(');
  });
});
