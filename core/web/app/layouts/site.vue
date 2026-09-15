<template lang="pug">
.app-site-layout(:id="`${layoutKey}_page`", :class="layoutClass")
  a(data-skip-link, :href="`#${layoutKey}_main`") Skip to main content

  header.site-chrome(:id="`${layoutKey}_header`"): slot(name="header"): div: AppPrimaryNav

  main(:id="`${layoutKey}_main`"): slot

  footer.site-chrome(:id="`${layoutKey}_footer`"): slot(name="footer")
    .site-footer
      p &copy; {{ profile.copyright.displayYear }} {{ profile.names.formal }} · {{ profile.role.footerCredential }} · {{ profile.names.signature }}
      button.site-footer__personalize(type="button", @click="personalizeOpen = true") Personalize
    AppPersonalize(v-model:open="personalizeOpen")
</template>

<script setup lang="ts">
import { styleListener } from '#shared/utils/style-listener';

const props = defineProps<{
  layoutClass: string;
  layoutKey: string;
}>();

const personalizeOpen = usePersonalizeDialog();
const config = useRuntimeConfig();
const { profile } = useSiteProfile();
const personJsonLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: profile.value.names.formal,
  alternateName: [profile.value.names.short, profile.value.names.signature],
  jobTitle: `${profile.value.role.title}, ${profile.value.role.organization}`,
  url: config.public.siteUrl,
  description: profile.value.role.jsonLdDescription,
  email: profile.value.contact.email,
  sameAs: [profile.value.contact.github.url],
}));

useHead({
  // key keeps Person JSON-LD deduped across layout remounts; innerHTML (not children) is Unhead's current API
  script: [
    {
      key: 'person-json-ld',
      type: 'application/ld+json',
      innerHTML: computed(() => JSON.stringify(personJsonLd.value)),
    },
  ],
});

const _refreshLayoutVars = () =>
  styleListener({
    headerId: `${props.layoutKey}_header`,
    footerId: `${props.layoutKey}_footer`,
  });

onBeforeMount(() => {
  _refreshLayoutVars();
  window.addEventListener('resize', _refreshLayoutVars);
});

onUpdated(_refreshLayoutVars);

onBeforeUnmount(() => {
  window.removeEventListener('resize', _refreshLayoutVars);
});
</script>

<style lang="scss" src="./site.scss"></style>
