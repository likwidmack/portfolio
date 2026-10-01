<template lang="pug">
.page-content.blog-post(data-fit="prose")
  header(data-region="hero")
    p.eyebrow-container
      NuxtLink(to="/blog") Blog
    h1.display {{ post.title }}
    p.lead(v-if="post.excerpt") {{ post.excerpt }}
    p(data-type="kicker") {{ formatDate(post.publishedAt || post.createdAt) }}

  .page-with-nav
    div(data-region="body")
      article.blog-body(v-html="post.html")
</template>

<script setup lang="ts">
import type { BlogPost } from '#shared/blog-types';

type PublishedPostResponse = BlogPost & { html: string };

definePageMeta({
  breadcrumb: 'Blog',
});

const route = useRoute();
const slug = computed(() => String(route.params.slug || ''));

const { data: post } = await useContentAsyncData(
  () => `blog-post-${slug.value}`,
  () => $fetch<PublishedPostResponse>(`/api/posts/${slug.value}`),
  { watch: [slug] }
);

if (!post.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Post not found',
  });
}

useHead({
  title: post.value.title,
  meta: [
    {
      name: 'description',
      content: post.value.excerpt || post.value.title,
    },
  ],
});

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

void post;
void formatDate;
</script>

<style lang="scss" scoped>
.blog-body {
  :deep(h2),
  :deep(h3) {
    margin-top: 1.5em;
  }

  :deep(pre) {
    overflow-x: auto;
    padding: 1rem;
  }

  :deep(img) {
    max-width: 100%;
    height: auto;
  }
}
</style>
