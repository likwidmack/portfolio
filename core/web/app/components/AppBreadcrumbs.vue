<template lang="pug">
nav.app-breadcrumbs(aria-label="Breadcrumb")
  ol
    li(v-for="crumb in _crumbs", :key="crumb.to", :data-state="crumb.current ? 'current' : undefined")
      NuxtLink(v-if="!crumb.current", :to="crumb.to") {{ crumb.label }}
      span(v-else, aria-current="page") {{ crumb.label }}
</template>

<script setup lang="ts">
/**
 * Semantic breadcrumb trail derived from `vue-router`:
 * optionally prefixes home, resolves labels from matched route `meta.breadcrumb` / `meta.title`,
 * respects `labelMap` overrides and title-cases path segments otherwise.
 */

type Crumb = {
  label: string;
  to: string;
  current: boolean;
};

const props = withDefaults(
  defineProps<{
    includeHome?: boolean;
    homeLabel?: string;
    labelMap?: Record<string, string>;
    routeMetaKey?: string;
  }>(),
  {
    includeHome: true,
    homeLabel: 'Home',
    routeMetaKey: 'breadcrumb',
  }
);

const route = useRoute();
const router = useRouter();

function normalizeLabel(segment: string): string {
  return decodeURIComponent(segment)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function resolveRecordLabel(pathname: string): string | null {
  const record = router.resolve(pathname).matched.at(-1);

  if (!record) {
    return null;
  }

  const breadcrumbLabel = record.meta?.[props.routeMetaKey];
  if (typeof breadcrumbLabel === 'string' && breadcrumbLabel.trim().length > 0) {
    return breadcrumbLabel;
  }

  const titleLabel = record.meta?.title;
  if (typeof titleLabel === 'string' && titleLabel.trim().length > 0) {
    return titleLabel;
  }

  return null;
}

const _crumbs = computed<Crumb[]>(() => {
  const pathname = route.path.split(/[?#]/)[0] || '/';
  const segments = pathname.split('/').filter(Boolean);
  const result: Crumb[] = [];

  if (props.includeHome) {
    result.push({
      label: props.homeLabel,
      to: '/',
      current: segments.length === 0,
    });
  }

  let cumulativePath = '';

  for (const [index, segment] of segments.entries()) {
    cumulativePath += `/${segment}`;

    const mappedLabel = props.labelMap?.[cumulativePath];
    const resolvedLabel = resolveRecordLabel(cumulativePath);

    result.push({
      label: mappedLabel || resolvedLabel || normalizeLabel(segment),
      to: cumulativePath,
      current: index === segments.length - 1,
    });
  }

  return result;
});
</script>

<style lang="scss" scoped>
.app-breadcrumbs {
  ol {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    align-items: center;
    list-style: none;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
  }

  li {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    text-align: center;
    font-variant: small-caps;

    &:not(:last-child)::after {
      content: '/';
      opacity: 0.45;
    }
  }

  a {
    text-decoration: none;
  }

  [aria-current='page'],
  [data-state='current'] > span {
    opacity: 0.8;
    font-size: 1.125em;
  }
}
</style>
