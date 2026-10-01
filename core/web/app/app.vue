<template lang="pug">
NuxtLoadingIndicator
NuxtLayout(name="default")
  NuxtPage(:page-key="pageKey")
UiToastHost
</template>

<script setup lang="ts">
/**
 * App shell: wraps every page inside the default/layout stack.
 * page-key forces a fresh page instance on every path/query/hash change so route-param
 * pages and content bindings cannot keep a previous screen's snapshot — except the
 * browse-toolbar keys (`view`, `group`, `kind`, `q`), which Gallery / Docs update in place.
 */
import { pageKeyFor } from '#shared/browse-query';
import type { RouteLocationNormalizedLoaded } from 'vue-router';

const pageKey = (route: RouteLocationNormalizedLoaded) => pageKeyFor(route);
</script>

<style lang="scss"></style>
