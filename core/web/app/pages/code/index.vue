<template lang="pug">
.page-content.portfolio-page.code-page(data-fit="screen")
  .code-page__window(role="region", :aria-label="content.windowTitle")
    .code-page__chrome
      span.code-page__dot(data-tone="close", aria-hidden="true")
      span.code-page__dot(data-tone="minimize", aria-hidden="true")
      span.code-page__dot(data-tone="maximize", aria-hidden="true")
      p.code-page__chrome-title {{ content.windowTitle }}

    .code-page__body
      aside.code-page__explorer(aria-label="Explorer")
        p.eyebrow-container Explorer
        ul.code-page__paths
          li(v-for="path in content.explorer", :key="path")
            code {{ path }}

      section#repos.code-page__repos(aria-labelledby="code-repos-heading")
        header.portfolio-hero.code-page__intro
          p.eyebrow-container {{ content.hero.eyebrow }}
          h1#code-repos-heading.display {{ content.hero.title }}
          p.lead {{ content.hero.lede }}

        ul.code-page__repo-list
          li(v-for="repo in repos", :key="repo.id")
            article.code-page__repo
              .code-page__repo-copy
                h2.code-page__repo-name
                  a(v-if="isLiveRepoHref(repo.href)", :href="repo.href", rel="noopener noreferrer", target="_blank") {{ repo.name }}
                  a(v-else-if="repo.href", href="#", @click.prevent) {{ repo.name }}
                  span(v-else) {{ repo.name }}
                p {{ repo.description }}
              span.code-page__lang {{ repo.languageLabel }}
              span.code-page__updated {{ repo.updated }}
</template>

<script setup lang="ts">
import { codeLanguageLabel, type CodeContent } from '#shared/code-types';

definePageMeta({
  breadcrumb: 'Code',
});

function isLiveRepoHref(href: string | undefined): href is string {
  return typeof href === 'string' && /^https?:\/\//i.test(href);
}

const { data: codeContent } = await useContentAsyncData('code-content', () =>
  fetchContentCollection<CodeContent>('code', { mode: 'first' })
);

if (!codeContent.value) {
  throw createError({ statusCode: 500, statusMessage: 'Code content not found' });
}

const content = computed(() => codeContent.value as CodeContent);

// Precompute labels in script: Pug + script-setup elides template-only imports.
const repos = computed(() =>
  content.value.repos.map((repo) => ({
    ...repo,
    languageLabel: codeLanguageLabel(repo.language),
  }))
);

usePortfolioSeo({
  title: content.value.seo.title,
  description: content.value.seo.description,
  path: '/code',
});
</script>

<style lang="scss" scoped>
.code-page {
  display: grid;
  gap: var(--section-gap, 1.5rem);
  width: 100%;
  min-width: 0;

  &__window {
    display: grid;
    width: 100%;
    min-width: 0;
    border: 1px solid var(--border-color, var(--portfolio-rule));
    background: var(--main-background-secondary, var(--surface-color));
    overflow: hidden;
  }

  &__chrome {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.45rem 0.55rem;
    padding: 0.55rem 0.75rem;
    border-bottom: 1px solid var(--border-color, var(--portfolio-rule));
    background: var(--surface-color, var(--main-background-secondary));
  }

  &__dot {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 999px;
    flex: 0 0 auto;

    &[data-tone='close'] {
      background: var(--secondary-color, #8b1e2e);
    }

    &[data-tone='minimize'] {
      background: var(--primary-color, #ff6b35);
    }

    &[data-tone='maximize'] {
      background: var(--portfolio-teal, #1b7a7a);
    }
  }

  &__chrome-title {
    margin: 0;
    min-width: 0;
    color: var(--text-color-secondary, inherit);
    font-size: 0.8rem;
    overflow-wrap: anywhere;
  }

  &__body {
    display: grid;
    min-width: 0;

    @media (min-width: $breakpoint-tablet) {
      grid-template-columns: minmax(9rem, 0.7fr) minmax(0, 1.8fr);
    }
  }

  &__explorer {
    display: grid;
    gap: 0.65rem;
    align-content: start;
    padding: 1rem 0.9rem;
    border-bottom: 1px solid var(--border-color, var(--portfolio-rule));
    background: color-mix(in srgb, var(--surface-color, var(--main-background-secondary)) 82%, transparent);
    min-width: 0;

    @media (min-width: $breakpoint-tablet) {
      border-bottom: 0;
      border-right: 1px solid var(--border-color, var(--portfolio-rule));
    }

    .eyebrow-container {
      color: var(--primary-color);
    }
  }

  &__paths {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.4rem;

    code {
      color: var(--text-color-secondary, inherit);
      font-size: 0.85rem;
      overflow-wrap: anywhere;
    }
  }

  &__repos {
    display: grid;
    gap: 1rem;
    padding: 1rem 1rem 1.25rem;
    min-width: 0;
  }

  &__intro {
    margin: 0;
    gap: 0.35rem;
  }

  &__repo-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.65rem;
  }

  &__repo {
    display: grid;
    gap: 0.45rem 0.85rem;
    align-items: start;
    padding: 0.75rem 0.85rem;
    border: 1px solid var(--border-color, var(--portfolio-rule));
    background: var(--main-background, var(--surface-color));
    min-width: 0;

    @media (min-width: $breakpoint-tablet) {
      grid-template-columns: minmax(0, 1fr) auto auto;
      align-items: center;
    }
  }

  &__repo-copy {
    display: grid;
    gap: 0.3rem;
    min-width: 0;

    p {
      margin: 0;
      color: var(--text-color-secondary, inherit);
      font-size: 0.92rem;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }
  }

  &__repo-name {
    margin: 0;
    font-size: 1.05rem;
    line-height: 1.3;

    a {
      color: inherit;
      text-decoration: none;

      &:hover,
      &:focus-visible {
        text-decoration: underline;
        text-underline-offset: 0.12em;
      }
    }
  }

  &__lang {
    color: var(--portfolio-teal);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  &__updated {
    color: var(--text-color-secondary, inherit);
    font-size: 0.8rem;
    white-space: nowrap;
  }
}
</style>
