<template lang="pug">
.primary-nav.layout(ref="navRoot", data-algo="cluster")
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
      ref="menuTrigger",
      type="button",
      :aria-expanded="menuOpen ? 'true' : 'false'",
      aria-controls="primary-nav-panel",
      aria-label="Toggle navigation menu",
      @click="toggleMenu"
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
          @click="onSheetLinkClick(item.to)"
        ) {{ item.label }}
        NuxtLink(v-if="showDoors", :to="splashPath", @click="onSheetLinkClick(splashPath)") Doors
        a(v-if="showContact", :href="contactMailto", @click="onSheetContactClick") Get in touch
</template>

<script setup lang="ts">
import { isSplashPath, ON_VIEW_ACCESSIBLE_NAME, ON_VIEW_PATH, SPLASH_PATH } from '#shared/journey-preference';
import { isNavItemActive, linkStaysOnPage, PRIMARY_NAV_ITEMS } from '#shared/primary-nav';
import { mailtoHref } from '#shared/site-person';

import { type DisclosureCloseReason, focusIsInside, returnFocusToTrigger } from '../../utils/disclosure-focus';
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
const navRoot = ref<HTMLElement | null>(null);
const menuTrigger = ref<HTMLButtonElement | null>(null);
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

// Why the sheet is closing, read by the focus-return watcher below (one close at a time).
let closeReason: DisclosureCloseReason = 'other';

function closeMenu(reason: DisclosureCloseReason): void {
  if (!menuOpen.value) return;
  closeReason = reason;
  menuOpen.value = false;
}

// The sheet unmounts on close, so focus inside it would fall to <body>. `Esc`, a sheet link that
// stays on the page (mailto, the current page) and any close while focus was in the sheet (except
// a link navigation or an outside click) return it to the Menu trigger.
// Pre-flush: runs before the re-render, while the sheet (and its focused link) still exist.
watch(menuOpen, (isOpen, wasOpen) => {
  const reason = closeReason;
  closeReason = 'other';
  if (isOpen || !wasOpen || !import.meta.client) return;
  const focusWasInPanel = focusIsInside(document.getElementById('primary-nav-panel'));
  nextTick(() => returnFocusToTrigger(menuTrigger.value, reason, focusWasInPanel));
});

/** Menu button: opens the sheet, or closes it as a `toggle` (focus is already on the button). */
function toggleMenu(): void {
  if (menuOpen.value) closeMenu('toggle');
  else menuOpen.value = true;
}

/** Header "Get in touch" (outside the sheet): focus stays on the link, so never move it. */
function onContactClick(): void {
  trackContact();
  closeMenu('navigate');
}

/** Sheet "Get in touch": `mailto:` does not navigate, so focus returns to the Menu trigger. */
function onSheetContactClick(): void {
  trackContact();
  closeMenu('stay');
}

/** Sheet links: the current page's link does not navigate (focus returns to Menu); others do. */
function onSheetLinkClick(to: string): void {
  closeMenu(linkStaysOnPage(route.path, to) ? 'stay' : 'navigate');
}

function openPersonalize(): void {
  personalizeOpen.value = true;
  menuOpen.value = false;
}

// Close on a click outside the nav. `composedPath()` is the path at dispatch time, so a click on
// the Menu button (or anything inside the nav) still counts as inside even if Vue re-rendered
// that element. The click is not stopped, so page-wide listeners (analytics, …) still see it.
function onDocumentClick(event: MouseEvent): void {
  if (!menuOpen.value || !navRoot.value) return;
  if (!event.composedPath().includes(navRoot.value)) closeMenu('outside');
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && menuOpen.value) closeMenu('escape');
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onKeydown);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick);
  document.removeEventListener('keydown', onKeydown);
  if (import.meta.client) document.documentElement.removeAttribute('data-personalize-open');
});

// Close Menu while Personalize is open. `data-personalize-open` disables Menu hit-testing so
// the Done click cannot fall through onto the trigger (which would open the sheet; the next
// Cypress/user click would then toggle it closed).
watch(
  personalizeOpen,
  (isOpen) => {
    menuOpen.value = false;
    if (!import.meta.client) return;
    if (isOpen) {
      document.documentElement.setAttribute('data-personalize-open', '');
      return;
    }
    window.setTimeout(() => {
      if (!personalizeOpen.value) document.documentElement.removeAttribute('data-personalize-open');
    }, 0);
  },
  { immediate: true }
);

watch(
  () => route.path,
  () => {
    closeMenu('navigate');
  }
);
</script>

<style lang="scss" src="./AppPrimaryNav.scss" scoped></style>

<style lang="scss" scoped>
.app-env-chip {
  display: inline-block;
  margin-left: 0.75rem;
  padding: 0.15rem 0.45rem;
  border: 1px solid var(--theme-border-color, currentColor);
  border-radius: var(--border-radius-sm, 0.25rem);
  font-size: 0.75rem;
  line-height: 1.2;
  letter-spacing: 0.02em;
  color: var(--theme-text-color);
  opacity: 0.85;
  vertical-align: middle;
  user-select: none;
}
</style>
