<template lang="pug">
.page-content.blog
  header(data-region="hero")
    p.eyebrow-container Writing
    h1.display Blog
    p.lead Notes on building products, systems, and craft.

  .page-with-nav
    div(data-region="body")
      section#posts(aria-labelledby="blog-posts-heading")
        h2#blog-posts-heading.title Posts
        p(v-if="error") Unable to load posts right now.
        p(v-else-if="!posts?.length") No published posts yet.
        ul.blog-list(v-else, data-list="posts")
          li(v-for="post in posts", :key="post.id")
            article.panel(data-variant="post")
              p(data-type="kicker") {{ formatDate(post.publishedAt || post.createdAt) }}
              h3(data-type="panel-title")
                NuxtLink(:to="`/blog/${post.slug}`") {{ post.title }}
              p(v-if="post.excerpt") {{ post.excerpt }}
</template>

<script setup lang="ts">
import type { BlogPost } from '#shared/blog-types';

definePageMeta({
  breadcrumb: 'Blog',
});

const { data: posts, error } = await useContentAsyncData('blog-posts', () => $fetch<BlogPost[]>('/api/posts'));

useHead({
  title: 'Blog',
  meta: [{ name: 'description', content: 'Published writing and notes.' }],
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

void formatDate;
</script>

<style lang="scss" scoped>
.blog-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1.25rem;
}

.panel[data-variant='post'] {
  a {
    text-decoration: none;

    &:hover,
    &:focus-visible {
      text-decoration: underline;
    }
  }
}
</style>
