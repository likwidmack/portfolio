<template lang="pug">
.page-content.styles-page(data-fit="screen")
  header
    p.eyebrow-container.text-shadow-primary Design system
    h1.display Style Studio
    p.lead Pick a role, then a colour. The whole site previews it; nothing sticks until you apply.
    NuxtLink.styles-page__parity-link(to="/styles/parity") Component parity (for developers) →

  div(data-region="body")
    ClientOnly
      template(#fallback)
        p Loading Style Studio…
      AppStyleStudio
</template>

<script setup lang="ts">
definePageMeta({
  breadcrumb: 'Styles',
});

useHead({
  title: 'Style Studio',
  meta: [
    {
      name: 'description',
      content: 'Style Studio: edit brand roles with a live contrast check, then apply or save named setups.',
    },
  ],
});
</script>

<style lang="scss" scoped>
.styles-page {
  [data-region='body'] {
    display: grid;
    gap: var(--section-gap, 2rem);
    min-width: 0;
  }

  &__parity-link {
    display: inline-flex;
    align-items: center;
    min-height: var(--touch-target, 44px);
    color: var(--link-color);
  }
}
</style>
