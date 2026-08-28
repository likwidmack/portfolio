<template lang="pug">
.page-content.portfolio-page.blog.blog-editorial(data-fit="prose")
  header.portfolio-hero
    p.eyebrow-container {{ content.hero.eyebrow }}
    h1.display {{ content.hero.title }}
    p.lead {{ content.hero.lede }}

  .page-with-nav
    div(data-region="body")
      section#posts.blog-editorial__shelf(aria-labelledby="blog-posts-heading")
        h2#blog-posts-heading.sr-only Writing shelf
        p(v-if="postsError") Unable to load published notes right now.
        p(v-else-if="!layout.feature") No writing yet.

        template(v-else)
          .blog-editorial__feature-row
            article.blog-editorial__card.blog-editorial__card--feature(data-variant="feature")
              p(data-type="kicker") {{ layout.feature.kicker }}
              h3(data-type="panel-title")
                NuxtLink(v-if="layout.feature.href", :to="layout.feature.href") {{ layout.feature.title }}
                span(v-else) {{ layout.feature.title }}
              p {{ layout.feature.excerpt }}

            .blog-editorial__primary
              article.blog-editorial__card(v-for="card in layout.primaryCells", :key="card.id", data-variant="cell")
                p(data-type="kicker") {{ card.kicker }}
                h3(data-type="panel-title")
                  NuxtLink(v-if="card.href", :to="card.href") {{ card.title }}
                  span(v-else) {{ card.title }}
                p {{ card.excerpt }}

          .blog-editorial__secondary(v-if="layout.secondaryCells.length")
            article.blog-editorial__card(v-for="card in layout.secondaryCells", :key="card.id", data-variant="cell")
              p(data-type="kicker") {{ card.kicker }}
              h3(data-type="panel-title")
                NuxtLink(v-if="card.href", :to="card.href") {{ card.title }}
                span(v-else) {{ card.title }}
              p {{ card.excerpt }}
</template>

<script setup lang="ts">
import type { BlogPost } from '#shared/blog-types';
import { buildWritingGrid, partitionWritingGrid, type WritingContent } from '#shared/writing-types';

definePageMeta({
  breadcrumb: 'Writing',
});

const { data: writingContent } = await useContentAsyncData('writing-content', () =>
  fetchContentCollection<WritingContent>('writing', { mode: 'first' })
);

if (!writingContent.value) {
  throw createError({ statusCode: 500, statusMessage: 'Writing content not found' });
}

const content = computed(() => writingContent.value as WritingContent);

const { data: posts, error: postsError } = await useContentAsyncData('blog-posts', () =>
  $fetch<BlogPost[]>('/api/posts')
);

const formatDate = (iso: string) => {
  try {
    return new Intl.DateTimeFormat('en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const layout = computed(() =>
  partitionWritingGrid(buildWritingGrid(content.value.essays, posts.value ?? [], formatDate))
);

usePortfolioSeo({
  title: content.value.seo.title,
  description: content.value.seo.description,
  path: '/blog',
});
</script>

<style lang="scss" scoped>
.blog-editorial {
  display: grid;
  gap: var(--section-gap, 2rem);
  width: 100%;

  &__shelf {
    display: grid;
    gap: 0.75rem;
    width: 100%;
    min-width: 0;
  }

  &__feature-row {
    display: grid;
    gap: 0.75rem;
    width: 100%;
    min-width: 0;

    @media (min-width: $breakpoint-tablet) {
      grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
      align-items: stretch;
    }
  }

  &__primary {
    display: grid;
    gap: 0.75rem;
    min-width: 0;
  }

  &__secondary {
    display: grid;
    gap: 0.75rem;
    width: 100%;
    min-width: 0;

    @media (min-width: $breakpoint-tablet) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  &__card {
    display: grid;
    gap: 0.5rem;
    min-width: 0;
    padding: 0.85rem 1rem;
    border: 1px solid var(--border-color, var(--portfolio-rule));
    background: var(--surface-color, var(--main-background-secondary));
    color: inherit;

    &[data-variant='feature'] {
      padding: 1.1rem 1.15rem;
      min-height: 11rem;
      background: var(--main-background-secondary, var(--surface-color));

      [data-type='kicker'] {
        color: var(--primary-color);
      }

      [data-type='panel-title'] {
        font-size: clamp(1.15rem, 2.4vw, 1.35rem);
        line-height: 1.25;
      }
    }

    &[data-variant='cell'] {
      background: color-mix(in srgb, var(--surface-color, var(--main-background-secondary)) 88%, transparent);
    }

    [data-type='kicker'] {
      margin: 0;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--text-color-secondary, inherit);
    }

    [data-type='panel-title'] {
      margin: 0;
      font-size: 1.05rem;
      line-height: 1.3;
      overflow-wrap: anywhere;

      a {
        color: inherit;
        text-decoration: none;

        &:hover,
        &:focus-visible {
          text-decoration: underline;
          text-underline-offset: 0.12em;
        }
      }
    }

    p:not([data-type]) {
      margin: 0;
      color: var(--text-color-secondary, inherit);
      font-size: 0.95rem;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
