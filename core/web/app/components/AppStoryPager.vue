<template lang="pug">
nav.story-pager(aria-label="More stories")
  NuxtLink.story-pager__link(v-if="previous", :to="`/work/${previous.slug}`")
    span.story-pager__dir ← Previous story
    span.story-pager__title {{ previous.title }}
  NuxtLink.story-pager__link.story-pager__link--next(v-if="next", :to="`/work/${next.slug}`")
    span.story-pager__dir Next story →
    span.story-pager__title {{ next.title }}
  .story-pager__cta
    a.story-pager__contact(:href="contactMailto", @click="onContactClick") Get in touch
    NuxtLink.story-pager__all(to="/work") All work
</template>

<script setup lang="ts">
/**
 * End-of-story navigation for case studies: previous / next in Discovery order
 * (`adjacentStudies`) plus the page's contact call to action, so a story never dead-ends.
 */
import type { CaseStudy } from '#shared/portfolio-types';
import { mailtoHref } from '#shared/site-person';

defineProps<{ previous: CaseStudy | null; next: CaseStudy | null }>();

const { profile } = useSiteProfile();
const { track } = usePortfolioAnalytics();
const contactMailto = computed(() => mailtoHref(profile.value.contact.email));

function onContactClick(): void {
  track('contact_click', { placement: 'story_pager' });
}
</script>

<style lang="scss" scoped>
.story-pager {
  // Its own container: when the links stack (one column), both align to the start.
  container: story-pager / inline-size;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
  gap: var(--space-4, 1rem);
  margin-top: var(--space-8, 2rem);
  padding-top: var(--space-6, 1.5rem);
  border-top: 1px solid var(--border-color);

  &__link {
    display: grid;
    gap: var(--space-1, 0.25rem);
    padding: var(--space-5, 1.25rem);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-md, 0.5rem);
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

  &__link--next {
    text-align: end;
  }

  &__dir {
    color: var(--text-secondary-color);
    font-size: var(--font-size-xs, 0.75rem);
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  &__title {
    font-weight: 700;
  }

  &__cta {
    display: flex;
    flex-wrap: wrap;
    grid-column: 1 / -1;
    align-items: center;
    gap: var(--space-4, 1rem);
  }

  &__contact {
    display: inline-flex;
    align-items: center;
    min-height: var(--touch-target, 44px);
    padding: 0 1.25rem;
    border-radius: var(--button-radius, var(--border-radius-sm));
    background: var(--primary-fill, var(--primary-color));
    color: var(--on-primary, #fff);
    font-weight: 700;
    text-decoration: none;

    &:focus-visible {
      outline: 2px solid var(--focus-ring);
      outline-offset: 2px;
    }
  }

  &__all {
    @include touch-target;
    color: var(--link-color, var(--primary-color));
  }
}

// One column (the links no longer sit side by side): "Next story" reads left-aligned like the rest.
@container story-pager (width < 29rem) {
  .story-pager__link--next {
    text-align: start;
  }
}
</style>
