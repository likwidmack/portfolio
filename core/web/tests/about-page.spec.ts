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
    expect(aboutPage).toContain('about-cv__sidebar');
    expect(aboutPage).toContain('about-cv__resume');
    expect(aboutPage).toContain('--portfolio-teal');
    expect(resumeData).toContain('Digital CV');
    expect(resumeData).toContain('Founder of HyperActivity');
    expect(resumeData).toContain('What I build');
    expect(resumeData).toContain('Selected experience');
    expect(resumeData).toContain('Stack I reach for');
    expect(resumeData).toContain('Nike Sport Moment Experience');
    expect(resumeData).toContain('HyperActivity LLC');
    expect(resumeData).toContain('NBCNews.com');
    expect(resumeData).toContain('Bittrex.com');
  });

  it('links only resume PDFs from the public other data folder', async () => {
    const aboutPage = await readFile(aboutPagePath, 'utf8');
    const resumeData = await readFile(resumeDataPath, 'utf8');

    expect(aboutPage).toContain('/d/Resume2026.pdf');
    expect(aboutPage).not.toContain('/d/assets/');
    expect(aboutPage).not.toContain('/d/Tamara G Mack_Frontend Developer_Remote_20260226.pdf');
    expect(resumeData).toContain('"key": "general"');
    expect(resumeData).toContain('HyperActivity LLC');
    expect(resumeData).toContain('Founder & Principal Architect');
    expect(resumeData).toContain('"period": "2022 - 2026"');
    expect(resumeData).not.toContain('"key": "seniorFullStack"');
    expect(resumeData).toContain('Role-specific variants can be shared on request');
  });

  it('uses local UI wrappers for richer About page elements', async () => {
    const aboutPage = await readFile(aboutPagePath, 'utf8');

    // Timeline/tags stay on UI wrappers; primary résumé CTA is a teal native link
    // (portfolio signal color), with UiButton only for the portfolio deck download.
    expect(aboutPage).toContain('UiButton');
    expect(aboutPage).toContain('UiTimeline');
    expect(aboutPage).toContain('UiTag');
    expect(aboutPage).toContain('AppPageNav');
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
