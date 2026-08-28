<template lang="pug">
aside.page-nav(:aria-label="ariaLabel")
  p(data-label) {{ label }}
  nav
    NuxtLink(
      v-for="item in items",
      :key="item.to",
      :to="item.to",
      :data-state="isActive(item.to) ? 'active' : undefined"
    ) {{ item.label }}
</template>

<script setup lang="ts">
/**
 * Route sub-nav for the Work hub (`.page-nav` chrome, same layout as `AppPageNav`).
 * Primary rail stays Work / About / Gallery / Writing / Code; Docs, AI Lab, and Process live here.
 */
import { WORK_SUB_NAV_ITEMS, type WorkSubNavItem } from '#shared/work-sub-nav';

withDefaults(
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
</script>
