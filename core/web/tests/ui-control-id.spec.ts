import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, h, onBeforeUnmount, onMounted, useAttrs, type Component } from 'vue';
import UiInputText from '../app/components/ui/UiInputText.vue';
import UiPassword from '../app/components/ui/UiPassword.vue';
import UiSelect from '../app/components/ui/UiSelect.vue';
import UiTextarea from '../app/components/ui/UiTextarea.vue';

/** PrimeVue InputText / Textarea: the root element is the control, so attrs land on it. */
const rootControl = (tag: 'input' | 'textarea') => defineComponent({ setup: () => () => h(tag) });

/** PrimeVue Password / Select: attrs land on a wrapper; `inputId` goes to the inner control. */
const wrappedControl = (tag: 'input' | 'select') =>
  defineComponent({
    props: { inputId: { type: String, default: undefined } },
    setup: (props) => () => h('div', { class: 'stub-wrapper' }, [h(tag, { id: props.inputId })]),
  });

const PRIME_COMPONENTS = {
  PrimeInputText: rootControl('input'),
  PrimeTextarea: rootControl('textarea'),
  PrimePassword: wrappedControl('input'),
  PrimeSelect: wrappedControl('select'),
};

const CASES: Array<[string, Component, Record<string, unknown>]> = [
  ['UiInputText', UiInputText, {}],
  ['UiTextarea', UiTextarea, {}],
  ['UiPassword', UiPassword, {}],
  ['UiSelect', UiSelect, { options: [] }],
];

describe.each(['native', 'primevue'] as const)('Ui* control ids (%s stack)', (stack) => {
  beforeEach(() => {
    vi.stubGlobal('computed', computed);
    vi.stubGlobal('useAttrs', useAttrs);
    vi.stubGlobal('onMounted', onMounted);
    vi.stubGlobal('onBeforeUnmount', onBeforeUnmount);
    vi.stubGlobal('useUiStack', () => ({ isPrimeVue: stack === 'primevue' }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const render = (component: Component, props: Record<string, unknown>, attrs: Record<string, unknown>) =>
    mount(component, { props, attrs, global: { components: PRIME_COMPONENTS } });

  it.each(CASES)('%s puts an id attribute on the form control, once', (_name, component, props) => {
    const matches = render(component, props, { id: 'from-attr' }).findAll('#from-attr');
    expect(matches).toHaveLength(1);
    expect(['INPUT', 'TEXTAREA', 'SELECT']).toContain(matches[0]!.element.tagName);
  });

  it.each(CASES)('%s prefers input-id over an id attribute', (_name, component, props) => {
    const wrapper = render(component, { ...props, inputId: 'from-prop' }, { id: 'from-attr' });
    expect(wrapper.findAll('#from-prop')).toHaveLength(1);
    expect(wrapper.findAll('#from-attr')).toHaveLength(0);
  });
});

describe('UiSelect label click (PrimeVue stack)', () => {
  /** PrimeVue Select's control is a focusable `<span role="combobox">`, which `label[for]` cannot focus. */
  const PrimeSelect = defineComponent({
    props: { inputId: { type: String, default: undefined } },
    setup: (props) => () =>
      h('div', { class: 'stub-wrapper' }, [h('span', { id: props.inputId, role: 'combobox', tabindex: 0 })]),
  });

  beforeEach(() => {
    vi.stubGlobal('computed', computed);
    vi.stubGlobal('useAttrs', useAttrs);
    vi.stubGlobal('onMounted', onMounted);
    vi.stubGlobal('onBeforeUnmount', onBeforeUnmount);
    vi.stubGlobal('useUiStack', () => ({ isPrimeVue: true }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('clicking the label focuses the combobox', () => {
    const Form = defineComponent({
      setup: () => () => [
        h('label', { for: 'post-status' }, 'Status'),
        h(UiSelect, { id: 'post-status', options: [] }),
      ],
    });
    const wrapper = mount(Form, { attachTo: document.body, global: { components: { PrimeSelect } } });
    wrapper.find('label').element.click();
    expect(document.activeElement?.id).toBe('post-status');
    wrapper.unmount();
  });
});
