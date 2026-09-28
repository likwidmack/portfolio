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

<style lang="scss" src="./index.scss" scoped></style>
