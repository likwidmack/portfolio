<template lang="pug">
.page-content.portfolio-page.blog.blog-editorial(data-fit="prose")
  header.portfolio-hero
    p.eyebrow-container {{ content.hero.eyebrow }}
    h1.display {{ content.hero.title }}
    p.lead {{ content.hero.lede }}

  div
    div(data-region="body")
      section#posts.blog-editorial__shelf(aria-labelledby="blog-posts-heading")
        h2#blog-posts-heading.sr-only Writing shelf
        p(v-if="postsError") Unable to load published notes right now.

        .blog-editorial__empty(v-else-if="!layout.feature")
          p.eyebrow-container Coming soon
          p.lead First notes on building products, systems, and craft are still being drafted — check back soon.

        template(v-else)
          .blog-editorial__feature-row
            article.blog-editorial__card.blog-editorial__card--feature(data-variant="feature")
              .blog-editorial__feature-copy
                p(data-type="kicker") {{ layout.feature.kicker }}
                h3(data-type="panel-title")
                  NuxtLink(v-if="layout.feature.href", :to="layout.feature.href") {{ layout.feature.title }}
                  span(v-else) {{ layout.feature.title }}
                p {{ layout.feature.excerpt }}
              .blog-editorial__art(aria-hidden="true")

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

<style lang="scss" src="./index.scss" scoped></style>
