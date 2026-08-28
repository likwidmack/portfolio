<template lang="pug">
.page-content.product
  header(data-region="hero")
    p.eyebrow-container {{ content.hero.eyebrow }}
    h1.display {{ content.hero.title }}
    p.lead {{ content.hero.lede }}

  .page-with-nav
    AppPageNav(:items="content.nav", label="Sections")

    div(data-region="body")
      section#overview(aria-labelledby="product-overview-heading")
        h2#product-overview-heading.title {{ content.overview.heading }}
        .auto-grid(data-region="intro")
          p(v-for="paragraph in content.overview.paragraphs", :key="paragraph") {{ paragraph }}
        .auto-grid(data-layout="surface", aria-label="Product highlights")
          .panel(v-for="item in content.overview.highlights", :key="item.label", data-variant="stat")
            strong {{ item.value }}
            span {{ item.label }}

      section#presentation(aria-labelledby="product-presentation-heading")
        h2#product-presentation-heading.title {{ content.presentation.heading }}
        p.lead {{ content.presentation.lede }}
        UiTabs.product-tabs(v-model:value="activeView", :tabs="content.presentation.tabs")
          template(#panel-description)
            UiPanel(:header="content.presentation.description.title")
              p(v-for="paragraph in content.presentation.description.body", :key="paragraph") {{ paragraph }}
              ul(data-list="details")
                li(v-for="bullet in content.presentation.description.bullets", :key="bullet") {{ bullet }}
          template(#panel-diagram)
            UiPanel(:header="content.presentation.diagram.title")
              p.lead(data-flush) {{ content.presentation.diagram.caption }}
              AppArchitectureDiagram(
                :caption="content.presentation.diagram.caption",
                :groups="content.presentation.diagram.groups",
                :nodes="content.presentation.diagram.nodes",
                :edges="content.presentation.diagram.edges"
              )
              p(data-type="panel-title") UML source
              UiCodeBlock(
                :code="content.presentation.diagram.umlSource",
                language="mermaid",
                :line-numbers="true",
                aria-label="UML source"
              )
          template(#panel-code)
            UiPanel(:header="content.presentation.code.title")
              p.lead(data-flush) {{ content.presentation.code.caption }}
              article.product-snippet(v-for="snippet in content.presentation.code.snippets", :key="snippet.id")
                .button-row
                  p(data-type="panel-title") {{ snippet.label }}
                  UiButton(
                    type="button",
                    icon="pi pi-copy",
                    label="Copy",
                    size="small",
                    severity="secondary",
                    variant="outlined",
                    @click="copySnippet(snippet.code, snippet.label)"
                  )
                UiCodeBlock(
                  :code="snippet.code",
                  :language="snippet.language",
                  :line-numbers="true",
                  :aria-label="snippet.label"
                )

      section#features(aria-labelledby="product-features-heading")
        h2#product-features-heading.title {{ content.features.heading }}
        .auto-grid
          .panel(v-for="feature in content.features.items", :key="feature.title", data-variant="capability")
            p(data-type="panel-title") {{ feature.title }}
            p {{ feature.body }}

      section#feedback(aria-labelledby="product-feedback-heading")
        h2#product-feedback-heading.title {{ content.feedback.heading }}
        p.lead {{ content.feedback.lede }}
        UiMessage(severity="info", :closable="false") Toasts appear in the top-right. Try the samples below.
        .button-row(aria-label="Toast samples")
          UiButton(
            v-for="action in content.feedback.actions",
            :key="action.id",
            type="button",
            :label="action.label",
            :severity="action.severity === 'warn' ? 'warn' : action.severity",
            @click="fireToast(action)"
          )
</template>

<script setup lang="ts">
import type { Collections } from '@nuxt/content';
import type { AppToastSeverity } from '../../composables/useAppToast';

type ProductContent = Collections['product'];

definePageMeta({
  breadcrumb: 'Product',
});

const { data: productContent } = await useContentAsyncData('product-content', () =>
  fetchContentCollection<ProductContent>('product', { mode: 'first' })
);

if (!productContent.value) {
  throw createError({
    statusCode: 500,
    statusMessage: 'Product content not found',
  });
}

const content = computed(() => productContent.value as ProductContent);
const toast = useAppToast();
const activeView = ref(content.value.presentation.tabs[0]?.value ?? 'description');

watch(activeView, (view) => {
  const label = content.value.presentation.tabs.find((tab) => tab.value === view)?.label ?? String(view);
  toast.show({
    severity: 'info',
    summary: 'View updated',
    detail: `Showing ${label}`,
    life: 2200,
  });
});

async function copySnippet(code: string, label: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(code);
    toast.show({
      severity: 'success',
      summary: 'Copied',
      detail: `${label} is on your clipboard.`,
    });
  } catch {
    toast.show({
      severity: 'warn',
      summary: 'Copy failed',
      detail: 'Clipboard permission was denied.',
    });
  }
}

function fireToast(action: { detail: string; severity: AppToastSeverity; summary: string }): void {
  toast.show({
    severity: action.severity,
    summary: action.summary,
    detail: action.detail,
  });
}

useHead({
  title: content.value.seo.title,
  meta: [{ name: 'description', content: content.value.seo.description }],
});
</script>

<style lang="scss" scoped>
.product {
  display: grid;
  gap: var(--section-gap, 2rem);

  section {
    width: 100%;
  }

  .display {
    animation: neonPulse 2s ease-in-out infinite;
  }

  [data-region='hero'] {
    display: grid;
    gap: 0.75rem;
  }

  [data-region='body'] {
    display: grid;
    gap: var(--section-gap, 2rem);
    min-width: 0;
  }

  [data-region='intro'] p,
  [data-flush],
  [data-type='panel-title'],
  [data-list='details'] {
    margin: 0;
  }

  [data-type='panel-title'] {
    font-size: var(--font-size-xl);
    font-weight: 600;
    line-height: 1.25;
  }

  [data-list='details'] {
    display: grid;
    gap: 0.45rem;
    margin-top: 0.85rem;
    padding-left: 1.1rem;
  }

  .panel[data-variant='stat'] {
    display: grid;
    gap: 0.25rem;

    strong {
      color: var(--primary-color);
      font-size: var(--font-size-lg);
      line-height: 1.25;
    }
  }

  .panel[data-variant='capability'] {
    display: grid;
    gap: 0.45rem;
  }

  :deep(.panel),
  :deep(.p-panel) {
    margin: 0;
  }

  .product-tabs {
    margin-top: 0.75rem;
  }

  .product-snippet {
    display: grid;
    gap: 0.65rem;
    margin-top: 1rem;

    .button-row {
      justify-content: space-between;
      margin-bottom: 0;
    }
  }

  .button-row {
    margin-top: 0.75rem;
  }
}
</style>
