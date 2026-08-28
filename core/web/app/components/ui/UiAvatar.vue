<template lang="pug">
PrimeAvatar(
  v-if="isPrimeVue",
  v-bind="$attrs",
  :label="label",
  :icon="icon",
  :image="image",
  :shape="shape",
  :size="size"
)
span.p-avatar.p-component(v-else, v-bind="$attrs", :class="_nativeClass", role="img", :aria-label="label || 'Avatar'")
  img.p-avatar-image(v-if="image", :src="image", alt="")
  span.p-avatar-icon(v-else-if="icon", :class="icon", aria-hidden="true")
  span.p-avatar-label(v-else) {{ label }}
</template>

<script setup lang="ts">
/** User / entity avatar — PrimeVue `Avatar`, else native span with classic `p-avatar` classes. */
defineOptions({ inheritAttrs: false });

const { isPrimeVue } = useUiStack();

const props = withDefaults(
  defineProps<{
    label?: string;
    icon?: string;
    image?: string;
    shape?: 'circle' | 'square';
    size?: 'normal' | 'large' | 'xlarge';
  }>(),
  {
    shape: 'circle',
    size: 'normal',
  }
);

const _nativeClass = computed(() => {
  const classes: string[] = [];
  if (props.shape === 'circle') {
    classes.push('p-avatar-circle');
  }
  if (props.size === 'large') {
    classes.push('p-avatar-lg');
  } else if (props.size === 'xlarge') {
    classes.push('p-avatar-xl');
  }
  return classes;
});
</script>
