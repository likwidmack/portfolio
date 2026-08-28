<template lang="pug">
PrimeDialog(
  v-if="isPrimeVue",
  v-bind="$attrs",
  v-model:visible="_visible",
  :header="header",
  :modal="modal",
  :closable="closable",
  :dismissable-mask="dismissableMask",
  :aria-label="ariaLabel ?? header"
)
  slot
  template(v-if="$slots.footer", #footer)
    slot(name="footer")
dialog.p-dialog.p-component(
  v-else,
  ref="_dialogEl",
  v-bind="$attrs",
  :role="role",
  :aria-modal="modal ? 'true' : undefined",
  :aria-label="ariaLabel ?? undefined",
  :aria-labelledby="!ariaLabel && header ? _headerId : undefined",
  @close="_visible = false"
)
  form(method="dialog")
    .p-dialog-header(v-if="header")
      span.p-dialog-title(:id="_headerId") {{ header }}
    .p-dialog-content: slot
    .p-dialog-footer(v-if="$slots.footer"): slot(name="footer")
</template>

<script setup lang="ts">
/** Modal dialog — PrimeVue `Dialog`, else native `<dialog>` with classic `p-dialog` classes. */
defineOptions({ inheritAttrs: false });

const { isPrimeVue } = useUiStack();
const _visible = defineModel<boolean>('visible', { default: false });
const _dialogEl = ref<HTMLDialogElement | null>(null);
const _headerId = useId();

withDefaults(
  defineProps<{
    header?: string;
    ariaLabel?: string;
    role?: 'dialog' | 'alertdialog';
    modal?: boolean;
    closable?: boolean;
    dismissableMask?: boolean;
  }>(),
  {
    role: 'dialog',
    modal: true,
    closable: true,
    dismissableMask: true,
  }
);

watch(
  _visible,
  async (open) => {
    if (isPrimeVue) return;
    await nextTick();
    const el = _dialogEl.value;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  },
  { immediate: true }
);
</script>
