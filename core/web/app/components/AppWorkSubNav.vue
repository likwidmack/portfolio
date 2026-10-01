<template lang="pug">
aside.page-nav(:aria-label="ariaLabel", @keydown.esc="closeAndFocus")
  p(data-label) {{ label }}
  //- Phones / small tablets: one labelled disclosure instead of a sideways-scrolling row.
  button.page-nav__toggle(
    type="button",
    :aria-expanded="open ? 'true' : 'false'",
    :aria-controls="listId",
    @click="toggleOpen"
  )
    span.page-nav__toggle-text
      span.page-nav__toggle-label {{ label }}
      span.page-nav__toggle-current(v-if="currentLabel") {{ currentLabel }}
    UiIcon.page-nav__toggle-icon(name="chevron-down")
  nav(:id="listId", :data-open="open ? '' : undefined")
    NuxtLink(
      v-for="item in items",
      :key="item.to",
      :to="item.to",
      :data-state="isActive(item.to) ? 'active' : undefined",
      @click="open = false"
    ) {{ item.label }}
</template>

<script setup lang="ts">
/**
 * Route sub-nav for the Work hub (`.page-nav` chrome, same layout as `AppPageNav`).
 * Primary rail stays Work / About / Gallery / Writing / Code; Docs, AI Lab, and Process live here.
 */
import { WORK_SUB_NAV_ITEMS, type WorkSubNavItem } from '#shared/work-sub-nav';

const props = withDefaults(
  defineProps<{
    items?: WorkSubNavItem[];
    label?: string;
    ariaLabel?: string;
  }>(),
  {
    items: () => WORK_SUB_NAV_ITEMS,
    label: 'Related',
    ariaLabel: 'Work related pages',
  }
);

const route = useRoute();

function isActive(to: string): boolean {
  const path = route.path;
  return path === to || path.startsWith(`${to}/`);
}

// Phone disclosure (hidden from tablet up, where the list is always shown).
const { open, listId, closeAndFocus, toggleOpen } = usePageNavDisclosure();
const currentLabel = computed(() => props.items.find((item) => isActive(item.to))?.label);
</script>

<style lang="scss" src="./AppPageNav/AppPageNav.scss" scoped></style>
