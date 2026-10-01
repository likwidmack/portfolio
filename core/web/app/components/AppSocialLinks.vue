<template lang="pug">
nav.social-links(:aria-label="ariaLabel", :data-variant="variant")
  ul.social-links__list(role="list")
    li(v-for="link in links", :key="link.id")
      a.social-links__link(
        :href="link.href",
        :aria-label="variant === 'icons' ? link.accessibleName : undefined",
        :target="link.external ? '_blank' : undefined",
        :rel="link.external ? 'noopener noreferrer' : undefined"
      )
        UiIcon(:name="link.icon")
        span.social-links__label(v-if="variant === 'labels'") {{ link.label }}
        span.sr-only(v-if="variant === 'labels' && link.external") (opens in a new tab)
</template>

<script setup lang="ts">
/**
 * Social and reference links (GitHub, portfolio source, email…) from `content/profile.json`
 * (`contact.social`). Responsive · accessible · touch: every link is a ≥44px target,
 * external links open in a new tab and announce it, and `labels` shows visible text
 * (no hover-only tooltips). `icons` is for tight spaces — names stay on the link.
 */
import { socialLinks } from '#shared/social-links';

const props = withDefaults(
  defineProps<{
    /** `labels`: icon + visible text (default). `icons`: icon-only 44px buttons. */
    variant?: 'labels' | 'icons';
    includeEmail?: boolean;
    ariaLabel?: string;
  }>(),
  { variant: 'labels', includeEmail: true, ariaLabel: 'Social and contact links' }
);

const { profile } = useSiteProfile();
const links = computed(() => socialLinks(profile.value, { includeEmail: props.includeEmail }));
</script>

<style lang="scss" scoped>
.social-links {
  display: flex;
  min-width: 0;
  max-width: 100%;
  margin: 0;
  padding: 0;
}

.social-links__list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  min-width: 0;
  align-items: center;
  gap: 0.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.social-links__link {
  @include touch-target;
  justify-content: center;
  gap: 0.4rem;
  min-width: var(--touch-target, 44px);
  padding-inline: 0.5rem;
  border-radius: var(--border-radius-sm, 0.25rem);
  color: var(--text-secondary-color, var(--text-color));
  text-decoration: none;

  &:hover {
    color: var(--text-color);
    background: color-mix(in srgb, var(--text-color) 6%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring, var(--primary-color));
    outline-offset: 2px;
  }
}

.social-links__label {
  @include portfolio-type-meta;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
</style>
