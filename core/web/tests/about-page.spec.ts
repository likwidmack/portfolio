import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

type ResumeContent = {
  hero: {
    eyebrow: string;
    name: string;
    role: string;
    title: string;
    lede: string;
    primaryActionLabel: string;
    secondaryActionLabel: string;
  };
  capabilitiesHeading: string;
  experienceHeading: string;
  skillsHeading: string;
  primaryResumeKey: string;
  resumes: { key: string; title: string; meta?: string }[];
  resumeDownloads: { heading: string; intro: string };
  experience: { company: string; role: string; period: string; highlights: string[] }[];
};

const aboutPagePath = join(import.meta.dirname, '../app/pages/about.vue');
const aboutStylesPath = join(import.meta.dirname, '../app/pages/about.scss');
/** Template + script (`about.vue`) and its scoped sheet (`about.scss`). */
const readAboutPage = async () =>
  (await Promise.all([aboutPagePath, aboutStylesPath].map((path) => readFile(path, 'utf8')))).join('\n');
const resumeDataPath = join(import.meta.dirname, '../content/resume.json');
const uiCardPath = join(import.meta.dirname, '../app/components/ui/UiCard.vue');
const uiTagPath = join(import.meta.dirname, '../app/components/ui/UiTag.vue');
const uiTimelinePath = join(import.meta.dirname, '../app/components/ui/UiTimeline.vue');

async function loadResumeContent(): Promise<ResumeContent> {
  return JSON.parse(await readFile(resumeDataPath, 'utf8')) as ResumeContent;
}

describe('about page content', () => {
  it('presents a combined professional story from the resume collection', async () => {
    const aboutPage = await readAboutPage();
    const resume = await loadResumeContent();

    expect(aboutPage).toContain("fetchContentCollection<AboutContent>('resume'");
    expect(aboutPage).not.toContain('queryCollection(');
    expect(aboutPage).toContain('about-cv__sidebar');
    expect(aboutPage).toContain('about-cv__resume');
    expect(aboutPage).toContain('--portfolio-teal');
    expect(aboutPage).toContain('data-fit="prose"');
    expect(aboutPage).toContain('margin-inline: auto');
    expect(aboutPage).toContain('max-width: none');
    expect(resume.hero.eyebrow.length).toBeGreaterThan(0);
    expect(resume.hero.name.length).toBeGreaterThan(0);
    expect(resume.hero.role.length).toBeGreaterThan(0);
    expect(resume.capabilitiesHeading.length).toBeGreaterThan(0);
    expect(resume.experienceHeading.length).toBeGreaterThan(0);
    expect(resume.skillsHeading.length).toBeGreaterThan(0);
    expect(resume.experience.length).toBeGreaterThan(0);
    expect(
      resume.experience.every(
        (entry) =>
          entry.company.length > 0 &&
          entry.role.length > 0 &&
          entry.period.length > 0 &&
          entry.highlights.every((line) => line.length > 0)
      )
    ).toBe(true);
  });

  it('links resume PDFs from the site profile downloads map', async () => {
    const aboutPage = await readAboutPage();
    const resume = await loadResumeContent();

    expect(aboutPage).toContain('downloads.generalResume');
    expect(aboutPage).toContain('profile.downloads.portfolioDeck');
    expect(aboutPage).toContain('useSiteProfile');
    expect(aboutPage).not.toContain('/d/assets/');
    expect(aboutPage).not.toMatch(/\/d\/Tamara[^"]+\.pdf/);
    expect(resume.primaryResumeKey.length).toBeGreaterThan(0);
    expect(resume.resumes.some((item) => item.key === resume.primaryResumeKey)).toBe(true);
    expect(resume.resumes.every((item) => item.key.length > 0 && item.title.length > 0)).toBe(true);
    expect(resume.resumes.some((item) => item.key === 'seniorFullStack')).toBe(false);
    expect(resume.resumeDownloads.intro.length).toBeGreaterThan(0);
  });

  it('uses local UI wrappers for richer About page elements', async () => {
    const aboutPage = await readAboutPage();

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

  it('keeps About hire CTAs this increment', async () => {
    const aboutPage = await readAboutPage();
    const resume = await loadResumeContent();

    expect(aboutPage).toContain('about-cv__contact');
    expect(aboutPage).toContain('contactMailto');
    expect(aboutPage).toContain('aboutContent.hero.secondaryActionLabel');
    expect(resume.hero.primaryActionLabel.length).toBeGreaterThan(0);
    expect(resume.hero.secondaryActionLabel.length).toBeGreaterThan(0);
  });
});
