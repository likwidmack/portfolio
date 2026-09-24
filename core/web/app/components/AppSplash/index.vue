<template lang="pug">
.page-content.portfolio-page.splash-page(data-fit="screen")
  AppDepthField(:seed="7", :particle-count="120")
  header.splash-hero
    p.eyebrow-container {{ content.splash.eyebrow }}
    h1 {{ content.splash.heading }}
    p.splash-hero__lede {{ content.splash.lede }}

  nav.splash-fork(aria-labelledby="splash-doors-heading")
    h2#splash-doors-heading.sr-only {{ content.splash.doorsLabel }}
    ol.splash-doors(aria-labelledby="splash-doors-heading")
      li(v-for="(door, index) in content.splash.doors", :key="door.id")
        NuxtLink.splash-door(:to="doorHrefs[index]")
          span.splash-door__index {{ String(index + 1).padStart(2, '0') }}
          span.splash-door__copy
            span.splash-door__label {{ door.label }}
            span.splash-door__lede {{ door.lede }}

    p.splash-continue(v-if="cookiesReadable && previousPath")
      NuxtLink.splash-continue__link(:to="previousPath")
        | {{ content.splash.previousViewPrefix }}
        |
        span.splash-continue__title {{ previousTitle }}

    label.splash-skip(v-if="cookiesReadable")
      input.splash-skip__input(v-model="skip", type="checkbox")
      span {{ content.splash.skipLabel }}
</template>

<script setup lang="ts">
import { firstBeatHref } from '#shared/journey-preference';
import type { Collections } from '@nuxt/content';

type HomeContent = Collections['home'];

const { data: homeContent } = await useContentAsyncData('home-content', () =>
  fetchContentCollection<HomeContent>('home', { mode: 'first' })
);

if (!homeContent.value) {
  throw createError({ statusCode: 500, statusMessage: 'Home content not found' });
}

const content = computed(() => homeContent.value as HomeContent);
const doorHrefs = computed(() => content.value.splash.doors.map((door) => firstBeatHref(door.id)));
const { skip, previousPath, previousTitle, cookiesReadable } = useJourneyPreference();
const route = useRoute();

usePortfolioSeo({
  title: content.value.seo.title,
  description: content.value.seo.description,
  path: route.path === '/' ? '/' : '/splash',
});
</script>

<style lang="scss" src="../../pages/index.scss"></style>
