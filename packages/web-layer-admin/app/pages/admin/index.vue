<template lang="pug">
.page-content.admin
  header(data-region="hero")
    p.eyebrow-container Admin
    h1.display Sign in
    p.lead Enter the shared admin token for this environment.

  .page-with-nav
    div(data-region="body")
      form.admin-gate(@submit.prevent="onSubmit")
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
          UiButton(
            type="submit",
            :label="checking ? 'Checking…' : 'Continue'",
            icon="lock-open",
            :disabled="!token.trim() || checking"
          )
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
import { useAdminSession } from '../../composables/useAdminSession';
import { safeAdminRedirect } from '../../utils/admin-auth-redirect';
import { type AdminTokenCheck, verifyAdminToken } from '../../utils/admin-fetch';
import { rejectedTokenMessage, signInErrorMessage } from '../../utils/admin-sign-in-messages';

definePageMeta({
  breadcrumb: 'Admin',
});

const route = useRoute();
const { token: storedToken, signedIn, signIn, signOut } = useAdminSession();

const token = ref(storedToken.value);
const hasStored = computed(() => signedIn.value);
const message = ref('');
const messageSeverity = ref<'success' | 'error' | 'info' | 'warn'>('info');
const checking = ref(false);

const focusToken = async () => {
  await nextTick();
  document.getElementById('admin-token')?.focus();
};

onMounted(async () => {
  if (route.query.expired === '1') {
    messageSeverity.value = 'warn';
    message.value = 'Session expired — enter the token again.';
    await focusToken();
  }
});

const onSubmit = async () => {
  const candidate = token.value.trim();
  if (!candidate || checking.value) return;
  checking.value = true;
  message.value = '';
  let check: AdminTokenCheck;
  try {
    check = await verifyAdminToken(candidate);
  } catch (error) {
    messageSeverity.value = 'error';
    message.value = signInErrorMessage(error);
    return;
  } finally {
    checking.value = false;
  }
  if (!check.ok) {
    messageSeverity.value = 'error';
    message.value = rejectedTokenMessage(check.statusMessage);
    await focusToken();
    return;
  }
  signIn(candidate);
  messageSeverity.value = 'success';
  message.value = 'Token saved for this browser session.';
  navigateTo(safeAdminRedirect(route.query.redirect));
};

const onClear = () => {
  signOut();
  token.value = '';
  messageSeverity.value = 'info';
  message.value = 'Saved token cleared.';
};

useHead({
  title: 'Admin',
  meta: [{ name: 'robots', content: 'noindex' }],
});

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
