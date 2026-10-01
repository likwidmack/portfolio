<template lang="pug">
.page-content.portfolio-page.code-page(data-fit="fluid")
  header.code-page__hero
    p.eyebrow-container {{ content.hero.eyebrow }}
    h1#code-heading.display {{ content.hero.title }}
    p.lead {{ content.hero.lede }}
    a.code-page__repo-link(:href="repoRootUrl", target="_blank", rel="noopener noreferrer") Browse the repo ↗

  AppBrowseToolbar(
    v-model:group="packageId",
    :groups="packageOptions",
    :total="samples.length",
    :matching="visibleSamples.length",
    :filtered="filtered",
    :noun="samples.length === 1 ? 'snippet' : 'snippets'",
    group-label="Package",
    @clear="clearFilters"
  )

  .code-reader(v-if="active")
    //- Phones/tablets: one labelled native picker + previous/next (44px, no swipe-only row).
    .code-reader__picker
      label.code-reader__picker-label(for="code-snippet-select")
        | Snippet
        span.code-reader__picker-count {{ activeIndex + 1 }} of {{ visibleSamples.length }}
      .code-reader__picker-row
        button.code-reader__step(
          type="button",
          :aria-label="`Previous snippet: ${prevSample.title}`",
          :disabled="visibleSamples.length < 2",
          @click="select(prevSample.id)"
        )
          svg(viewBox="0 0 24 24", width="20", height="20", aria-hidden="true", focusable="false")
            path(
              d="M15 5l-7 7 7 7",
              fill="none",
              stroke="currentColor",
              stroke-width="2",
              stroke-linecap="round",
              stroke-linejoin="round"
            )
        select#code-snippet-select.code-reader__select(:value="active.id", @change="onPick")
          option(v-for="sample in visibleSamples", :key="sample.id", :value="sample.id") {{ sample.title }}
        button.code-reader__step(
          type="button",
          :aria-label="`Next snippet: ${nextSample.title}`",
          :disabled="visibleSamples.length < 2",
          @click="select(nextSample.id)"
        )
          svg(viewBox="0 0 24 24", width="20", height="20", aria-hidden="true", focusable="false")
            path(
              d="M9 5l7 7-7 7",
              fill="none",
              stroke="currentColor",
              stroke-width="2",
              stroke-linecap="round",
              stroke-linejoin="round"
            )
    .code-reader__tabs(
      ref="tabList",
      role="tablist",
      aria-label="Snippets",
      aria-orientation="vertical",
      @keydown="onTabKeydown"
    )
      button.code-reader__tab(
        v-for="sample in visibleSamples",
        :id="`code-tab-${sample.id}`",
        :key="sample.id",
        type="button",
        role="tab",
        :aria-selected="sample.id === active.id ? 'true' : 'false'",
        aria-controls="code-panel",
        :tabindex="sample.id === active.id ? 0 : -1",
        @click="select(sample.id)"
      )
        strong {{ sample.title }}
        span {{ sample.module }} · {{ sample.file }}

    section#code-panel.code-reader__panel(role="tabpanel", :aria-labelledby="`code-tab-${active.id}`")
      //- macOS-style window chrome on the code window only (decorative).
      header.code-reader__head
        span.code-reader__lights(aria-hidden="true")
          span(data-tone="close")
          span(data-tone="minimize")
          span(data-tone="maximize")
        code.code-reader__path {{ active.path }}
        span.code-page__lang {{ active.languageLabel }}
        .code-reader__actions
          button.code-reader__action(type="button", @click="copySource") {{ copied ? 'Copied' : 'Copy' }}
          a.code-reader__action(:href="active.sourceUrl", target="_blank", rel="noopener noreferrer") View source ↗
      UiCodeBlock(
        :code="active.sourceText",
        :language="active.language",
        :aria-label="`${active.title} source`",
        line-numbers
      )
      dl.code-reader__facts
        div
          dt What it does
          dd {{ active.description }}
        div
          dt Style
          dd {{ active.style }}
        div
          dt Dependencies
          dd {{ active.dependencies }}
        div
          dt Used in
          dd {{ active.usedIn }}
      p.code-reader__status(aria-live="polite") {{ copyStatus }}
  p.code-reader__empty(v-else) No snippets in the code collection yet.

  section.code-page__packages(aria-labelledby="code-packages-heading")
    h2#code-packages-heading Packages
    ul.code-page__repo-list
      li(v-for="repo in repos", :key="repo.id")
        a.code-page__repo(:href="repo.url", target="_blank", rel="noopener noreferrer")
          span.code-page__repo-name {{ repo.name }}
          span.code-page__repo-desc {{ repo.description }}
          span.code-page__repo-foot
            span.code-page__lang {{ repo.languageLabel }}
            span(aria-hidden="true") ↗
</template>

<script setup lang="ts">
/**
 * /code — selected snippets with a package filter (shared browse toolbar, URL state),
 * an accessible tab list (arrow keys, Home/End) that becomes a labelled native picker with
 * previous/next on narrow screens, one panel with the code and its facts,
 * Copy + "View source ↗", and package cards. Public links go to likwidmack/portfolio.
 * Fluid page fit: fills the viewport width inside the page padding.
 */
import {
  codeLanguageLabel,
  codePackageOptions,
  codeRepoUrl,
  codeSampleSourceUrl,
  filterCodeSamples,
  joinCodeSampleSource,
  resolveActiveSample,
  type CodeContent,
} from '#shared/code-types';
import { publicTreeUrl } from '#shared/public-repo';

definePageMeta({
  breadcrumb: 'Code',
});

const { data: codeContent } = await useContentAsyncData('code-content', () =>
  fetchContentCollection<CodeContent>('code', { mode: 'first' })
);

if (!codeContent.value) {
  throw createError({ statusCode: 500, statusMessage: 'Code content not found' });
}

const content = computed(() => codeContent.value as CodeContent);

// Precompute everything the Pug template reads: template-only imports get elided.
const samples = computed(() =>
  (content.value.samples ?? []).map((sample) => ({
    ...sample,
    sourceText: joinCodeSampleSource(sample.source),
    sourceUrl: codeSampleSourceUrl(sample),
    languageLabel: codeLanguageLabel(sample.language),
  }))
);
const repos = computed(() =>
  content.value.repos.map((repo) => ({
    ...repo,
    url: codeRepoUrl(repo),
    languageLabel: codeLanguageLabel(repo.language),
  }))
);
const repoRootUrl = publicTreeUrl();

// Package filter + selected snippet live in the URL (`?group=…&item=…`) without remounting.
const browse = useBrowseQuery({ view: 'reader', group: 'all', kind: 'all', query: '', item: '' });
const { filtered, clear: clearFilters } = browse;
const packageId = computed<string>({
  get: () => browse.group.value,
  set: (value) => (browse.group.value = value),
});
const packageOptions = computed(() => codePackageOptions(samples.value));
const visibleSamples = computed(() => filterCodeSamples(samples.value, packageId.value));
const active = computed(() => resolveActiveSample(visibleSamples.value, browse.item?.value ?? ''));

function select(id: string): void {
  if (browse.item) browse.item.value = id;
}

// Narrow-screen picker: position + wrap-around previous/next.
const activeIndex = computed(() =>
  Math.max(
    0,
    visibleSamples.value.findIndex((sample) => sample.id === active.value?.id)
  )
);
const prevSample = computed(() => {
  const list = visibleSamples.value;
  return list[(activeIndex.value - 1 + list.length) % list.length]!;
});
const nextSample = computed(() => {
  const list = visibleSamples.value;
  return list[(activeIndex.value + 1) % list.length]!;
});

function onPick(event: Event): void {
  select((event.target as HTMLSelectElement).value);
}

// Keep the URL honest: when a filter hides the selected snippet, point `item` at the one shown.
watch(
  () => [active.value?.id, browse.item?.value] as const,
  ([shown, selected]) => {
    if (shown && selected && shown !== selected) select(shown);
  }
);

const tabList = useTemplateRef<HTMLElement>('tabList');

/** Roving tabindex: arrows move between snippets, Home/End jump to the ends. */
function onTabKeydown(event: KeyboardEvent): void {
  const list = visibleSamples.value;
  const index = list.findIndex((sample) => sample.id === active.value?.id);
  if (index === -1) return;
  const next =
    event.key === 'ArrowDown' || event.key === 'ArrowRight'
      ? (index + 1) % list.length
      : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
        ? (index - 1 + list.length) % list.length
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? list.length - 1
            : -1;
  if (next === -1) return;
  event.preventDefault();
  const target = list[next]!;
  select(target.id);
  nextTick(() => tabList.value?.querySelector<HTMLElement>(`#code-tab-${target.id}`)?.focus());
}

const copied = ref(false);
const copyStatus = ref('');
let copyTimer: ReturnType<typeof setTimeout> | null = null;

async function copySource(): Promise<void> {
  if (!active.value) return;
  try {
    await navigator.clipboard.writeText(active.value.sourceText);
    copied.value = true;
    copyStatus.value = `Copied ${active.value.title}.`;
  } catch {
    copyStatus.value = 'Copy failed — select the code instead.';
  }
  if (copyTimer) clearTimeout(copyTimer);
  copyTimer = setTimeout(() => {
    copied.value = false;
    copyStatus.value = '';
  }, 2000);
}

watch(
  () => active.value?.id,
  () => {
    copied.value = false;
    copyStatus.value = '';
  }
);

onBeforeUnmount(() => {
  if (copyTimer) clearTimeout(copyTimer);
});

usePortfolioSeo({
  title: content.value.seo.title,
  description: content.value.seo.description,
  path: '/code',
});
</script>

<style lang="scss" scoped>
.code-page {
  @include portfolio-stack(var(--section-gap, 1.5rem));
  width: 100%;
  min-width: 0;

  &__hero {
    display: grid;
    gap: 0.5rem;
    padding-top: clamp(1rem, 3vw, 2rem);

    .lead {
      max-width: var(--prose-max, 42rem);
      margin: 0;
    }
  }

  &__repo-link {
    display: inline-flex;
    align-items: center;
    justify-self: start;
    min-height: 44px;
    color: var(--link-color, var(--primary-color));
    font-weight: 600;

    &:focus-visible {
      outline: 2px solid var(--focus-ring);
      outline-offset: 2px;
    }
  }

  &__lang {
    display: inline-flex;
    align-items: center;
    padding: 0.1rem 0.5rem;
    border: 1px solid color-mix(in srgb, var(--portfolio-teal) 60%, transparent);
    border-radius: 999px;
    color: var(--text-color);
    @include portfolio-type-meta;
    font-size: max(var(--type-min, 12px), 0.72rem);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  &__packages {
    display: grid;
    gap: 1rem;

    h2 {
      margin: 0;
    }
  }

  &__repo-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr));
    gap: 0.75rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__repo {
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: 0.4rem;
    height: 100%;
    padding: 1rem 1.1rem;
    border: 1px solid var(--border-color, var(--portfolio-rule));
    border-radius: var(--border-radius-md, 0.5rem);
    background: color-mix(in srgb, var(--surface-color) 88%, transparent);
    color: var(--text-color);
    text-decoration: none;

    &:hover {
      border-color: var(--link-color, var(--primary-color));
    }

    &:focus-visible {
      outline: 2px solid var(--focus-ring);
      outline-offset: 2px;
    }
  }

  &__repo-name {
    font-family: var(--font-family-mono, ui-monospace, monospace);
    font-weight: 700;
  }

  &__repo-desc {
    color: var(--text-secondary-color);
    font-size: 0.9rem;
    line-height: 1.45;
  }

  &__repo-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: var(--link-color, var(--primary-color));
  }
}

.code-reader {
  display: grid;
  grid-template-columns: minmax(14rem, 20rem) minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
  min-width: 0;

  // Narrow-screen picker (hidden on wide screens, where the tab list shows).
  &__picker {
    display: none;
    gap: 0.35rem;
  }

  &__picker-label {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    @include portfolio-type-meta;
    font-size: 0.8rem;
    text-transform: uppercase;
  }

  &__picker-count {
    color: var(--text-secondary-color);
    font-variant-numeric: tabular-nums;
    text-transform: none;
  }

  &__picker-row {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) 44px;
    gap: 0.5rem;
  }

  &__select,
  &__step {
    min-height: 44px;
    border: 1px solid var(--form-border-color, var(--border-strong));
    border-radius: var(--border-radius-sm, 0.25rem);
    background: color-mix(in srgb, var(--surface-color) 80%, transparent);
    color: var(--text-color);
    font: inherit;

    &:focus-visible {
      outline: 2px solid var(--focus-ring);
      outline-offset: 2px;
    }
  }

  &__select {
    min-width: 0;
    padding: 0 0.75rem;
    font-size: 1rem; // 16px: no iOS zoom-on-focus
  }

  &__step {
    display: inline-grid;
    place-items: center;
    width: var(--touch-target, 44px);
    min-width: var(--touch-target, 44px);
    padding: 0;
    cursor: pointer;

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  }

  &__tabs {
    position: sticky;
    top: calc(var(--page-chrome, 4.5rem) + 0.5rem);
    display: grid;
    gap: 0.35rem;
  }

  &__tab {
    display: grid;
    gap: 0.2rem;
    min-height: 44px;
    padding: 0.65rem 0.8rem;
    border: 1px solid var(--border-color, var(--portfolio-rule));
    border-radius: var(--border-radius-sm, 0.25rem);
    background: transparent;
    color: var(--text-color);
    font: inherit;
    text-align: start;
    cursor: pointer;

    strong {
      font-size: 0.95rem;
    }

    span {
      overflow: hidden;
      color: var(--text-secondary-color);
      font-family: var(--font-family-mono, ui-monospace, monospace);
      font-size: 0.75rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &:hover {
      border-color: var(--border-strong, currentColor);
    }

    &[aria-selected='true'] {
      border-color: var(--link-color, var(--primary-color));
      background: var(--surface-variant);
      box-shadow: inset 3px 0 0 var(--link-color, var(--primary-color));
    }

    &:focus-visible {
      outline: 2px solid var(--focus-ring);
      outline-offset: 2px;
    }
  }

  // The code window: macOS-style title bar + body. Only this panel gets window chrome.
  &__panel {
    display: grid;
    gap: 0.75rem;
    min-width: 0;
    padding: 0 1rem 1rem;
    overflow: hidden;
    border: 1px solid var(--border-strong, var(--portfolio-rule));
    border-radius: 0.75rem;
    background: color-mix(in srgb, var(--surface-color) 92%, transparent);
    box-shadow: var(--shadow-lg);
  }

  &__head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 0.75rem;
    margin-inline: -1rem;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--border-color, var(--portfolio-rule));
    background: var(--surface-variant, var(--main-background-secondary));
  }

  &__lights {
    display: inline-flex;
    gap: 0.45rem;
    margin-inline-end: 0.25rem;

    span {
      width: 0.75rem;
      height: 0.75rem;
      border-radius: 50%;
      box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.2);
    }

    [data-tone='close'] {
      background: #ff5f57;
    }

    [data-tone='minimize'] {
      background: #febc2e;
    }

    [data-tone='maximize'] {
      background: #28c840;
    }
  }

  &__path {
    min-width: 0;
    overflow-wrap: anywhere;
    color: var(--text-secondary-color);
    font-size: 0.85rem;
  }

  &__actions {
    display: flex;
    gap: 0.5rem;
    margin-inline-start: auto;
  }

  &__action {
    display: inline-flex;
    align-items: center;
    min-height: var(--touch-target, 44px);
    padding: 0 0.85rem;
    border: 1px solid var(--border-strong, currentColor);
    border-radius: var(--border-radius-sm, 0.25rem);
    background: transparent;
    color: var(--text-color);
    font: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;

    &:hover {
      background: var(--surface-variant);
    }

    &:focus-visible {
      outline: 2px solid var(--focus-ring);
      outline-offset: 2px;
    }
  }

  &__facts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
    gap: 0.75rem 1.25rem;
    margin: 0;

    dt {
      @include portfolio-type-meta;
      color: var(--text-secondary-color);
      font-size: max(var(--type-min, 12px), 0.72rem);
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    dd {
      margin: 0.25rem 0 0;
      line-height: 1.5;
    }
  }

  &__status {
    min-height: 1.2em;
    margin: 0;
    color: var(--success-ink, var(--text-secondary-color));
    font-size: 0.85rem;
  }

  &__empty {
    color: var(--text-secondary-color);
  }
}

// Tablets and phones: the tab list gives way to the labelled picker above the code
// (native select + previous/next, all 44px) — no swipe-only row, nothing off-screen.
@media (max-width: $breakpoint-tablet) {
  .code-reader {
    grid-template-columns: minmax(0, 1fr);

    &__picker {
      display: grid;
    }

    &__tabs {
      display: none;
    }

    &__actions {
      margin-inline-start: 0;
    }
  }
}
</style>
