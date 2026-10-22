<template lang="pug">
.page-content.admin-blog-edit
  header(data-region="hero")
    p.eyebrow-container Admin
    h1.display {{ isNew ? 'New post' : 'Edit post' }}
    p.lead Markdown body · draft or publish.
    .button-row
      UiButton(as="a", href="/admin/blog", label="Back", severity="secondary", variant="outlined")

  .page-with-nav
    div(data-region="body")
      UiMessage(v-if="!writesEnabled", severity="warn")
        | Admin writes are disabled (ADMIN_TOKEN not configured).
      UiMessage(v-else-if="loadError", severity="error") {{ loadError }}
      form.admin-form(v-else, @submit.prevent="onSave")
        label(for="post-title") Title
        UiInputText(v-model="form.title", input-id="post-title", name="title", aria-label="Title")

        label(for="post-slug") Slug
        UiInputText(v-model="form.slug", input-id="post-slug", name="slug", aria-label="Slug")

        label(for="post-excerpt") Excerpt
        UiTextarea(v-model="form.excerpt", input-id="post-excerpt", name="excerpt", :rows="2", aria-label="Excerpt")

        label(for="post-body") Body (markdown)
        UiTextarea(v-model="form.body", input-id="post-body", name="body", :rows="16", aria-label="Body")

        label(for="post-status") Status
        UiSelect(
          v-model="form.status",
          input-id="post-status",
          name="status",
          :options="statusOptions",
          option-label="label",
          option-value="value",
          aria-label="Status"
        )

        .button-row
          UiButton(type="submit", label="Save", icon="save", :disabled="saving")
          UiButton(
            v-if="!isNew",
            type="button",
            label="Delete",
            icon="trash-2",
            severity="danger",
            variant="outlined",
            :disabled="saving",
            @click="onDelete"
          )
        UiMessage(v-if="formMessage", :severity="formSeverity") {{ formMessage }}
</template>

<script setup lang="ts">
import { normalizeSlug, type BlogPost, type BlogPostStatus } from '@tgmc/web-layer-admin/shared/blog-types';
import { useAdminSession } from '../../../composables/useAdminSession';
import { useAdminFetch } from '../../../utils/admin-fetch';
import { fetchErrorMessage, fetchErrorStatus } from '../../../utils/fetch-error';

definePageMeta({
  breadcrumb: 'Admin Blog',
  middleware: 'admin-auth',
});

const route = useRoute();
const config = useRuntimeConfig();
const { database: adminDatabase } = useAdminSession();
const adminFetch = useAdminFetch();
const writesEnabled = computed(() => Boolean(config.public.adminWritesEnabled));

const idParam = computed(() => String(route.params.id || ''));
const isNew = computed(() => idParam.value === 'new' || route.path.endsWith('/new'));

const statusOptions = [
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
];

const form = reactive({
  title: '',
  slug: '',
  excerpt: '',
  body: '',
  status: 'draft' as BlogPostStatus,
});

const saving = ref(false);
const loadError = ref('');
const formMessage = ref('');
const formSeverity = ref<'success' | 'error' | 'info'>('info');

watch(
  () => form.title,
  (title, previousTitle) => {
    // Follow the title until the slug is edited by hand.
    if (isNew.value && form.slug === normalizeSlug(previousTitle ?? '')) {
      form.slug = normalizeSlug(title);
    }
  }
);

const loadPost = async () => {
  if (!writesEnabled.value) {
    return;
  }

  if (isNew.value) {
    loadError.value = '';
    return;
  }

  loadError.value = '';
  try {
    const post = await adminFetch<BlogPost>(`/api/admin/posts/${idParam.value}`);
    form.title = post.title;
    form.slug = post.slug;
    form.excerpt = post.excerpt;
    form.body = post.body;
    form.status = post.status;
  } catch (error: unknown) {
    const status = fetchErrorStatus(error);
    if (status === 401) {
      return;
    }
    loadError.value = status === 404 ? 'Post not found.' : 'Unable to load post.';
  }
};

onMounted(() => {
  void loadPost();
});

watch(adminDatabase, () => {
  void loadPost(); // edit form reloads from the newly selected backend
});

const onSave = async () => {
  formMessage.value = '';
  saving.value = true;
  try {
    const payload = {
      title: form.title,
      slug: form.slug,
      excerpt: form.excerpt,
      body: form.body,
      status: form.status,
    };

    if (isNew.value) {
      const created = await adminFetch<BlogPost>('/api/admin/posts', {
        method: 'POST',
        body: payload,
      });
      formSeverity.value = 'success';
      formMessage.value = 'Post created.';
      await navigateTo(`/admin/blog/${created.id}`);
      return;
    }

    await adminFetch(`/api/admin/posts/${idParam.value}`, {
      method: 'PUT',
      body: payload,
    });
    formSeverity.value = 'success';
    formMessage.value = 'Post saved.';
  } catch (error: unknown) {
    if (fetchErrorStatus(error) === 401) {
      return;
    }
    formSeverity.value = 'error';
    formMessage.value = fetchErrorMessage(error) || 'Save failed.';
  } finally {
    saving.value = false;
  }
};

const onDelete = async () => {
  if (isNew.value) {
    return;
  }
  if (!confirm('Delete this post permanently?')) {
    return;
  }
  saving.value = true;
  try {
    await adminFetch(`/api/admin/posts/${idParam.value}`, {
      method: 'DELETE',
    });
    await navigateTo('/admin/blog');
  } catch (error: unknown) {
    if (fetchErrorStatus(error) === 401) {
      return;
    }
    formSeverity.value = 'error';
    formMessage.value = fetchErrorMessage(error) || 'Delete failed.';
  } finally {
    saving.value = false;
  }
};

useHead({
  title: isNew.value ? 'Admin · New post' : 'Admin · Edit post',
  meta: [{ name: 'robots', content: 'noindex' }],
});

void form;
void onSave;
void onDelete;
void statusOptions;
</script>

<style lang="scss" scoped>
.admin-form {
  display: grid;
  gap: 0.75rem;
  max-width: 48rem;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
</style>
