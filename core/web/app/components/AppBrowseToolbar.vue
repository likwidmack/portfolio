<template lang="pug">
.browse-toolbar(role="search")
  .browse-toolbar__views(v-if="views.length", role="group", :aria-label="viewLabel")
    button(
      v-for="option in views",
      :key="option.id",
      type="button",
      :aria-pressed="view === option.id",
      :data-state="view === option.id ? 'active' : undefined",
      @click="view = option.id"
    ) {{ option.label }}
  .browse-toolbar__groups(v-if="groups.length", role="group", :aria-label="groupLabel")
    button(
      v-for="option in groups",
      :key="option.id",
      type="button",
      :aria-pressed="group === option.id",
      :data-state="group === option.id ? 'active' : undefined",
      @click="group = option.id"
    ) {{ option.label }}
  .browse-toolbar__kinds(v-if="kinds.length", role="group", :aria-label="kindLabel")
    button(
      v-for="option in kinds",
      :key="option.id",
      type="button",
      :aria-pressed="kind === option.id",
      :data-state="kind === option.id ? 'active' : undefined",
      @click="kind = option.id"
    ) {{ option.label }}
  label.browse-toolbar__query(v-if="showQuery")
    span Query
    input(v-model="query", type="search", :placeholder="queryPlaceholder", autocomplete="off")
</template>

<script setup lang="ts">
export type BrowseOption = {
  id: string;
  label: string;
};

const view = defineModel<string>('view', { default: 'grid' });
const group = defineModel<string>('group', { default: 'all' });
const kind = defineModel<string>('kind', { default: 'all' });
const query = defineModel<string>('query', { default: '' });

withDefaults(
  defineProps<{
    groupLabel?: string;
    groups?: BrowseOption[];
    kindLabel?: string;
    kinds?: BrowseOption[];
    queryPlaceholder?: string;
    showQuery?: boolean;
    viewLabel?: string;
    views?: BrowseOption[];
  }>(),
  {
    groupLabel: 'Group',
    groups: () => [],
    kindLabel: 'Filter',
    kinds: () => [],
    queryPlaceholder: 'Filter by title…',
    showQuery: false,
    viewLabel: 'View',
    views: () => [],
  }
);
</script>

<style lang="scss" scoped>
.browse-toolbar {
  display: grid;
  gap: 0.85rem;
  margin-bottom: 1.5rem;

  &__views,
  &__groups,
  &__kinds {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  button {
    padding: 0.35rem 0.75rem;
    border: 1px solid var(--portfolio-rule, currentColor);
    border-radius: 999px;
    background: transparent;
    color: inherit;
    cursor: pointer;

    &[data-state='active'] {
      background: color-mix(in srgb, var(--accent-color, currentColor) 18%, transparent);
    }
  }

  &__query {
    display: grid;
    gap: 0.35rem;
    max-width: 24rem;

    span {
      font-size: 0.8rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    input {
      padding: 0.45rem 0.7rem;
      border: 1px solid var(--portfolio-rule, currentColor);
      border-radius: 0.5rem;
      background: color-mix(in srgb, var(--surface-color) 80%, transparent);
      color: inherit;
    }
  }
}
</style>
