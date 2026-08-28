import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const aboutPagePath = join(import.meta.dirname, '../app/pages/about.vue');
const resumeDataPath = join(import.meta.dirname, '../content/resume.json');
const uiCardPath = join(import.meta.dirname, '../app/components/ui/UiCard.vue');
const uiTagPath = join(import.meta.dirname, '../app/components/ui/UiTag.vue');
const uiTimelinePath = join(import.meta.dirname, '../app/components/ui/UiTimeline.vue');

describe('about page content', () => {
  it('presents a combined professional story from the resume files', async () => {
    const aboutPage = await readFile(aboutPagePath, 'utf8');
    const resumeData = await readFile(resumeDataPath, 'utf8');

    expect(aboutPage).toContain("fetchContentCollection<AboutContent>('resume'");
    expect(aboutPage).not.toContain('queryCollection(');
    expect(resumeData).toContain('What I build');
    expect(resumeData).toContain('Selected experience');
    expect(resumeData).toContain('Stack I reach for');
    expect(resumeData).toContain('Nike Sport Moment Experience');
    expect(resumeData).toContain('NBCNews.com');
    expect(resumeData).toContain('Bittrex.com');
  });

  it('links only resume PDFs from the public other data folder', async () => {
    const aboutPage = await readFile(aboutPagePath, 'utf8');
    const resumeData = await readFile(resumeDataPath, 'utf8');

    expect(aboutPage).toContain('/other/data/Tamara G Mack_Resume_2026.pdf');
    expect(aboutPage).not.toContain('/other/assets/data/');
    expect(aboutPage).not.toContain('/other/data/Tamara G Mack_Frontend Developer_Remote_20260226.pdf');
    expect(resumeData).toContain('"key": "general"');
    expect(resumeData).not.toContain('"key": "seniorFullStack"');
    expect(resumeData).toContain('Role-specific variants can be shared on request');
  });

  it('uses local UI wrappers for richer About page elements', async () => {
    const aboutPage = await readFile(aboutPagePath, 'utf8');

    // The About page uses local UI wrappers for richer UX. Check for the
    // primary wrappers that appear in the page template. `UiCard` is not
    // required on this page and should not be asserted here.
    expect(aboutPage).toContain('UiButton');
    expect(aboutPage).toContain('UiTimeline');
    expect(aboutPage).toContain('UiTag');
    expect(aboutPage).not.toContain('PrimeButton');
    expect(aboutPage).not.toContain('PrimeCard');
    expect(aboutPage).not.toContain('PrimeTimeline');
    expect(aboutPage).not.toContain('PrimeTag');
  });

  it('keeps PrimeVue usage behind Vue components in the UI directory', async () => {
    const uiCard = await readFile(uiCardPath, 'utf8');
    const uiTag = await readFile(uiTagPath, 'utf8');
    const uiTimeline = await readFile(uiTimelinePath, 'utf8');

    expect(uiCard).toContain('PrimeCard');
    expect(uiTag).toContain('PrimeTag');
    expect(uiTimeline).toContain('PrimeTimeline');
  });
});
