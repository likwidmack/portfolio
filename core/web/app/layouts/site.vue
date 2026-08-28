<template lang="pug">
.app-site-layout(:id="`${layoutKey}_page`", :class="layoutClass")
  a(data-skip-link, :href="`#${layoutKey}_main`") Skip to main content

  header.site-chrome(:id="`${layoutKey}_header`"): slot(name="header"): div: AppPrimaryNav

  main(:id="`${layoutKey}_main`"): slot

  footer.site-chrome(:id="`${layoutKey}_footer`"): slot(name="footer")
    .site-footer
      p &copy; 2026 Tamara Mack · UI/AI Engineer · LIKWIDMACK
      button.site-footer__personalize(type="button", @click="personalizeOpen = true") Personalize
    AppPersonalize(v-model:open="personalizeOpen")
</template>

<script setup lang="ts">
import { styleListener } from '#shared/utils/style-listener';

const props = defineProps<{
  layoutClass: string;
  layoutKey: string;
}>();

const personalizeOpen = ref(false);
const config = useRuntimeConfig();
const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Tamara Mack',
  alternateName: 'LIKWIDMACK',
  jobTitle: 'Creative Technologist',
  url: config.public.siteUrl,
  description:
    'Creative technologist; principal and distinguished software engineer and software architect designing human-centered interfaces for systems that think, act, and create.',
};

useHead({
  // key keeps Person JSON-LD deduped across layout remounts; innerHTML (not children) is Unhead's current API
  script: [{ key: 'person-json-ld', type: 'application/ld+json', innerHTML: JSON.stringify(personJsonLd) }],
});

const _refreshLayoutVars = () =>
  styleListener({
    headerId: `${props.layoutKey}_header`,
    footerId: `${props.layoutKey}_footer`,
  });

onBeforeMount(() => {
  _refreshLayoutVars();
  window.addEventListener('resize', _refreshLayoutVars);
});

onUpdated(_refreshLayoutVars);

onBeforeUnmount(() => {
  window.removeEventListener('resize', _refreshLayoutVars);
});
</script>

<style lang="scss" scoped>
.app-site-layout {
  [data-skip-link] {
    position: absolute;
    left: 0.75rem;
    top: -2.5rem;
    z-index: 100;
    padding: 0.5rem 0.75rem;
    border-radius: var(--border-radius-sm, 0.375rem);
    background: var(--surface-color);
    color: var(--text-color);
    text-decoration: none;
    border: 1px solid var(--border-color);

    &:focus-visible {
      top: 0.5rem;
      outline: 2px solid var(--focus-ring, var(--primary-color));
      outline-offset: 2px;
    }
  }

  header {
    max-width: 100vw;
  }

  main {
    padding-top: var(--main-top-padding) !important;
    padding-bottom: var(--main-bottom-padding) !important;
  }

  footer {
    text-align: center;
  }

  .site-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.75rem 1.25rem;
    padding: 0.75rem 1rem;
  }

  .site-footer__personalize {
    appearance: none;
    border: 1px solid var(--border-color, currentColor);
    border-radius: var(--border-radius-sm, 0.25rem);
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 0.875rem;
    padding: 0.25rem 0.6rem;
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid var(--focus-ring, var(--primary-color));
      outline-offset: 2px;
    }
  }
}

@media (min-width: $breakpoint-tablet) {
  header {
    display: flex;
    place-items: flex-end;
    justify-content: flex-end;
    padding-right: calc(var(--section-gap) / 2);
    margin-left: auto;
    margin-right: auto;
    max-width: $breakpoint-tablet;

    > div {
      position: relative;
      padding: 1rem;
    }
  }

  nav {
    text-align: left;
    font-size: 1rem;
  }
}
</style>
