<template lang="pug">
NuxtLoadingIndicator
NuxtLayout(name="default")
  NuxtPage(:page-key="(route) => route.fullPath")
UiToastHost
</template>

<script setup lang="ts">
/**
 * App shell: wraps every page inside the default/layout stack.
 * page-key forces a fresh page instance on every path change so route-param
 * pages and content bindings cannot keep a previous screen's snapshot.
 */
</script>

<style lang="scss"></style>
