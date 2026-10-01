<template lang="pug">
.page-content.portfolio-page.splash-page(data-fit="screen")
  header.splash-hero
    p.eyebrow-container {{ content.splash.eyebrow }}
    h1 {{ content.splash.heading }}
    p.splash-hero__lede {{ content.splash.lede }}

  nav.splash-fork(aria-labelledby="splash-doors-heading")
    h2#splash-doors-heading.sr-only {{ content.splash.doorsLabel }}
    //- Returning visitors: resume comes first and holds the page's only primary action.
    p.splash-continue(v-if="cookiesReadable && previousPath")
      span.splash-continue__copy
        | {{ content.splash.previousViewPrefix }}
        |
        span.splash-continue__title {{ previousTitle }}
      NuxtLink.splash-continue__link(:to="previousPath") Resume

    //- Doors are choices, not a sequence: no numbers; each shows its scope.
    ul.splash-doors(aria-labelledby="splash-doors-heading")
      li(v-for="(door, index) in content.splash.doors", :key="door.id")
        NuxtLink.splash-door(:to="doorHrefs[index]")
          span.splash-door__copy
            span.splash-door__label {{ door.label }}
            span.splash-door__lede {{ door.lede }}
            span.splash-door__scope(v-if="door.scope") {{ door.scope }} →

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

<style lang="scss" src="../../pages/index.scss" scoped></style>
