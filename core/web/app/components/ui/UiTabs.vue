<template lang="pug">
PrimeTabs(v-if="isPrimeVue", v-bind="$attrs", v-model:value="_value")
  PrimeTabList
    PrimeTab(v-for="tab in props.tabs", :key="String(tab.value)", :value="tab.value") {{ tab.label }}
  PrimeTabPanels
    PrimeTabPanel(v-for="tab in props.tabs", :key="String(tab.value)", :value="tab.value")
      slot(v-if="$slots[`panel-${tab.value}`]", :name="`panel-${tab.value}`")
      p(v-else-if="typeof tab.content === 'string'") {{ tab.content }}
  slot
.p-tabs.p-component(v-else, v-bind="$attrs")
  .p-tablist
    .p-tablist-content
      .p-tablist-tab-list(role="tablist")
        button.p-tab(
          v-for="tab in props.tabs",
          :id="_tabId(tab.value)",
          :key="String(tab.value)",
          type="button",
          role="tab",
          :aria-selected="_activeTabValue === tab.value",
          :aria-controls="_panelId(tab.value)",
          :tabindex="_activeTabValue === tab.value ? 0 : -1",
          :class="{ 'p-tab-active': _activeTabValue === tab.value }",
          @click="_value = tab.value"
        ) {{ tab.label }}
  .p-tabpanels
    .p-tabpanel(
      v-for="tab in props.tabs",
      v-show="_activeTabValue === tab.value",
      :id="_panelId(tab.value)",
      :key="String(tab.value)",
      role="tabpanel",
      :aria-labelledby="_tabId(tab.value)",
      tabindex="0"
    )
      slot(v-if="$slots[`panel-${tab.value}`]", :name="`panel-${tab.value}`")
      p(v-else-if="typeof tab.content === 'string'") {{ tab.content }}
</template>

<script setup lang="ts">
/** Tabs — PrimeVue `Tabs`, else native tablist with classic `p-tabs` classes. */
defineOptions({ inheritAttrs: false });

export type UiTabItem = {
  value: string | number;
  label: string;
  content?: string;
};

const { isPrimeVue } = useUiStack();
const _value = defineModel<string | number>('value', { default: '0' });

const props = withDefaults(
  defineProps<{
    tabs?: UiTabItem[];
  }>(),
  {
    tabs: () => [],
  }
);

const _activeTabValue = computed<string | number>(() => {
  if (!props.tabs.length) {
    return _value.value;
  }
  return props.tabs.some((tab) => tab.value === _value.value) ? _value.value : props.tabs[0]!.value;
});

function _toAriaKey(value: string | number): string {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-');
}

function _tabId(value: string | number): string {
  return `ui-tab-${_toAriaKey(value)}`;
}

function _panelId(value: string | number): string {
  return `ui-tabpanel-${_toAriaKey(value)}`;
}
</script>

<style lang="scss">
.p-tabs {
  border-radius: var(--border-radius-md);

  .p-tablist {
    border-top-right-radius: var(--border-radius-md);
    border-top-left-radius: var(--border-radius-md);
  }

  .p-tabpanels {
    border-bottom-right-radius: var(--border-radius-md);
    border-bottom-left-radius: var(--border-radius-md);
  }

  .p-tablist-tab-list {
    .p-tablist-content {
      display: flex;
      flex-flow: row nowrap;
      gap: 0;
      justify-content: center;
      align-items: center;
      align-content: center;
    }

    button.p-tab {
      flex: 1;
      border-radius: 0;

      &:first-of-type {
        border-top-left-radius: var(--border-radius-md);
      }

      &:last-of-type {
        border-top-right-radius: var(--border-radius-md);
      }

      &:only-of-type {
        border-top-right-radius: var(--border-radius-md);
        border-top-left-radius: var(--border-radius-md);
      }
    }
  }
}
</style>
