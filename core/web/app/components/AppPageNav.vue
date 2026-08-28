<template lang="pug">
aside.page-nav(:aria-label="ariaLabel")
  p(v-if="label", data-label) {{ label }}
  nav
    a(
      v-for="item in items",
      :key="item.id",
      :href="`#${item.id}`",
      :data-state="_activeSection === item.id ? 'active' : undefined"
    ) {{ item.label }}
</template>

<script setup lang="ts">
/**
 * Sticky on-page section nav (`.page-nav`) with IntersectionObserver scroll-spy.
 * Pass section `id` + `label` items; the matching elements must exist in the document.
 */

export type AppPageNavItem = {
  id: string;
  label: string;
};

const props = withDefaults(
  defineProps<{
    items: AppPageNavItem[];
    label?: string;
    ariaLabel?: string;
    rootMargin?: string;
    threshold?: number | number[];
  }>(),
  {
    label: 'On this page',
    ariaLabel: 'On this page',
    rootMargin: '-20% 0px -55% 0px',
    threshold: () => [0.1, 0.35, 0.6],
  }
);

const _activeSection = ref<string>(props.items[0]?.id ?? '');

let _sectionObserver: IntersectionObserver | null = null;

function observeSections(): void {
  _sectionObserver?.disconnect();
  _sectionObserver = null;

  const sections = props.items
    .map((item) => document.getElementById(item.id))
    .filter((el): el is HTMLElement => el instanceof HTMLElement);

  if (!sections.length) {
    return;
  }

  if (!_activeSection.value || !props.items.some((item) => item.id === _activeSection.value)) {
    _activeSection.value = sections[0]?.id ?? '';
  }

  _sectionObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      const top = visible[0]?.target;
      if (top instanceof HTMLElement && top.id) {
        _activeSection.value = top.id;
      }
    },
    {
      root: null,
      rootMargin: props.rootMargin,
      threshold: props.threshold,
    }
  );

  for (const section of sections) {
    _sectionObserver.observe(section);
  }
}

onMounted(observeSections);

watch(
  () => props.items.map((item) => item.id).join('\0'),
  () => {
    if (import.meta.client) {
      observeSections();
    }
  }
);

onBeforeUnmount(() => {
  _sectionObserver?.disconnect();
  _sectionObserver = null;
});
</script>
