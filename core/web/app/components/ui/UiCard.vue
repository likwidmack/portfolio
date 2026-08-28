<template lang="pug">
PrimeCard(v-if="isPrimeVue", v-bind="$attrs")
  template(v-if="$slots.header", #header)
    slot(name="header")
  //- Non-heading titles: pages own the document outline; cards must not inject h5/h6 jumps.
  template(v-if="$slots.title", #title)
    .p-card-title: slot(name="title")
  template(v-if="$slots.subtitle", #subtitle)
    .p-card-subtitle: slot(name="subtitle")
  template(v-if="$slots.content", #content)
    slot(name="content")
  template(v-if="$slots.footer", #footer)
    slot(name="footer")
  slot
article.p-card.p-component(v-else, v-bind="$attrs")
  .p-card-header(v-if="$slots.header"): slot(name="header")
  .p-card-body
    .p-card-caption(v-if="$slots.title || $slots.subtitle")
      .p-card-title(v-if="$slots.title"): slot(name="title")
      .p-card-subtitle(v-if="$slots.subtitle"): slot(name="subtitle")
    .p-card-content(v-if="$slots.content || $slots.default")
      slot(name="content")
      slot
    .p-card-footer(v-if="$slots.footer"): slot(name="footer")
</template>

<script setup lang="ts">
/** Card surface — PrimeVue `Card`, else native article with classic `p-card` structure. */
defineOptions({
  inheritAttrs: false,
});

const { isPrimeVue } = useUiStack();
</script>

<style lang="scss" scoped>
.p-card-title {
  margin: 0;
  font-size: var(--font-size-2xl);
  font-weight: 400;
  line-height: 1.2;
}

.p-card-subtitle {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: 400;
  line-height: 1.3;
  opacity: 0.85;
}
</style>
