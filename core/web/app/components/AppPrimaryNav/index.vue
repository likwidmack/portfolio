<template lang="pug">
.primary-nav.layout(ref="navRoot", data-algo="cluster")
  NuxtLink.primary-nav__brand(to="/", :aria-label="`${profile.names.casual} home`")
    strong TM
    span {{ profile.names.signature }}
  .primary-nav__actions
    span.app-env-chip(v-if="envChip.show", :aria-label="envChip.ariaLabel") {{ envChip.label }}
    button.primary-nav__menu-trigger(
      type="button",
      :aria-expanded="menuOpen",
      aria-controls="primary-nav-panel",
      aria-label="Toggle navigation menu",
      @click="menuOpen = !menuOpen"
    )
      | Menu
      span.primary-nav__menu-bars(aria-hidden="true")
        span
        span

  Transition(name="primary-nav-panel")
    nav#primary-nav-panel.primary-nav__panel(v-if="menuOpen", aria-label="Primary")
      .primary-nav__panel-links
        NuxtLink(to="/work", @click="menuOpen = false") Work
        NuxtLink(to="/about", @click="menuOpen = false") About
        NuxtLink(to="/gallery", @click="menuOpen = false") Gallery
        NuxtLink(to="/blog", @click="menuOpen = false") Writing
        NuxtLink(to="/code", @click="menuOpen = false") Code
        a(:href="contactMailto", @click="onContactClick") Get in touch
      button.primary-nav__panel-personalize(type="button", @click="openPersonalize") Personalize
</template>

<script setup lang="ts">
import { mailtoHref } from '#shared/site-person';
import { resolveEnvIndicator } from '../../utils/env-indicator';

const config = useRuntimeConfig();
const { profile } = useSiteProfile();
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
const personalizeOpen = usePersonalizeDialog();
const route = useRoute();

function onContactClick(): void {
  trackContact();
  menuOpen.value = false;
}

function openPersonalize(): void {
  personalizeOpen.value = true;
  menuOpen.value = false;
}

function onDocumentClick(event: MouseEvent): void {
  if (!menuOpen.value) return;
  const target = event.target;
  if (!(target instanceof Node)) {
    menuOpen.value = false;
    return;
  }
  if (navRoot.value && !navRoot.value.contains(target)) menuOpen.value = false;
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && menuOpen.value) menuOpen.value = false;
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onKeydown);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick);
  document.removeEventListener('keydown', onKeydown);
});
watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false;
  }
);

const links = [
  { label: 'About', to: '/about', cssClass: '' },
  { label: 'Work', to: '/work', cssClass: '' },
  { label: 'Gallery', to: '/gallery', cssClass: '' },
  { label: 'Writing', to: '/blog', cssClass: '' },
  { label: 'Code', to: '/code', cssClass: '' },
  { label: 'Contact', to: contactMailto.value, cssClass: 'app-primary-nav__contact-link' },
];
</script>

<style lang="scss" src="./AppPrimaryNav.scss"></style>

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
