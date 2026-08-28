<template lang="pug">
.page-content.admin
  header(data-region="hero")
    p.eyebrow-container Admin
    h1.display Sign in
    p.lead Enter the shared admin token for this environment.

  .page-with-nav
    div(data-region="body")
      UiMessage(v-if="!writesEnabled", severity="warn")
        | Admin writes are disabled. Set ADMIN_TOKEN (or NUXT_ADMIN_TOKEN) and restart the server.
      form.admin-gate(v-else, @submit.prevent="onSubmit")
        label(for="admin-token") Admin token
        UiPassword(
          v-model="token",
          input-id="admin-token",
          name="admin-token",
          aria-label="Admin token",
          :feedback="false",
          toggle-mask
        )
        .button-row
          UiButton(type="submit", label="Continue", icon="pi pi-lock-open", :disabled="!token.trim()")
          UiButton(
            v-if="hasStored",
            type="button",
            label="Clear saved token",
            severity="secondary",
            variant="outlined",
            @click="onClear"
          )
        UiMessage(v-if="message", :severity="messageSeverity") {{ message }}
</template>

<script setup lang="ts">
import { clearAdminToken, readAdminToken, writeAdminToken } from '../../utils/admin-token';

definePageMeta({
  breadcrumb: 'Admin',
});

const config = useRuntimeConfig();
const writesEnabled = computed(() => Boolean(config.public.adminWritesEnabled));

const token = ref('');
const hasStored = ref(false);
const message = ref('');
const messageSeverity = ref<'success' | 'error' | 'info'>('info');

onMounted(() => {
  const stored = readAdminToken();
  hasStored.value = Boolean(stored);
  if (stored) {
    token.value = stored;
  }
});

const onSubmit = () => {
  writeAdminToken(token.value);
  hasStored.value = Boolean(token.value.trim());
  messageSeverity.value = 'success';
  message.value = 'Token saved for this browser session.';
  navigateTo('/admin/blog');
};

const onClear = () => {
  clearAdminToken();
  token.value = '';
  hasStored.value = false;
  messageSeverity.value = 'info';
  message.value = 'Saved token cleared.';
};

useHead({
  title: 'Admin',
  meta: [{ name: 'robots', content: 'noindex' }],
});

void writesEnabled.value;
void onSubmit;
void onClear;
</script>

<style lang="scss" scoped>
.admin-gate {
  display: grid;
  gap: 0.75rem;
  max-width: 28rem;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
</style>
