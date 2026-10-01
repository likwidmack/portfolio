<template lang="pug">
.browse-toolbar(ref="root", role="search")
  .browse-toolbar__row
    .browse-toolbar__segments.browse-toolbar__views(v-if="views.length", role="group", :aria-label="viewLabel")
      button(
        v-for="option in views",
        :key="option.id",
        type="button",
        :aria-pressed="view === option.id ? 'true' : 'false'",
        :data-state="view === option.id ? 'active' : undefined",
        @click="view = option.id"
      ) {{ option.label }}
    .browse-toolbar__segments.browse-toolbar__groups(v-if="groups.length", role="group", :aria-label="groupLabel")
      button(
        v-for="option in groups",
        :key="option.id",
        type="button",
        :disabled="option.count === 0 && group !== option.id",
        :aria-pressed="group === option.id ? 'true' : 'false'",
        :data-state="group === option.id ? 'active' : undefined",
        @click="group = option.id"
      )
        | {{ option.label }}
        span.browse-toolbar__count(v-if="option.count !== undefined") {{ option.count }}
    label.browse-toolbar__picker.browse-toolbar__groups-picker(v-if="groups.length")
      span {{ groupLabel }}
      select(v-model="group")
        option(
          v-for="option in groups",
          :key="option.id",
          :value="option.id",
          :disabled="option.count === 0 && group !== option.id"
        ) {{ optionText(option) }}
    .browse-toolbar__segments.browse-toolbar__kinds(v-if="kinds.length", role="group", :aria-label="kindLabel")
      button(
        v-for="option in kinds",
        :key="option.id",
        type="button",
        :disabled="option.count === 0 && kind !== option.id",
        :aria-pressed="kind === option.id ? 'true' : 'false'",
        :data-state="kind === option.id ? 'active' : undefined",
        @click="kind = option.id"
      )
        | {{ option.label }}
        span.browse-toolbar__count(v-if="option.count !== undefined") {{ option.count }}
    label.browse-toolbar__picker.browse-toolbar__kinds-picker(v-if="kinds.length")
      span {{ kindLabel }}
      select(v-model="kind")
        option(
          v-for="option in kinds",
          :key="option.id",
          :value="option.id",
          :disabled="option.count === 0 && kind !== option.id"
        ) {{ optionText(option) }}
    label.browse-toolbar__query(v-if="showQuery")
      span Search
      input(v-model="query", type="search", :placeholder="queryPlaceholder", autocomplete="off")
  .browse-toolbar__status(v-if="total !== undefined")
    span(aria-live="polite")
      | Showing
      |
      strong {{ matching ?? total }}
      |
      | of {{ total }} {{ noun }}
    button.browse-toolbar__clear(v-if="filtered", type="button", @click="onClear") Clear filters
</template>

<script setup lang="ts">
/**
 * Browse controls for Gallery, Docs and Code. Wide screens: one segmented group per facet.
 * Tablets/phones: Group and Filter become labelled native `<select>`s (44px, OS picker on
 * touch, "Label · count" options) — CSS shows exactly one control per facet, so assistive
 * tech never meets a duplicate. View (two options) stays segmented. Optional per-option
 * counts, a live "Showing N of M" status line and "Clear filters".
 * Pair with `useBrowseQuery()` so the state lives in the URL.
 */
export type BrowseOption = {
  id: string;
  label: string;
  /** Items this option would show; `0` disables the option unless it is selected. */
  count?: number;
};

const view = defineModel<string>('view', { default: 'grid' });
const group = defineModel<string>('group', { default: 'all' });
const kind = defineModel<string>('kind', { default: 'all' });
const query = defineModel<string>('query', { default: '' });

const emit = defineEmits<{ clear: [] }>();

/** Native option text: "Label · count" (counts are part of the accessible name). */
function optionText(option: BrowseOption): string {
  return option.count === undefined ? option.label : `${option.label} · ${option.count}`;
}
const root = useTemplateRef<HTMLElement>('root');

/** The Clear button disappears once filters reset — keep focus in the toolbar (first control). */
function onClear(): void {
  emit('clear');
  nextTick(() => root.value?.querySelector<HTMLElement>('input, button')?.focus());
}

withDefaults(
  defineProps<{
    filtered?: boolean;
    groupLabel?: string;
    groups?: BrowseOption[];
    kindLabel?: string;
    kinds?: BrowseOption[];
    matching?: number;
    noun?: string;
    queryPlaceholder?: string;
    showQuery?: boolean;
    total?: number;
    viewLabel?: string;
    views?: BrowseOption[];
  }>(),
  {
    filtered: false,
    groupLabel: 'Group',
    groups: () => [],
    kindLabel: 'Filter',
    kinds: () => [],
    matching: undefined,
    noun: 'items',
    queryPlaceholder: 'Filter by title…',
    showQuery: false,
    total: undefined,
    viewLabel: 'View',
    views: () => [],
  }
);
</script>

<style lang="scss" scoped>
.browse-toolbar {
  display: grid;
  // minmax(0, 1fr): without it the implicit `auto` track sizes to the widest segment
  // group and the whole toolbar (and page) overflows on phones.
  grid-template-columns: minmax(0, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.5rem;

  &__row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
  }

  &__segments {
    display: inline-flex;
    gap: 2px;
    max-width: 100%;
    padding: 3px;
    border: 1px solid var(--border-strong, var(--portfolio-rule, currentColor));
    border-radius: var(--button-radius, var(--border-radius-sm));
  }

  button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    min-height: 44px;
    padding: 0 0.85rem;
    border: 0;
    border-radius: 3px;
    background: transparent;
    color: var(--text-secondary-color, inherit);
    @include portfolio-type-meta;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
    cursor: pointer;

    &:hover {
      color: var(--text-color);
    }

    &:focus-visible {
      outline: 2px solid var(--focus-ring);
      outline-offset: 2px;
    }

    &[aria-pressed='true'] {
      background: var(--surface-variant);
      color: var(--text-color);
      box-shadow: inset 0 -2px 0 var(--link-color, var(--primary-color));
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  }

  // Narrow-screen facet pickers (shown below the tablet breakpoint).
  &__picker {
    display: none;
    flex: 1 1 12rem;
    gap: 0.35rem;
    min-width: 0;

    span {
      @include portfolio-type-meta;
      font-size: 0.8rem;
      text-transform: uppercase;
    }

    select {
      width: 100%;
      min-height: 44px;
      padding: 0 0.75rem;
      border: 1px solid var(--form-border-color, var(--border-strong));
      border-radius: var(--border-radius-sm);
      background: color-mix(in srgb, var(--surface-color) 80%, transparent);
      color: inherit;
      font-size: 1rem; // 16px: no iOS zoom-on-focus

      &:focus-visible {
        outline: 2px solid var(--focus-ring);
        outline-offset: 1px;
      }
    }
  }

  &__count {
    font-variant-numeric: tabular-nums;
    letter-spacing: 0;
    opacity: 0.8;
  }

  &__query {
    display: grid;
    flex: 1 1 14rem;
    gap: 0.35rem;
    max-width: 24rem;

    span {
      @include portfolio-type-meta;
      font-size: 0.8rem;
      text-transform: uppercase;
    }

    input {
      min-height: 44px;
      padding: 0 0.75rem;
      border: 1px solid var(--form-border-color, var(--border-strong));
      border-radius: var(--border-radius-sm);
      background: color-mix(in srgb, var(--surface-color) 80%, transparent);
      color: inherit;
      font-size: 1rem;

      &:focus-visible {
        outline: 2px solid var(--focus-ring);
        outline-offset: 1px;
      }
    }
  }

  &__status {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    color: var(--text-secondary-color);
    font-size: var(--font-size-sm);

    strong {
      color: var(--text-color);
      font-variant-numeric: tabular-nums;
    }
  }

  .browse-toolbar__clear {
    min-height: 44px;
    padding: 0 0.6rem;
    color: var(--link-color, var(--primary-color));
    text-transform: none;
    letter-spacing: 0;
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }
}

// Tablets/phones: Group and Filter swap to their labelled pickers (one control per facet).
@media (max-width: $breakpoint-tablet) {
  .browse-toolbar {
    // Even columns: pickers (and search) share the width; one column on phones.
    &__row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
      align-items: end;
    }

    &__views {
      justify-self: start;
    }

    &__query {
      max-width: none;
    }

    &__groups,
    &__kinds {
      display: none;
    }

    &__picker {
      display: grid;
    }
  }
}
</style>
