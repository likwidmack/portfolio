import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..');
const middlewarePath = join(root, 'app/middleware/home-landing.ts');
const pluginPath = join(root, 'app/plugins/remember-journey.client.ts');
const composablePath = join(root, 'app/composables/useJourneyPreference.ts');
const homePagePath = join(root, 'app/pages/index.vue');
const splashPagePath = join(root, 'app/pages/splash.vue');
const workSlugPath = join(root, 'app/pages/work/[slug].vue');

describe('home landing routing', () => {
  it('redirects `/` from skip plus valid previous via route middleware, not onMounted', async () => {
    const middleware = await readFile(middlewarePath, 'utf8');
    const homePage = await readFile(homePagePath, 'utf8');

    expect(homePage).toContain("middleware: 'home-landing'");
    expect(middleware).toContain('effectiveHomeLanding');
    expect(middleware).toContain('navigateTo(landing.path, { replace: true })');
    expect(middleware).toContain('defineNuxtRouteMiddleware');
    expect(middleware).not.toContain('onMounted');
    expect(middleware).not.toContain('@tgmc/utilities/browser');
    expect(middleware).not.toContain('storage-service');
  });

  it('keeps `/splash` and interior first beats free of skip redirects', async () => {
    const splashPage = await readFile(splashPagePath, 'utf8');
    const workSlug = await readFile(workSlugPath, 'utf8');
    const middleware = await readFile(middlewarePath, 'utf8');

    expect(splashPage).not.toContain('home-landing');
    expect(workSlug).not.toContain('home-landing');
    expect(middleware).not.toContain('SPLASH_PATH');
  });

  it('remembers interiors from client fullPath through the storage cookie driver', async () => {
    const plugin = await readFile(pluginPath, 'utf8');
    const composable = await readFile(composablePath, 'utf8');

    expect(plugin).toContain('remember-journey');
    expect(plugin).toContain('route.fullPath');
    expect(plugin).toContain('rememberCurrentView');
    expect(composable).toContain("await import('../../services/storage/storage-service')");
    expect(composable).toContain('const canonical = previousViewIfValid(fullPath)');
    expect(composable).toContain('pathCookie.value = canonical');
    expect(composable).toContain('writeJourneyPreviousView(storage, canonical)');
    expect(composable).toContain('writeJourneySkip(storage, value)');
    expect(composable).not.toContain('pathCookie.value = fullPath');
    expect(composable).toContain('getCurrentInstance()');
  });
});
