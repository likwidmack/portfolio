<template lang="pug">
.ui-code-block(v-bind="$attrs")
  template(v-if="renderMode === 'client-only'")
    ClientOnly
      .syntax-frame(
        :class="{ 'has-line-numbers': lineNumbers }",
        :data-language="normalizedLanguage",
        v-bind="frameA11y"
      )
        ol.syntax-line-numbers(v-if="lineNumbers", aria-hidden="true")
          li(v-for="n in lineCount", :key="n")
            span {{ n }}
        .syntax-code-pane(v-html="codePaneHtml")
      template(#fallback)
        .syntax-frame(
          data-fallback,
          :class="{ 'has-line-numbers': lineNumbers }",
          :data-language="normalizedLanguage",
          v-bind="frameA11y"
        )
          ol.syntax-line-numbers(v-if="lineNumbers", aria-hidden="true")
            li(v-for="n in lineCount", :key="n")
              span {{ n }}
          .syntax-code-pane
            pre.syntax-block(:class="preClassList", :data-language="normalizedLanguage")
              code(:class="codeClassList", v-text="code")
  template(v-else)
    .syntax-frame(
      :class="{ 'has-line-numbers': lineNumbers }",
      :data-language="normalizedLanguage",
      v-bind="frameA11y"
    )
      ol.syntax-line-numbers(v-if="lineNumbers", aria-hidden="true")
        li(v-for="n in lineCount", :key="n")
          span {{ n }}
      .syntax-code-pane(v-html="codePaneHtml")
</template>

<script setup lang="ts">
/** Reusable pre/code block that maps into global syntax.scss token styles. */
import { applySyntaxByLanguage } from '#shared/syntax/tools/apply-syntax-by-language';
import { countCodeLines, escapeHtmlText } from '#shared/syntax/tools/code-block-utils';
import { normalizeLanguageAlias } from '#shared/syntax/tools/html-attr-utils';

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<{
    code: string;
    language?: string;
    ariaLabel?: string;
    lineNumbers?: boolean;
    renderMode?: 'ssr' | 'client-only';
    /**
     * `false`: a static preview (the gallery grid tile, whose "Open in feed" button is the control) —
     * the frame is not a tab stop or landmark and does not scroll (it crops), so there is no
     * keyboard-unreachable scroll container and no focus ring to clip.
     */
    focusable?: boolean;
  }>(),
  {
    language: 'text',
    lineNumbers: false,
    renderMode: 'client-only',
    focusable: true,
  }
);

const normalizedLanguage = computed(() => props.language.toLowerCase().trim() || 'text');
const codeClassList = computed(() => [`syntax-code`, `language-${normalizedLanguage.value}`]);
const preClassList = computed(() => [`language-${normalizedLanguage.value}`]);
/** Region name: "Code: <language>" unless the caller labels the sample (empty/whitespace falls back). */
const regionLabel = computed(() => {
  const caller = props.ariaLabel?.trim();
  return caller || `Code: ${normalizedLanguage.value}`;
});
/** A scrolling frame is a named, focusable region (WCAG 2.1.1); a static preview is neither. */
const frameA11y = computed(() =>
  props.focusable ? { role: 'region', tabindex: '0', 'aria-label': regionLabel.value } : { 'data-preview': '' }
);
const renderMode = computed(() => props.renderMode);
const lineCount = computed(() => countCodeLines(props.code));

/** Highlighted `<pre><code>` only — line numbers live in a sibling container. */
const codePaneHtml = computed(() => {
  const canonicalLanguage = normalizeLanguageAlias(normalizedLanguage.value) ?? normalizedLanguage.value;
  const escaped = escapeHtmlText(props.code);
  const preAttrs = ` class="syntax-block language-${canonicalLanguage}" data-language="${canonicalLanguage}"`;
  const codeAttrs = ` class="syntax-code language-${canonicalLanguage}"`;
  const block = `<pre${preAttrs}><code${codeAttrs}>${escaped}</code></pre>`;
  return applySyntaxByLanguage(canonicalLanguage, block);
});

const consumeTemplateData = (value: unknown) => value;

consumeTemplateData({
  preClassList,
  codeClassList,
  renderMode,
  regionLabel,
  frameA11y,
  codePaneHtml,
  lineCount,
});
</script>

<style scoped lang="scss">
// The code is v-html (highlighted markup), so :deep() is how this component styles its own body.
.ui-code-block {
  min-width: 0;
  // The frame is the scroll container. The wrapper must not clip the frame's outward focus ring,
  // which the app global `:where(pre, .ui-code-block) { overflow-x: auto }` (a pre safety net) did.
  overflow: visible;

  :deep(.syntax-frame),
  [data-fallback] {
    margin: 0;
  }

  // Static preview (`focusable: false`): crop instead of scrolling — a scroll container keyboard
  // users cannot reach would fail WCAG 2.1.1.
  :deep(.syntax-frame[data-preview]) {
    overflow: hidden;
  }

  :deep(.syntax-block),
  :deep(pre) {
    margin: 0;
    max-width: 100%;
  }
}
</style>
