<template lang="pug">
NuxtLayout(name="default")
  .error-page.page-content
    header(data-region="header")
      h1 Error
      p.lead Page-level error handler with detailed trace output.

    UiMessage(data-region="banner", :severity="bannerSeverity", :closable="false")
      span(v-if="isPageThrownError") Rendering details for a page-thrown error.
      span(v-else) This handler is scoped to page-thrown errors. The current error does not look page-originated.

    UiCard(data-region="content")
      template(#content)
        .button-row(data-region="summary")
          UiTag(:value="`Status ${statusLabel}`", :severity="statusTagSeverity", rounded)

        dl(data-region="meta")
          dt Message
          dd {{ normalizedMessage }}

        UiDivider

        section(v-if="errorStatusMessage", data-region="panel")
          h2 Status Message
          UiCodeBlock(
            :code="errorStatusMessage",
            language="text",
            render-mode="client-only",
            aria-label="Status message details"
          )

        section(v-if="normalizedData", data-region="panel")
          h2 Error Data
          UiCodeBlock(
            :code="normalizedData",
            language="json",
            render-mode="client-only",
            aria-label="Serialized error data"
          )

        section(v-if="htmlHint", data-region="panel")
          h2 HTML / Template Hint
          UiCodeBlock(:code="htmlHint", language="html", render-mode="client-only", aria-label="Template parsing hint")

        section(v-if="combinedTrace", data-region="panel")
          h2 Full Trace
          UiCodeBlock(:code="combinedTrace", language="bash", render-mode="client-only", aria-label="Full error trace")

    .button-row(data-region="actions")
      UiButton(label="Reload", icon="pi pi-refresh", severity="secondary", variant="outlined", @click="handleReload")
      UiButton(label="Back Home", icon="pi pi-home", @click="handleClearError")
</template>

<script setup lang="ts">
import type { NuxtError } from 'nuxt/app';
import {
  buildErrorSnapshot,
  htmlTemplateHint,
  isPageOriginatedError,
  statusTagSeverityFor,
  type ErrorSnapshot,
} from './utils/error-snapshot';

const props = defineProps<{
  error: NuxtError & {
    data?: unknown;
    cause?: unknown;
  };
}>();

const route = useRoute();

const errorSnapshot = useState<ErrorSnapshot>('error-page-snapshot', () => buildErrorSnapshot(props.error));
const errorStatusMessage = computed(() => errorSnapshot.value.statusMessage);

const normalizedMessage = computed(() => {
  return errorSnapshot.value.message || errorSnapshot.value.statusMessage || 'Unknown error';
});

const statusLabel = computed(() => {
  const code = errorSnapshot.value.statusCode;
  return code ? `${code}` : 'n/a';
});

const statusTagSeverity = computed(() => statusTagSeverityFor(errorSnapshot.value.statusCode));

const normalizedData = computed(() => errorSnapshot.value.dataSerialized);
const combinedTrace = computed(() => errorSnapshot.value.trace);

const htmlHint = computed(() => htmlTemplateHint(normalizedMessage.value, combinedTrace.value));

const isPageThrownError = computed(() =>
  isPageOriginatedError({
    trace: combinedTrace.value,
    routePath: route.path || '',
    origin: errorSnapshot.value.origin,
    scope: errorSnapshot.value.scope,
    htmlHint: htmlHint.value,
  })
);

const bannerSeverity = computed(() => (isPageThrownError.value ? 'success' : 'warn'));

async function handleClearError() {
  await clearError({ redirect: '/' });
}

function handleReload() {
  if (import.meta.client) {
    window.location.reload();
  }
}

// Pug ESLint does not always see template usages; expose keeps bindings live for tooling.
defineExpose({
  bannerSeverity,
  combinedTrace,
  errorStatusMessage,
  handleClearError,
  handleReload,
  htmlHint,
  isPageThrownError,
  normalizedData,
  normalizedMessage,
  statusLabel,
  statusTagSeverity,
});
</script>
