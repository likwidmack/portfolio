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
    const home = JSON.parse(homeData) as {
      splash: { heading: string; doors: { id: string }[] };
    };
    expect(home.splash.heading.length).toBeGreaterThan(0);
    expect(home.splash.doors.map((door) => door.id)).toEqual(['discovery', 'process', 'exhibition']);
    expect(splash).not.toContain('Stand-in');
    expect(splash).not.toContain('queryCollection(');
  });

  it('lists Discovery, Process, Exhibition in that order and keeps previous-view off the door list', async () => {
    const splash = await readFile(splashComponentPath, 'utf8');
    const home = JSON.parse(await readFile(homeDataPath, 'utf8')) as {
      splash: { doors: { id: string }[] };
    };
    expect(home.splash.doors.map((door) => door.id)).toEqual(['discovery', 'process', 'exhibition']);
    // Doors are choices, not a sequence; resume comes first for returning visitors.
    expect(splash).toContain('ul.splash-doors');
    expect(splash).toMatch(/splash-continue[\s\S]*ul\.splash-doors[\s\S]*splash-skip/);
    expect(splash).not.toContain('splash-door__index');
    expect(splash).toContain('splash-door__scope');
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

  it('assigns canonical doors for every case-study slug without listing those slugs on splash', async () => {
    const home = JSON.parse(await readFile(homeDataPath, 'utf8')) as {
      splash: { doors: { id: string }[] };
    };
    const homeBlob = JSON.stringify(home);
    const doorIds = new Set(home.splash.doors.map((door) => door.id));

    for (const [slug, door] of Object.entries(CANONICAL_DOOR_BY_SLUG)) {
      expect(doorIds.has(door)).toBe(true);
      expect(homeBlob).not.toContain(slug);
    }
  });

  it('omits skip and previous-view when cookies are unreadable', async () => {
    const splash = await readFile(splashComponentPath, 'utf8');
    const preference = await readFile(join(import.meta.dirname, '../app/composables/useJourneyPreference.ts'), 'utf8');

    expect(preference).toContain('probeCookiesWritable');
    expect(preference).toContain('cookiesReadable');
    expect(splash).toContain('v-if="cookiesReadable && previousPath"');
    expect(splash).toContain('v-if="cookiesReadable"');
  });

  it('names the skip result and gives each door a scope line', async () => {
    const home = JSON.parse(await readFile(homeDataPath, 'utf8')) as {
      splash: { skipLabel: string; lede: string; doors: { scope?: string }[] };
    };
    expect(home.splash.skipLabel.length).toBeGreaterThan(0);
    expect(home.splash.lede).not.toContain('Viewing only');
    expect(home.splash.doors.every((door) => typeof door.scope === 'string' && door.scope.length > 0)).toBe(true);
  });

  it('keeps door hit targets and focus rings usable', async () => {
    const styles = await readFile(splashStylesPath, 'utf8');

    expect(styles).toContain('min-height: 2.75rem');
    expect(styles).toContain('&:focus-visible');
    expect(styles).toContain('.page-content.splash-page');
    // The splash scrolls like every page (no one-viewport lock); it only fills main's slack.
    expect(styles).not.toContain('overflow: hidden');
    expect(styles).not.toContain('max-height: 100%');
    expect(styles).toContain('min-height: 100%');
  });

  it('omits Get in touch and Portfolio App on splash, and gates Doors and On view on skip', async () => {
    const nav = await readFile(join(import.meta.dirname, '../app/components/AppPrimaryNav/index.vue'), 'utf8');
    const navScss = await readFile(
      join(import.meta.dirname, '../app/components/AppPrimaryNav/AppPrimaryNav.scss'),
      'utf8'
    );
    const siteScss = await readFile(join(import.meta.dirname, '../app/layouts/site.scss'), 'utf8');
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
    expect(navScss).toContain('width: 100%');
    expect(navScss).not.toContain('page-shell-max');
    expect(siteScss).toContain('> header.site-chrome');
    expect(siteScss).toContain('max-width: none');
    expect(siteScss).not.toContain('max-width: $breakpoint-tablet');
  });
});
