<template lang="pug">
NuxtLink(:href="resolvedHref", :target="target")
  slot
</template>

<script setup lang="ts">
import { docsLinkHref } from '#shared/docs-links';

const props = withDefaults(defineProps<{ href?: string; target?: string }>(), { href: '', target: undefined });

const route = useRoute();
const router = useRouter();
const resolvedHref = computed(() =>
  route.path.startsWith('/docs')
    ? docsLinkHref(props.href, route.path, (path) => router.resolve(path).matched.length > 0)
    : props.href
);
</script>
