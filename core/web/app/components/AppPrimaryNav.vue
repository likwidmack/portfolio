<template lang="pug">
.primary-nav
  NuxtLink.primary-nav__brand(to="/", aria-label="Tamara Mack home")
    strong TM
    span LIKWIDMACK
  nav.primary-nav__links(aria-label="Primary")
    NuxtLink(to="/work") Work
    NuxtLink(to="/about") About
    NuxtLink(to="/gallery") Gallery
    NuxtLink(to="/blog") Writing
    NuxtLink(to="/code") Code
  .primary-nav__actions
    a.primary-nav__contact(href="mailto:likwidmack@gmail.com", @click="trackContact") Get in touch
    span.app-env-chip(v-if="envChip.show", :aria-label="envChip.ariaLabel") {{ envChip.label }}
</template>

<script setup lang="ts">
import { resolveEnvIndicator } from '../utils/env-indicator';

const config = useRuntimeConfig();
const { track } = usePortfolioAnalytics();
const trackContact = () => track('contact_click', { placement: 'navigation' });
const envChip = computed(() =>
  resolveEnvIndicator({
    showEnvIndicator: config.public.showEnvIndicator,
    sysEnv: config.public.sysEnv,
  })
);
</script>

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
