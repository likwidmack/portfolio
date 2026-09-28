<template lang="pug">
.primary-nav.layout(data-algo="cluster")
  NuxtLink.primary-nav__brand(to="/", :aria-label="`${profile.names.casual} home`")
    strong TM
    span {{ profile.names.signature }}
  nav.primary-nav__inline(aria-label="Primary")
    NuxtLink(v-for="item in navItems", :key="item.to", :to="item.to", :aria-current="item.active ? 'page' : undefined") {{ item.label }}
  .primary-nav__actions
    span.app-env-chip(v-if="envChip.show", :aria-label="envChip.ariaLabel") {{ envChip.label }}
    NuxtLink.primary-nav__on-view(v-if="showOnView", :to="onViewPath", :aria-label="onViewName") On view
    button.primary-nav__personalize(
      type="button",
      aria-label="Personalize theme and background",
      @click="openPersonalize"
    )
      svg(
        width="18",
        height="18",
        viewBox="0 0 24 24",
        fill="none",
        stroke="currentColor",
        stroke-width="2",
        aria-hidden="true"
      )
        circle(cx="12", cy="12", r="9")
        path(d="M12 3a9 9 0 0 1 0 18z", fill="currentColor")
    a.primary-nav__contact(v-if="showContact", :href="contactMailto", @click="onContactClick") Get in touch
    button.primary-nav__menu-trigger(
      type="button",
      :aria-expanded="menuOpen ? 'true' : 'false'",
      aria-controls="primary-nav-panel",
      aria-label="Toggle navigation menu",
      @click.stop="toggleMenu"
    )
      | Menu
      span.primary-nav__menu-bars(aria-hidden="true")
        span
        span

  Transition(name="primary-nav-panel")
    nav#primary-nav-panel.primary-nav__panel(v-if="menuOpen", aria-label="Menu")
      .primary-nav__panel-links
        NuxtLink(
          v-for="item in navItems",
          :key="item.to",
          :to="item.to",
          :aria-current="item.active ? 'page' : undefined",
          @click="menuOpen = false"
        ) {{ item.label }}
        NuxtLink(v-if="showDoors", :to="splashPath", @click="menuOpen = false") Doors
        a(v-if="showContact", :href="contactMailto", @click="onContactClick") Get in touch
</template>

<script setup lang="ts">
import { isSplashPath, ON_VIEW_ACCESSIBLE_NAME, ON_VIEW_PATH, SPLASH_PATH } from '#shared/journey-preference';
import { isNavItemActive, PRIMARY_NAV_ITEMS } from '#shared/primary-nav';
import { mailtoHref } from '#shared/site-person';

import { resolveEnvIndicator } from '../../utils/env-indicator';

const config = useRuntimeConfig();
const { profile } = useSiteProfile();
const { skip } = useJourneyPreference();
const { track } = usePortfolioAnalytics();
const trackContact = () => track('contact_click', { placement: 'navigation' });
const contactMailto = computed(() => mailtoHref(profile.value.contact.email));
const envChip = computed(() =>
  resolveEnvIndicator({
    showEnvIndicator: config.public.showEnvIndicator,
    sysEnv: config.public.sysEnv,
  })
);

const menuOpen = ref(false);
/** Ignore Menu clicks that ride the same gesture as closing Personalize (modal click-through). */
const menuToggleLocked = ref(false);
let unlockMenuToggle: number | null = null;
const personalizeOpen = usePersonalizeDialog();
const route = useRoute();
const isSplash = computed(() => isSplashPath(route.path));
const showDoors = computed(() => skip.value);
const showOnView = computed(() => skip.value);
const showContact = computed(() => !isSplash.value);
/** Inline (tablet+) and Menu-sheet destinations with their `aria-current` state. */
const navItems = computed(() =>
  PRIMARY_NAV_ITEMS.map((item) => ({ ...item, active: isNavItemActive(route.path, item.to) }))
);
const splashPath = SPLASH_PATH;
const onViewPath = ON_VIEW_PATH;
const onViewName = ON_VIEW_ACCESSIBLE_NAME;

useHead({
  titleTemplate: computed(() => (isSplash.value ? '%s' : undefined)),
});

function onContactClick(): void {
  trackContact();
  menuOpen.value = false;
}

function openPersonalize(): void {
  personalizeOpen.value = true;
  menuOpen.value = false;
}

function toggleMenu(): void {
  if (menuToggleLocked.value) return;
  menuOpen.value = !menuOpen.value;
}

function lockMenuToggleForCloseGesture(): void {
  menuToggleLocked.value = true;
  menuOpen.value = false;
  if (unlockMenuToggle != null) window.clearTimeout(unlockMenuToggle);
  // After the closing click finishes (modal click-through), unlock for the next gesture.
  unlockMenuToggle = window.setTimeout(() => {
    menuToggleLocked.value = false;
    unlockMenuToggle = null;
  }, 0);
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && menuOpen.value) menuOpen.value = false;
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown);
});
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown);
  if (unlockMenuToggle != null) window.clearTimeout(unlockMenuToggle);
});

watch(personalizeOpen, (isOpen, wasOpen) => {
  if (isOpen) {
    menuOpen.value = false;
    return;
  }
  if (wasOpen) lockMenuToggleForCloseGesture();
});

watch(
  () => route.path,
  () => {
    menuOpen.value = false;
  }
);
</script>

<style lang="scss" src="./AppPrimaryNav.scss" scoped></style>

<style lang="scss" scoped>
.app-env-chip {
  display: inline-block;
  margin-left: 0.75rem;
  padding: 0.15rem 0.45rem;
  border: 1px solid var(--border-color, currentColor);
  border-radius: var(--border-radius-sm, 0.25rem);
  font-size: 0.75rem;
  line-height: 1.2;
  letter-spacing: 0.02em;
  color: var(--text-color-secondary, var(--text-color, inherit));
  opacity: 0.85;
  vertical-align: middle;
  user-select: none;
}
</style>
