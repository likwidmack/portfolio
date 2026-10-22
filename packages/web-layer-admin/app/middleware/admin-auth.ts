/** Named middleware for token-gated admin pages: `definePageMeta({ middleware: 'admin-auth' })`. */
import { useAdminSession } from '../composables/useAdminSession';
import { adminAuthRedirect, isAdminSignInPath } from '../utils/admin-auth-redirect';

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server || isAdminSignInPath(to.path)) return;
  const target = adminAuthRedirect({
    path: to.fullPath,
    signedIn: useAdminSession().signedIn.value,
    writesEnabled: Boolean(useRuntimeConfig().public.adminWritesEnabled),
  });
  if (target) return navigateTo(target);
});
