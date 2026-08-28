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
          UiButton(type="submit", label="Save", icon="pi pi-save", :disabled="saving")
          UiButton(
            v-if="!isNew",
            type="button",
            label="Delete",
            icon="pi pi-trash",
            severity="danger",
            variant="outlined",
            :disabled="saving",
            @click="onDelete"
          )
        UiMessage(v-if="formMessage", :severity="formSeverity") {{ formMessage }}
</template>

<script setup lang="ts">
import { normalizeSlug, type BlogPost, type BlogPostStatus } from '@tgmc/web-layer-admin/shared/blog-types';
import { adminAuthHeaders, fetchErrorMessage, fetchErrorStatus, readAdminToken } from '../../../utils/admin-token';

definePageMeta({
  breadcrumb: 'Admin Blog',
});

const route = useRoute();
const config = useRuntimeConfig();
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
  (title) => {
    if (isNew.value && !form.slug) {
      form.slug = normalizeSlug(title);
    }
  }
);

onMounted(async () => {
  if (!writesEnabled.value) {
    return;
  }
  if (!readAdminToken()) {
    await navigateTo('/admin');
    return;
  }

  if (isNew.value) {
    return;
  }

  try {
    const post = await $fetch<BlogPost>(`/api/admin/posts/${idParam.value}`, {
      headers: adminAuthHeaders(),
    });
    form.title = post.title;
    form.slug = post.slug;
    form.excerpt = post.excerpt;
    form.body = post.body;
    form.status = post.status;
  } catch (error: unknown) {
    const status = fetchErrorStatus(error);
    if (status === 401) {
      await navigateTo('/admin');
      return;
    }
    loadError.value = status === 404 ? 'Post not found.' : 'Unable to load post.';
  }
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
      const created = await $fetch<BlogPost>('/api/admin/posts', {
        method: 'POST',
        headers: adminAuthHeaders(),
        body: payload,
      });
      formSeverity.value = 'success';
      formMessage.value = 'Post created.';
      await navigateTo(`/admin/blog/${created.id}`);
      return;
    }

    await $fetch(`/api/admin/posts/${idParam.value}`, {
      method: 'PUT',
      headers: adminAuthHeaders(),
      body: payload,
    });
    formSeverity.value = 'success';
    formMessage.value = 'Post saved.';
  } catch (error: unknown) {
    if (fetchErrorStatus(error) === 401) {
      await navigateTo('/admin');
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
    await $fetch(`/api/admin/posts/${idParam.value}`, {
      method: 'DELETE',
      headers: adminAuthHeaders(),
    });
    await navigateTo('/admin/blog');
  } catch (error: unknown) {
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
