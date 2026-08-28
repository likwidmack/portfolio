<template lang="pug">
PrimeAccordion(v-if="isPrimeVue", v-bind="$attrs", v-model:value="_value", :multiple="multiple")
  PrimeAccordionPanel(v-for="item in items", :key="String(item.value)", :value="item.value")
    PrimeAccordionHeader {{ item.header }}
    PrimeAccordionContent
      p {{ item.content }}
  slot
.p-accordion.p-component(v-else, v-bind="$attrs")
  details.p-accordionpanel(
    v-for="item in items",
    :key="String(item.value)",
    :class="{ 'p-accordionpanel-active': multiple ? _valueArray.includes(item.value) : _value === item.value }",
    :open="multiple ? _valueArray.includes(item.value) : _value === item.value",
    @toggle="_onNativeToggle(item.value, $event)"
  )
    summary.p-accordionheader {{ item.header }}
    .p-accordioncontent
      .p-accordioncontent-content
        p {{ item.content }}
</template>

<script setup lang="ts">
/** Accordion — PrimeVue panels, else native `<details>` with classic `p-accordion` classes. */
defineOptions({ inheritAttrs: false });

export type UiAccordionItem = {
  value: string | number;
  header: string;
  content?: string;
};

const { isPrimeVue } = useUiStack();
const _value = defineModel<string | number | (string | number)[] | null>('value', { default: null });

const props = withDefaults(
  defineProps<{
    items?: UiAccordionItem[];
    multiple?: boolean;
  }>(),
  {
    items: () => [],
    multiple: false,
  }
);

const _valueArray = computed(() => (Array.isArray(_value.value) ? _value.value : []));

function _onNativeToggle(itemValue: string | number, event: Event): void {
  const open = (event.target as HTMLDetailsElement).open;
  if (props.multiple) {
    const current = new Set(_valueArray.value);
    if (open) current.add(itemValue);
    else current.delete(itemValue);
    _value.value = [...current];
    return;
  }
  _value.value = open ? itemValue : null;
}
</script>
