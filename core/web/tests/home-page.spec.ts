import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  CANONICAL_DOOR_BY_SLUG,
  DISCOVERY_FIRST_BEAT,
  EXHIBITION_FIRST_BEAT,
  PROCESS_FIRST_BEAT,
} from '../shared/journey-preference';

const homePagePath = join(import.meta.dirname, '../app/pages/index.vue');
const splashPagePath = join(import.meta.dirname, '../app/pages/splash.vue');
const splashComponentPath = join(import.meta.dirname, '../app/components/AppSplash/index.vue');
const splashStylesPath = join(import.meta.dirname, '../app/pages/index.scss');
const homeDataPath = join(import.meta.dirname, '../content/home.json');
const contentConfigPath = join(import.meta.dirname, '../content.config.ts');
const preferencePath = join(import.meta.dirname, '../shared/journey-preference.ts');
const employerNames = ['HyperActivity', 'Nike', 'Amazon', 'Microsoft', 'Google'];

describe('home splash content', () => {
  it('loads copy from the Nuxt Content home collection', async () => {
    const homePage = await readFile(homePagePath, 'utf8');
    const splashPage = await readFile(splashPagePath, 'utf8');
    const splash = await readFile(splashComponentPath, 'utf8');
    const homeData = await readFile(homeDataPath, 'utf8');
    const contentConfig = await readFile(contentConfigPath, 'utf8');

    expect(homePage).toContain('AppSplash');
    expect(homePage).toContain("middleware: 'home-landing'");
    expect(splashPage).toContain('AppSplash');
    expect(splashPage).not.toContain('home-landing');
    expect(splash).toContain("fetchContentCollection<HomeContent>('home'");
    expect(contentConfig).toContain("source: 'home.json'");
    expect(homeData).toContain('Choose a way in');
    expect(splash).not.toContain('Stand-in');
    expect(splash).not.toContain('queryCollection(');
  });

  it('lists Discovery, Process, Exhibition in that order and keeps previous-view off the door list', async () => {
    const splash = await readFile(splashComponentPath, 'utf8');
    const homeData = await readFile(homeDataPath, 'utf8');
    const discovery = homeData.indexOf('"id": "discovery"');
    const process = homeData.indexOf('"id": "process"');
    const exhibition = homeData.indexOf('"id": "exhibition"');

    expect(discovery).toBeGreaterThan(-1);
    expect(process).toBeGreaterThan(discovery);
    expect(exhibition).toBeGreaterThan(process);
    expect(splash).toContain('ol.splash-doors');
    expect(splash).toMatch(/ol\.splash-doors[\s\S]*splash-continue[\s\S]*splash-skip/);
    expect(splash).toContain('cookiesReadable && previousPath');
    expect(splash).not.toContain('AppWorkCard');
  });

  it('points doors at first beats, not work/process/gallery indexes', async () => {
    const splash = await readFile(splashComponentPath, 'utf8');
    const preference = await readFile(preferencePath, 'utf8');

    expect(splash).toContain('firstBeatHref(door.id)');
    expect(splash).not.toContain('to="/work"');
    expect(splash).not.toContain('to="/process"');
    expect(splash).not.toContain('to="/gallery"');
    expect(preference).toContain(`export const DISCOVERY_FIRST_BEAT = '${DISCOVERY_FIRST_BEAT}'`);
    expect(preference).toContain(`export const PROCESS_FIRST_BEAT = '${PROCESS_FIRST_BEAT}'`);
    expect(preference).toContain(`export const EXHIBITION_FIRST_BEAT = '${EXHIBITION_FIRST_BEAT}'`);
  });

  it('omits availability, Download CV, and Start a conversation', async () => {
    const splash = await readFile(splashComponentPath, 'utf8');
    const homeData = await readFile(homeDataPath, 'utf8');
    const blob = `${splash}\n${homeData}`;

    expect(blob).not.toContain('Download CV');
    expect(blob).not.toContain('Start a conversation');
    expect(blob).not.toContain('Available for principal');
    expect(blob).not.toContain('contactMailto');
    expect(homeData).not.toContain('featuredWork');
  });

  it('does not use employer names on splash labels', async () => {
    const splash = await readFile(splashComponentPath, 'utf8');
    const homeData = await readFile(homeDataPath, 'utf8');
    const blob = `${splash}\n${homeData}`;

    for (const name of employerNames) {
      expect(blob).not.toContain(name);
    }
  });

  it('assigns canonical doors for the six slugs without listing them on splash', async () => {
    const homeData = await readFile(homeDataPath, 'utf8');

    expect(CANONICAL_DOOR_BY_SLUG['media-systems']).toBe('discovery');
    expect(CANONICAL_DOOR_BY_SLUG['data-visualization']).toBe('discovery');
    expect(CANONICAL_DOOR_BY_SLUG['experience-systems']).toBe('discovery');
    expect(CANONICAL_DOOR_BY_SLUG['human-controlled-ai-lab']).toBe('process');
    expect(CANONICAL_DOOR_BY_SLUG['innovation-prototyping']).toBe('exhibition');
    expect(CANONICAL_DOOR_BY_SLUG['spatial-experiences']).toBe('exhibition');
    expect(homeData).not.toContain('human-controlled-ai-lab');
    expect(homeData).not.toContain('innovation-prototyping');
  });

  it('omits skip and previous-view when cookies are unreadable', async () => {
    const splash = await readFile(splashComponentPath, 'utf8');
    const preference = await readFile(join(import.meta.dirname, '../app/composables/useJourneyPreference.ts'), 'utf8');

    expect(preference).toContain('probeCookiesWritable');
    expect(preference).toContain('cookiesReadable');
    expect(splash).toContain('v-if="cookiesReadable && previousPath"');
    expect(splash).toContain('v-if="cookiesReadable"');
  });

  it('keeps door hit targets and focus rings usable', async () => {
    const styles = await readFile(splashStylesPath, 'utf8');

    expect(styles).toContain('min-height: 2.75rem');
    expect(styles).toContain('&:focus-visible');
  });

  it('omits Get in touch and Portfolio App on splash, and gates Doors and On view on skip', async () => {
    const nav = await readFile(join(import.meta.dirname, '../app/components/AppPrimaryNav/index.vue'), 'utf8');
    const seo = await readFile(join(import.meta.dirname, '../app/composables/usePortfolioSeo.ts'), 'utf8');
    const homeData = await readFile(homeDataPath, 'utf8');

    expect(homeData).not.toContain('Portfolio App');
    expect(seo).toContain("titleTemplate: isSplashPath(input.path) ? '%s' : undefined");
    expect(nav).toContain('v-if="showContact"');
    expect(nav).toContain('Get in touch');
    expect(nav).toContain('v-if="showDoors"');
    expect(nav).toContain('Doors');
    expect(nav).toContain(':to="splashPath"');
    expect(nav).toContain('v-if="showOnView"');
    expect(nav).toContain('primary-nav__on-view');
    expect(nav).toContain(':to="onViewPath"');
    expect(nav).toContain('ON_VIEW_ACCESSIBLE_NAME');
    expect(nav).toContain(':aria-label="onViewName"');
    expect(nav).toContain('showDoors = computed(() => skip.value)');
    expect(nav).toContain('showOnView = computed(() => skip.value)');
    expect(nav).toContain('showContact = computed(() => !isSplash.value)');
  });
});
