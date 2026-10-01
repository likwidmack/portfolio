<template lang="pug">
.ui-code-block(v-bind="$attrs")
  template(v-if="renderMode === 'client-only'")
    ClientOnly
      .syntax-frame(
        :class="{ 'has-line-numbers': lineNumbers }",
        :data-language="normalizedLanguage",
        :aria-label="ariaLabel"
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
          :aria-label="ariaLabel"
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
      :aria-label="ariaLabel"
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
  }>(),
  {
    language: 'text',
    ariaLabel: 'Code block',
    lineNumbers: false,
    renderMode: 'client-only',
  }
);

const normalizedLanguage = computed(() => props.language.toLowerCase().trim() || 'text');
const codeClassList = computed(() => [`syntax-code`, `language-${normalizedLanguage.value}`]);
const preClassList = computed(() => [`language-${normalizedLanguage.value}`]);
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
  codePaneHtml,
  lineCount,
});
</script>

<style scoped lang="scss">
.ui-code-block {
  :deep(.syntax-frame),
  [data-fallback] {
    margin: 0;
  }
}
</style>
