import {
  JOURNEY_PATH_COOKIE,
  JOURNEY_SKIP_COOKIE,
  effectiveHomeLanding,
  parseSkipFlag,
} from '#shared/journey-preference';

/**
 * `/` honors skip on the first HTML response. Named middleware only — the
 * dedicated splash route must never redirect, and Nitro `server/middleware`
 * cannot read `useCookie`.
 */
export default defineNuxtRouteMiddleware(() => {
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
