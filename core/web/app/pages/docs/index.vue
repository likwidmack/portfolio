<template lang="pug">
.page-content.portfolio-page.docs-index(data-fit="prose")
  header.portfolio-hero
    p.eyebrow-container Technical documentation
    h1 Specs, runbooks, and examples
    p.lead The same markdown that lives in the repo docs tree — grouped like a software spec library, with UML-style diagrams where the source includes them.

  .page-with-nav
    AppPageNav(:items="navItems", label="Groups")
    div(data-region="body")
      AppBrowseToolbar(
        v-model:view="viewMode",
        v-model:group="groupId",
        v-model:query="query",
        :views="viewOptions",
        :groups="groupOptions",
        :total="entries.length",
        :matching="visible.length",
        :filtered="filtered",
        :noun="entries.length === 1 ? 'document' : 'documents'",
        show-query,
        view-label="View",
        group-label="Group",
        query-placeholder="Filter by title or path…",
        @clear="clearFilters"
      )

      template(v-if="viewMode === 'grid'")
        section.docs-index__group(
          v-for="bucket in grouped",
          :id="bucket.group",
          :key="bucket.group",
          :aria-labelledby="`${bucket.group}-heading`"
        )
          h2.title(:id="`${bucket.group}-heading`") {{ groupLabel(bucket.group) }}
          ul.docs-grid
            li(v-for="entry in bucket.items", :key="entry.path")
              NuxtLink.docs-card(:to="docCardHref(entry.path)")
                p.docs-card__kicker {{ entry.path }}
                h3 {{ docCardTitle(entry) }}
                p(v-if="entry.description") {{ entry.description }}

      ul.docs-list(v-else)
        li(v-for="entry in visible", :key="entry.path")
          NuxtLink.docs-card(:to="docCardHref(entry.path)")
            p.docs-card__kicker {{ groupLabel(docCardGroup(entry.path)) }} · {{ entry.path }}
            h3 {{ docCardTitle(entry) }}
            p(v-if="entry.description") {{ entry.description }}

      p(v-if="!visible.length") No documents match this filter.
</template>

<script setup lang="ts">
import {
  DOCS_GROUP_FILTERS,
  docHref,
  docTitle,
  filterDocsEntries,
  groupDocsEntries,
  groupFromDocPath,
  type DocsGroupId,
  type DocsIndexEntry,
  type DocsViewMode,
} from '#shared/docs-catalog';
import { SITE_PERSON } from '#shared/site-person';

definePageMeta({ breadcrumb: 'Docs' });

const { data } = await useContentAsyncData('docs-index', () =>
  fetchContentCollection<DocsIndexEntry[]>('docs', { mode: 'all' })
);

const entries = computed(() => (data.value ?? []) as DocsIndexEntry[]);
const browse = useBrowseQuery({ view: 'grid', group: 'all', kind: 'all', query: '' });
const { query, filtered, clear: clearFilters } = browse;
const viewMode = computed<DocsViewMode>({
  get: () => browse.view.value as DocsViewMode,
  set: (value) => (browse.view.value = value),
});
const groupId = computed<DocsGroupId>({
  get: () => browse.group.value as DocsGroupId,
  set: (value) => (browse.group.value = value),
});

const viewOptions = [
  { id: 'grid', label: 'Grid' },
  { id: 'list', label: 'List' },
];
/** Group counts respect the current search text. */
const groupOptions = computed(() =>
  DOCS_GROUP_FILTERS.map((option) => ({
    ...option,
    count: filterDocsEntries(entries.value, option.id as DocsGroupId, query.value).length,
  }))
);
const visible = computed(() => filterDocsEntries(entries.value, groupId.value, query.value));
const grouped = computed(() => groupDocsEntries(visible.value));
const navItems = computed(() =>
  grouped.value.map((bucket) => ({
    id: bucket.group,
    label: groupLabel(bucket.group),
  }))
);

function groupLabel(id: string): string {
  return DOCS_GROUP_FILTERS.find((option) => option.id === id)?.label ?? id;
}

function docCardHref(path: string): string {
  return docHref(path);
}

function docCardTitle(entry: DocsIndexEntry): string {
  return docTitle(entry);
}

function docCardGroup(path: string): ReturnType<typeof groupFromDocPath> {
  return groupFromDocPath(path);
}

usePortfolioSeo({
  title: `Technical documentation — ${SITE_PERSON.formal}`,
  description: 'Software specs, runbooks, and examples sourced from the repository docs tree.',
  path: '/docs',
});
</script>

<style lang="scss" scoped>
.docs-grid,
.docs-list {
  @include portfolio-stack(0.85rem);
  margin: 0 0 2rem;
  padding: 0;
  list-style: none;
}

.docs-grid {
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr));
}

.docs-card {
  @include portfolio-stack(0.4rem);
  @include portfolio-box-contain;
  min-height: 8rem;
  padding: 1rem 1.1rem;
  @include portfolio-soft-surface;
  border-radius: 0.9rem;
  text-decoration: none;
  color: inherit;

  h3,
  p {
    margin: 0;
  }

  &__kicker {
    font-size: 0.75rem;
    letter-spacing: 0.04em;
    word-break: break-all;
    color: var(--text-secondary-color, inherit); // was a mistyped token → inherit
  }
}
</style>
