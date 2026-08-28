<template lang="pug">
UiDialog.evidence-examples-dialog(
  v-model:visible="visible",
  header="Evidence examples",
  aria-label="Evidence examples from shipped work",
  modal,
  closable,
  dismissable-mask
)
  p.evidence-examples-dialog__lede
    | Inspectable samples of&nbsp;
    strong code
    | ,&nbsp;
    strong data
    | , and&nbsp;
    strong styles
    |
    | from work already on this site—sanitized, typed, and linked to live surfaces.

  UiTabs.evidence-examples-dialog__tabs(v-model:value="activeTab", :tabs="tabs")
    template(#panel-code)
      .evidence-example-list(aria-label="Code evidence examples")
        article.evidence-example-card(v-for="example in codeExamples", :key="example.id")
          header
            p.eyebrow-container {{ example.sourceLabel }}
            h3 {{ example.title }}
            p {{ example.summary }}
          UiCodeBlock(
            :code="example.code",
            :language="example.language",
            render-mode="ssr",
            :line-numbers="true",
            :aria-label="`${example.title} code sample`"
          )
          NuxtLink.evidence-example-card__link(v-if="example.href", :to="example.href")
            | Open related surface
            span(aria-hidden="true") ↗

    template(#panel-data)
      .evidence-example-list(aria-label="Data evidence examples")
        article.evidence-example-card(v-for="example in dataExamples", :key="example.id")
          header
            p.eyebrow-container {{ example.sourceLabel }}
            h3 {{ example.title }}
            p {{ example.summary }}
          UiCodeBlock(
            :code="example.code",
            :language="example.language",
            render-mode="ssr",
            :line-numbers="true",
            :aria-label="`${example.title} data sample`"
          )
          NuxtLink.evidence-example-card__link(v-if="example.href", :to="example.href")
            | Open related surface
            span(aria-hidden="true") ↗

    template(#panel-styles)
      .evidence-example-list(aria-label="Styles evidence examples")
        .evidence-example-card__preview(aria-label="Live style preview")
          .button-row
            UiButton(label="Primary", type="button")
            UiButton(label="Secondary", type="button", severity="secondary", variant="outlined")
          ul.tag-list
            li tokens
            li lanes
            li a11y
        article.evidence-example-card(v-for="example in stylesExamples", :key="example.id")
          header
            p.eyebrow-container {{ example.sourceLabel }}
            h3 {{ example.title }}
            p {{ example.summary }}
          UiCodeBlock(
            :code="example.code",
            :language="example.language",
            render-mode="ssr",
            :line-numbers="true",
            :aria-label="`${example.title} styles sample`"
          )
          NuxtLink.evidence-example-card__link(v-if="example.href", :to="example.href")
            | Open related surface
            span(aria-hidden="true") ↗

  template(#footer)
    UiButton(label="Close", type="button", severity="secondary", variant="outlined", @click="visible = false")
</template>

<script setup lang="ts">
import { EVIDENCE_EXAMPLE_TABS, evidenceExamplesByKind, type EvidenceExampleKind } from '#shared/evidence-examples';

const visible = defineModel<boolean>('visible', { default: false });
const activeTab = ref<EvidenceExampleKind>('code');

const tabs = EVIDENCE_EXAMPLE_TABS;
const codeExamples = evidenceExamplesByKind('code');
const dataExamples = evidenceExamplesByKind('data');
const stylesExamples = evidenceExamplesByKind('styles');

watch(visible, (open) => {
  if (open) {
    activeTab.value = 'code';
  }
});
</script>
