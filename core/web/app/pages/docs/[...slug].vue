<template lang="pug">
.page-content.portfolio-page.docs-page(v-if="page")
  NuxtLink.back-link(to="/docs") ← All documentation
  header.portfolio-hero
    p.eyebrow-container {{ groupLabel }}
    h1 {{ heading }}
    p.lead(v-if="page.description") {{ page.description }}
  article.docs-page__body.prose
    ContentRenderer(v-if="page.body", :value="page")
    p(v-else) This document has no renderable body.
</template>

<script setup lang="ts">
import { DOCS_GROUP_FILTERS, docTitle, groupFromDocPath } from '#shared/docs-catalog';

definePageMeta({
  breadcrumb: 'Docs',
  validate(route) {
    const slug = route.params.slug;
    if (Array.isArray(slug)) {
      return slug.some((part) => String(part).trim().length > 0);
    }
    return typeof slug === 'string' && slug.trim().length > 0;
  },
});

type DocsPage = {
  body?: unknown;
  description?: string;
  path?: string;
  stem?: string;
  title?: string;
};

const route = useRoute();
const slug = computed(() => {
  const param = route.params.slug;
  if (Array.isArray(param)) {
    return param.join('/');
  }
  return String(param ?? '');
});
const contentPath = computed(() => `/${slug.value}`.replace(/\/+/g, '/'));

const { data } = await useContentAsyncData(
  () => `docs-page-${contentPath.value}`,
  () => fetchContentCollection<DocsPage>('docs', { mode: 'first', path: contentPath.value }),
  { watch: [contentPath] }
);

const page = computed(() => (data.value ?? null) as DocsPage | null);

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Document not found' });
}

const heading = computed(() => docTitle({ title: page.value?.title, path: page.value?.path, stem: page.value?.stem }));
const groupLabel = computed(() => {
  const id = groupFromDocPath(page.value?.path || contentPath.value);
  return DOCS_GROUP_FILTERS.find((option) => option.id === id)?.label ?? 'Docs';
});

usePortfolioSeo({
  title: `${heading.value} — Technical documentation`,
  description: page.value.description || 'Technical documentation from the repository docs tree.',
  path: `/docs${contentPath.value}`,
});
</script>

<style lang="scss" scoped>
.docs-page__body {
  max-width: 48rem;

  :deep(pre) {
    overflow-x: auto;
  }

  :deep(table) {
    display: block;
    overflow-x: auto;
  }
}
</style>
