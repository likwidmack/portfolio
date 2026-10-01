<template lang="pug">
PrimeTimeline(v-if="isPrimeVue", v-bind="$attrs", :value="value", :align="align")
  template(v-if="$slots.opposite", #opposite="slotProps")
    slot(name="opposite", v-bind="slotProps")
  template(v-if="$slots.marker", #marker="slotProps")
    slot(name="marker", v-bind="slotProps")
  template(v-if="$slots.content", #content="slotProps")
    slot(name="content", v-bind="slotProps")
.p-timeline.p-component(v-else, v-bind="$attrs", :class="`p-timeline-${align ?? 'left'}`")
  .p-timeline-event(v-for="(item, index) in value", :key="index")
    .p-timeline-event-opposite(v-if="$slots.opposite")
      slot(name="opposite", :item="item", :index="index")
    .p-timeline-event-separator
      .p-timeline-event-marker
        slot(v-if="$slots.marker", name="marker", :item="item", :index="index")
      .p-timeline-event-connector(v-if="index < value.length - 1", aria-hidden="true")
    .p-timeline-event-content
      slot(v-if="$slots.content", name="content", :item="item", :index="index")
      span(v-else) {{ _fallbackLabel(item) }}
</template>

<script setup lang="ts" generic="TItem = unknown">
/** Timeline — PrimeVue `Timeline`, else native structure with classic `p-timeline` classes. */
defineOptions({
  inheritAttrs: false,
});

const { isPrimeVue } = useUiStack();

defineProps<{
  value: TItem[];
  align?: 'left' | 'right' | 'alternate';
}>();

function _fallbackLabel(item: TItem): string {
  if (item == null) {
    return '';
  }
  if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
    return String(item);
  }
  if (typeof item === 'object') {
    const record = item as Record<string, unknown>;
    for (const key of ['status', 'label', 'title', 'detail']) {
      const value = record[key];
      if (typeof value === 'string' || typeof value === 'number') {
        return String(value);
      }
    }
  }
  return String(item);
}
</script>
