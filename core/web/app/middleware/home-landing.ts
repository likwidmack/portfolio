import {
  JOURNEY_PATH_COOKIE,
  JOURNEY_SKIP_COOKIE,
  effectiveHomeLanding,
  parseSkipFlag,
} from '#shared/journey-preference';

/**
 * `/` honors skip on the first HTML response only; in-app navigation to `/` (the header home
 * link) always shows the splash — the remembered view is the page being left, so resuming it
 * would bounce straight back. Named middleware only — the dedicated splash route must never
 * redirect, and Nitro `server/middleware` cannot read `useCookie`.
 */
export default defineNuxtRouteMiddleware(() => {
  if (import.meta.client && !useNuxtApp().isHydrating) return;
  const skipCookie = useCookie(JOURNEY_SKIP_COOKIE);
  const pathCookie = useCookie(JOURNEY_PATH_COOKIE);
  const landing = effectiveHomeLanding({
    skip: parseSkipFlag(skipCookie.value),
    previous: pathCookie.value,
  });
  if (landing.kind === 'previous') {
    return navigateTo(landing.path, { replace: true });
  }
});
