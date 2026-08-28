<template lang="pug">
.page-content.admin-blog
  header(data-region="hero")
    p.eyebrow-container Admin
    h1.display Blog posts
    p.lead Draft, publish, and manage posts.
    .button-row
      UiButton(as="a", href="/admin/blog/new", label="New post", icon="pi pi-plus")
      UiButton(as="a", href="/admin", label="Token", icon="pi pi-key", severity="secondary", variant="outlined")

  .page-with-nav
    div(data-region="body")
      UiMessage(v-if="!writesEnabled", severity="warn")
        | Admin writes are disabled (ADMIN_TOKEN not configured).
      UiMessage(v-else-if="errorMessage", severity="error") {{ errorMessage }}
      template(v-else)
        .button-row(data-region="filters", role="group", aria-label="Filter posts by status")
          UiButton(
            label="All",
            :severity="statusFilter === 'all' ? 'primary' : 'secondary'",
            :variant="statusFilter === 'all' ? undefined : 'outlined'",
            @click="statusFilter = 'all'"
          )
          UiButton(
            label="Drafts",
            :severity="statusFilter === 'draft' ? 'primary' : 'secondary'",
            :variant="statusFilter === 'draft' ? undefined : 'outlined'",
            @click="statusFilter = 'draft'"
          )
          UiButton(
            label="Published",
            :severity="statusFilter === 'published' ? 'primary' : 'secondary'",
            :variant="statusFilter === 'published' ? undefined : 'outlined'",
            @click="statusFilter = 'published'"
          )
        p(v-if="pending") Loading…
        p(v-else-if="!posts?.length") No posts yet.
        p(v-else-if="!filteredPosts.length") No {{ statusFilter }} posts.
        ul.admin-post-list(v-else)
          li(v-for="post in filteredPosts", :key="post.id")
            article.panel
              p(data-type="kicker")
                span.admin-post-status(:data-status="post.status") {{ post.status }}
                |
                | · {{ formatDate(post.updatedAt) }}
              p(data-type="panel-title")
                NuxtLink(:to="`/admin/blog/${post.id}`") {{ post.title }}
              p /blog/{{ post.slug }}
</template>

<script setup lang="ts">
import type { BlogPost, BlogPostStatus } from '@tgmc/web-layer-admin/shared/blog-types';
import { adminAuthHeaders, fetchErrorStatus, readAdminToken } from '../../../utils/admin-token';

definePageMeta({
  breadcrumb: 'Admin Blog',
});

type StatusFilter = 'all' | BlogPostStatus;

const config = useRuntimeConfig();
const writesEnabled = computed(() => Boolean(config.public.adminWritesEnabled));
const errorMessage = ref('');
const posts = ref<BlogPost[] | null>(null);
const pending = ref(true);
const statusFilter = ref<StatusFilter>('all');

const filteredPosts = computed(() => {
  const list = posts.value ?? [];
  if (statusFilter.value === 'all') {
    return list;
  }
  return list.filter((post) => post.status === statusFilter.value);
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

onMounted(async () => {
  if (!writesEnabled.value) {
    pending.value = false;
    return;
  }
  if (!readAdminToken()) {
    await navigateTo('/admin');
    return;
  }

  try {
    posts.value = await $fetch<BlogPost[]>('/api/admin/posts', {
      headers: adminAuthHeaders(),
    });
  } catch (error: unknown) {
    if (fetchErrorStatus(error) === 401) {
      errorMessage.value = 'Unauthorized — check the admin token.';
      await navigateTo('/admin');
      return;
    }
    errorMessage.value = 'Unable to load posts.';
  } finally {
    pending.value = false;
  }
});

useHead({
  title: 'Admin · Blog',
  meta: [{ name: 'robots', content: 'noindex' }],
});

void posts.value;
void pending.value;
void errorMessage.value;
void filteredPosts.value;
void statusFilter.value;
void formatDate;
</script>

<style lang="scss" scoped>
.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.admin-post-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1rem;
}

.admin-post-status {
  text-transform: uppercase;
  letter-spacing: 0.04em;

  &[data-status='draft'] {
    color: var(--text-color-secondary, inherit);
  }

  &[data-status='published'] {
    color: var(--primary-color, inherit);
  }
}
</style>
