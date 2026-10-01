<template lang="pug">
.page-content.styles-page(data-fit="screen")
  NuxtLink.back-link(to="/styles") ← Style Studio
  header
    p.eyebrow-container For developers
    h1.display Component parity
    p.lead Native HTML, Foundation XY and PrimeVue Ui* wrappers side by side, so stack drift shows at a glance.

  .page-with-nav
    AppPageNav(:items="navItems", label="Sections")

    div(data-region="body")
      AppStylesParity
</template>

<script setup lang="ts">
/** Engineering kitchen sink split from Style Studio (`/styles`). */
definePageMeta({
  breadcrumb: 'Component parity',
});

useHead({
  title: 'Component parity',
  meta: [
    {
      name: 'description',
      content: 'Native / Foundation / PrimeVue parity kitchen sink for the portfolio design system.',
    },
  ],
});

const navItems = [
  { id: 'compare', label: 'How to read' },
  { id: 'theme-mode', label: 'Theme mode' },
  { id: 'typography', label: 'Typography' },
  { id: 'buttons', label: 'Buttons' },
  { id: 'forms', label: 'Forms' },
  { id: 'layout', label: 'Layout' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'colors', label: 'Colors' },
  { id: 'surfaces', label: 'Surfaces' },
  { id: 'code', label: 'Code' },
];
</script>

<style lang="scss" scoped>
.styles-page {
  [data-region='body'] {
    display: grid;
    gap: var(--section-gap, 2rem);
    min-width: 0;
  }
}
</style>
