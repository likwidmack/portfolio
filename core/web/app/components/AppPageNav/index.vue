<template lang="pug">
aside.page-nav.layout(
  data-algo="cluster",
  :aria-label="ariaLabel",
  :data-embedded="embedded ? '' : undefined",
  @keydown.esc="closeAndFocus"
)
  p(v-if="label", data-label) {{ label }}
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
    a(
      v-for="item in items",
      :key="item.id",
      :href="`#${item.id}`",
      :data-state="_activeSection === item.id ? 'active' : undefined",
      :aria-current="_activeSection === item.id ? 'location' : undefined",
      @click="open = false"
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
    /** Inside another sticky panel: not sticky itself, no padding or background, muted label. */
    embedded?: boolean;
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

// Phone disclosure (hidden from tablet up, where the list is always shown).
const { open, listId, closeAndFocus, toggleOpen } = usePageNavDisclosure();
const currentLabel = computed(() => props.items.find((item) => item.id === _activeSection.value)?.label);

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

<style lang="scss" src="./AppPageNav.scss" scoped></style>
