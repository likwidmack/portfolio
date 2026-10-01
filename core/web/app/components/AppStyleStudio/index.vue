<template lang="pug">
section#studio.style-studio(aria-labelledby="studio-heading")
  .style-studio__workbench
    aside.style-studio__rail(aria-label="Setups and packs")
      h3#setups.style-studio__rail-title Setups
      ul.style-studio__setup-list(role="list")
        li(v-for="setup in styleSetups", :key="setup.id")
          button.style-studio__setup(
            type="button",
            :data-active="setup.id === activeSetupId ? 'true' : undefined",
            :aria-current="setup.id === activeSetupId ? 'true' : undefined",
            @click="onSelectSetup(setup)"
          )
            span.style-studio__setup-swatches(aria-hidden="true")
              i(:style="{ background: setup.brandRoles.primary }")
              i(:style="{ background: setup.brandRoles.secondary }")
              i(:style="{ background: setup.brandRoles.accent }")
            span.style-studio__setup-name {{ setup.name }}
          button.style-studio__setup-delete(
            type="button",
            :aria-label="`Delete ${setup.name}`",
            @click="onDeleteSetup(setup.id)"
          ) Delete
        li(v-if="!styleSetups.length && !pendingSetupUndo")
          p.style-studio__empty No saved setups yet.
      p.style-studio__undo(v-if="pendingSetupUndo", role="status")
        span Deleted “{{ pendingSetupUndo.setup.name }}”
        button.style-studio__undo-btn(type="button", @click="undoDeleteSetup") Undo

      h3.style-studio__rail-title Packs
      .style-studio__packs(role="radiogroup", aria-label="Brand packs")
        label.style-studio__pack(v-for="pack in palettePacks", :key="pack.id", :style="selectionLabelStyle(pack)")
          input(
            type="radio",
            name="studio-pack",
            :value="pack.id",
            :checked="accent === pack.id",
            @change="applyPackToDraft(pack.id)"
          )
          span {{ pack.label }}

      h3.style-studio__rail-title Colors
      .style-studio__packs(role="radiogroup", aria-label="Single colors")
        label.style-studio__pack(v-for="pack in colorPacks", :key="pack.id", :style="selectionLabelStyle(pack)")
          input(
            type="radio",
            name="studio-pack",
            :value="pack.id",
            :checked="accent === pack.id",
            @change="applyPackToDraft(pack.id)"
          )
          span {{ pack.label }}

    .style-studio__main
      header.style-studio__preview-head
        h2#studio-heading.title Live strip
        p.lead The whole site previews your draft. Apply keeps it after a refresh.

      .style-studio__triad(
        :data-pulse="appliedPulse ? 'true' : undefined",
        role="img",
        :aria-label="`Primary ${brandRoles.primary}, secondary ${brandRoles.secondary}, accent ${brandRoles.accent}`"
      )
        span(:style="{ background: brandRoles.primary }")
        span(:style="{ background: brandRoles.secondary }")
        span(:style="{ background: brandRoles.accent }")

      .style-studio__sample
        .style-studio__field(
          v-if="activeField",
          aria-hidden="true",
          :style="{ backgroundImage: activeField.image, clipPath: activeField.clip }"
        )
        p.heading-sample(data-size="3") Sample heading
        p.lead Body copy on the current surface with&nbsp;
          code primary
          | ,
          code secondary
          | , and&nbsp;
          code accent
          | .
        .button-row
          button.btn(type="button", data-variant="solid") Solid
          button.btn(type="button", data-variant="outline") Outline

      .style-studio__roles(role="group", aria-label="Role to edit")
        button(
          v-for="role in roleOptions",
          :key="role.key",
          type="button",
          :aria-pressed="activeRole === role.key ? 'true' : 'false'",
          @click="activeRole = role.key"
        )
          span.style-studio__role-dot(:style="{ background: brandRoles[role.key] }", aria-hidden="true")
          | {{ role.label }}

      section.style-studio__editor(:aria-label="`${activeRoleLabel} colour`")
        .style-studio__role-controls
          UiColorPicker(
            :model-value="roleHex",
            input-id="studio-role-picker",
            :aria-label="`${activeRoleLabel} colour`",
            @update:model-value="setRoleHex"
          )
          label.style-studio__label(for="studio-role-hex") {{ activeRoleLabel }} hex
          UiInputText(
            :model-value="roleHex",
            input-id="studio-role-hex",
            placeholder="#rrggbb",
            @update:model-value="setRoleHex"
          )
          label.style-studio__derive(v-if="activeRole !== 'primary'", for="studio-derive")
            UiToggleSwitch(v-model="deriveModel", input-id="studio-derive")
            span Derive from primary
        span.style-studio__label Palette
        .style-studio__swatches(role="list")
          UiButton.style-studio__swatch(
            v-for="swatch in visibleSwatches",
            :key="swatch.id",
            type="button",
            text,
            rounded,
            :aria-label="`${swatch.label} ${swatch.hex}`",
            :title="`${swatch.group}: ${swatch.label}`",
            :style="{ '--swatch': swatch.hex }",
            @click="setRoleHex(swatch.hex)"
          )

      section.style-studio__contrast(aria-label="Contrast", aria-live="polite")
        p.style-studio__check
          span White text on {{ activeRoleLabel.toLowerCase() }}
          strong(:data-pass="String(roleContrast.onFill.pass)") {{ contrastLabel(roleContrast.onFill) }}
          UiButton(
            v-if="!roleContrast.onFill.pass",
            label="Darken until it passes",
            size="small",
            text,
            @click="fixOnFill"
          )
        p.style-studio__check
          span As a mark on the page
          strong(:data-pass="String(roleContrast.onPage.pass)") {{ contrastLabel(roleContrast.onPage) }}
          UiButton(
            v-if="!roleContrast.onPage.pass",
            label="Use nearest passing shade",
            size="small",
            text,
            @click="fixOnPage"
          )

      section.style-studio__paper-ink(aria-labelledby="studio-paper-ink-heading")
        h3#studio-paper-ink-heading.style-studio__label Paper &amp; ink · {{ resolvedModeLabel }} mode
        p.style-studio__hint Paper is the background and ink is the text; every surface, border and grey mixes between them.
        .style-studio__paper-ink-fields
          .style-studio__paper-ink-field(v-for="field in paperInkFields", :key="field.key")
            label.style-studio__label(:for="`studio-${field.key}-hex`") {{ field.label }}
            .style-studio__role-controls
              UiColorPicker(
                :model-value="paperInkPair[field.key]",
                :input-id="`studio-${field.key}-picker`",
                :aria-label="`${field.label} colour`",
                @update:model-value="(value) => setPaperInkHex(field.key, value)"
              )
              UiInputText(
                :model-value="paperInkPair[field.key]",
                :input-id="`studio-${field.key}-hex`",
                placeholder="#rrggbb",
                @update:model-value="(value) => setPaperInkHex(field.key, value)"
              )
        .style-studio__paper-ink-preview(
          role="img",
          :aria-label="`Preview: ${paperInkPair.ink} ink on ${paperInkPair.paper} paper, with neutral steps and ink alpha washes`"
        )
          span(
            v-for="swatch in paperInkPreview",
            :key="swatch.id",
            :style="{ background: swatch.css }",
            :title="swatch.id"
          )
        label.style-studio__derive.style-studio__paper-ink-link(for="studio-paper-ink-linked")
          UiCheckbox(v-model="paperInkLinkedModel", binary, input-id="studio-paper-ink-linked")
          span {{ otherModeLabel }} mode uses the inverse
        ul.style-studio__paper-ink-checks(role="list", aria-live="polite")
          li.style-studio__check(v-for="check in paperInkChecks", :key="check.id")
            span {{ check.label }}
            strong(:data-pass="String(check.pass)") {{ contrastLabel(check) }}
        .style-studio__paper-ink-actions
          UiButton(label="Swap paper and ink", type="button", size="small", text, @click="swapPaperInk")
          UiButton(
            label="Reset paper and ink",
            type="button",
            size="small",
            text,
            :disabled="paperInkIsDefault",
            @click="resetDraftPaperInk"
          )

      .grid-x.grid-margin-x.style-studio__cluster
        .cell.small-12.medium-4
          span.style-studio__label Color mode
          .style-studio__options
            label(v-for="option in modes", :key="option.value")
              UiRadio(
                v-model="modeModel",
                name="studio-mode",
                :value="option.value",
                :input-id="`studio-mode-${option.value}`",
                :aria-label="option.label"
              )
              span {{ option.label }}
        .cell.small-12.medium-4
          span.style-studio__label Motion
          .style-studio__options
            label(v-for="option in motions", :key="option.value")
              UiRadio(
                v-model="motionModel",
                name="studio-motion",
                :value="option.value",
                :input-id="`studio-motion-${option.value}`",
                :aria-label="option.label"
              )
              span {{ option.label }}
        .cell.small-12.medium-4
          AppBackgroundPicker(
            v-model="backgroundModel",
            v-model:custom="backgroundCustomModel",
            name="studio-background"
          )

      .style-studio__draft-bar(role="region", aria-label="Draft actions", :data-dirty="dirty ? 'true' : undefined")
        span.style-studio__draft-state(aria-live="polite") {{ dirty ? 'Unsaved changes' : 'All changes applied' }}
        UiButton(
          label="Discard changes",
          type="button",
          severity="secondary",
          text,
          :disabled="!dirty",
          @click="onDiscard"
        )
        .style-studio__save
          UiInputText(
            v-model="saveName",
            input-id="studio-save-name",
            aria-label="Setup name",
            placeholder="Setup name"
          )
          UiButton(label="Save as setup", type="button", severity="secondary", variant="outlined", @click="onSave")
        UiButton(label="Apply", type="button", :disabled="!dirty", @click="onApply")
        p.style-studio__save-error(v-if="saveError", role="alert") {{ saveError }}
        p.style-studio__replace(v-if="replaceTarget", role="alert")
          span Replace “{{ replaceTarget.name }}”?
          UiButton(label="Replace", type="button", size="small", severity="danger", @click="confirmReplace")
          UiButton(label="Save as new", type="button", size="small", variant="outlined", @click="saveAsNew")
</template>

<script setup lang="ts">
/**
 * Style Studio workbench — one role at a time with a live WCAG readout, a sticky
 * "Unsaved changes" bar, setups with Undo, and the shared background picker.
 * The draft previews site-wide (`persist: false`) until Apply or Discard; it is
 * no longer reverted on unmount, and the app-level `style-draft-guard` plugin asks before a reload.
 */
import { evaluateRoleContrast, nearestPassingShade, type BrandRole, type RoleCheck } from '#shared/contrast-guard';
import {
  isDefaultPaperInk,
  type BackgroundMode,
  type BrandPack,
  type MotionPreference,
  type StyleSetup,
  type StyleSetupMode,
} from '#shared/personalization';
import { resolveCssColorToHex } from '#shared/utils/resolve-css-color';
import {
  checkPaperInk,
  Color,
  NEUTRAL_ROLE_STEPS,
  neutralStep,
  parseCssColor,
  relativeLuminance,
  type PaperInkPair,
} from '@tgmc/theme';

const SETUP_UNDO_MS = 8000;
const FALLBACK_PAGE_BACKGROUND = '#0f0908';

const {
  dirty,
  saveName,
  appliedPulse,
  setDraftPrimary,
  setDraftSecondary,
  setDraftAccent,
  setDraftRoleDerived,
  setDraftMotion,
  setDraftBackground,
  setDraftBackgroundCustom,
  setDraftMode,
  setDraftPaperInk,
  setDraftPaperInkLinked,
  resetDraftPaperInk,
  applyPackToDraft,
  loadSetupIntoDraft,
  applyDraft,
  revertDraft,
  saveDraftAs,
  personalization,
} = useStyleStudioDraft();

const {
  brandRoles,
  paperInk,
  motion,
  background,
  backgroundCustom,
  brandPacks,
  accent,
  swatches,
  styleSetups,
  activeSetupId,
  removeSetup,
  restoreSetup,
} = personalization;

const palettePacks = computed(() => brandPacks.filter((pack) => pack.kind === 'palette'));
const colorPacks = computed(() => brandPacks.filter((pack) => pack.kind === 'color'));

function labelTextVar(fills: string[]): string {
  if (!import.meta.client || fills.length === 0) return 'var(--text-color)';
  const text = resolveCssColorToHex('var(--text-color)');
  const secondary = resolveCssColorToHex('var(--text-secondary-color)');
  if (!text || !secondary) return 'var(--text-color)';
  const worst = (ink: string) => Math.min(...fills.map((fill) => Color.contrastRatio(ink, Color.toHex(fill))));
  return worst(text) >= worst(secondary) ? 'var(--text-color)' : 'var(--text-secondary-color)';
}

function selectionLabelStyle(pack: BrandPack): Record<string, string> {
  const mode = resolvedMode.value === 'light' ? 'light' : 'dark';
  const primary = pack.primary[mode];
  const secondary = pack.secondary[mode];
  return {
    backgroundColor: primary,
    backgroundImage: `linear-gradient(90deg, ${primary}, ${secondary})`,
    color: labelTextVar([primary, secondary]),
  };
}

const activeField = computed(() => brandPacks.find((pack) => pack.id === accent.value)?.background ?? null);

const modes: Array<{ label: string; value: StyleSetupMode }> = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];
const motions: Array<{ label: string; value: MotionPreference }> = [
  { label: 'System', value: 'system' },
  { label: 'Playful', value: 'playful' },
  { label: 'Reduced', value: 'reduced' },
];
const roleOptions: Array<{ key: BrandRole; label: string }> = [
  { key: 'primary', label: 'Primary' },
  { key: 'secondary', label: 'Secondary' },
  { key: 'accent', label: 'Accent' },
];

const modeModel = computed({
  get: () => personalization.mode.value,
  set: (value: StyleSetupMode) => setDraftMode(value),
});
const motionModel = computed({
  get: () => motion.value,
  set: (value: MotionPreference) => setDraftMotion(value),
});
const backgroundModel = computed({
  get: () => background.value,
  set: (value: BackgroundMode) => setDraftBackground(value),
});
const backgroundCustomModel = computed({
  get: () => backgroundCustom.value,
  set: (value: string) => {
    const hex = parseHex(value);
    if (hex) setDraftBackgroundCustom(hex);
  },
});

const visibleSwatches = computed(() => swatches.slice(0, 24));

function parseHex(value: string | number | null | undefined): string | null {
  if (value == null || value === '') return null;
  const raw = String(value).trim();
  if (!Color.isValid(raw) && !Color.isValid(`#${raw}`)) return null;
  return Color.toHex(raw.startsWith('#') ? raw : `#${raw}`);
}

// --- Role-first editing + contrast guard -------------------------------------------------
const activeRole = ref<BrandRole>('primary');
const activeRoleLabel = computed(() => roleOptions.find((role) => role.key === activeRole.value)?.label ?? 'Primary');
const roleHex = computed(() => brandRoles.value[activeRole.value]);

function setRoleHex(value: unknown): void {
  const hex = parseHex(value as string | null);
  if (!hex) return;
  if (activeRole.value === 'primary') setDraftPrimary(hex);
  else if (activeRole.value === 'secondary') setDraftSecondary(hex);
  else setDraftAccent(hex);
}

const deriveModel = computed({
  get: () => (activeRole.value === 'secondary' ? !brandRoles.value.secondaryLocked : !brandRoles.value.accentLocked),
  set: (derive: boolean) => {
    if (activeRole.value !== 'primary') setDraftRoleDerived(activeRole.value, derive);
  },
});

const pageBackground = ref(FALLBACK_PAGE_BACKGROUND);
function readPageBackground(): void {
  if (!import.meta.client) return;
  // Roles are derived at runtime (color-mix from paper / ink) — resolve what the page paints.
  pageBackground.value = resolveCssColorToHex('var(--main-background)') ?? FALLBACK_PAGE_BACKGROUND;
}
onMounted(readPageBackground);
watch(
  () => personalization.mode.value,
  () => nextTick(readPageBackground)
);

const roleContrast = computed(() => evaluateRoleContrast(activeRole.value, roleHex.value, pageBackground.value));

function contrastLabel(check: Pick<RoleCheck, 'pass' | 'ratio' | 'min'>): string {
  return check.pass ? `${check.ratio}:1 ✓ AA` : `${check.ratio}:1 ✕ below ${check.min}:1`;
}

function fixOnFill(): void {
  setRoleHex(nearestPassingShade(roleHex.value, '#ffffff', 4.5, '#000000'));
}

function fixOnPage(): void {
  const rgb = parseCssColor(pageBackground.value);
  const lighten = rgb ? relativeLuminance(rgb) < 0.5 : true;
  setRoleHex(
    nearestPassingShade(
      roleHex.value,
      pageBackground.value,
      roleContrast.value.onPage.min,
      lighten ? '#ffffff' : '#000000'
    )
  );
}

// --- Pen & paper (per mode) --------------------------------------------------------------
type ResolvedMode = 'light' | 'dark';
const resolvedMode = ref<ResolvedMode>('dark');
function readResolvedMode(): void {
  if (!import.meta.client) return;
  resolvedMode.value = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}
let stopModeWatch: (() => void) | null = null;
onMounted(() => {
  readResolvedMode();
  stopModeWatch = useThemeTokens().subscribeThemeMode(() => {
    readResolvedMode();
    nextTick(readPageBackground);
  });
});
watch(
  () => personalization.mode.value,
  () => nextTick(readResolvedMode)
);
// Paper / ink changes repaint the page background the role check reads.
watch(paperInk, () => nextTick(readPageBackground), { deep: true });

const modeLabel = (mode: ResolvedMode) => (mode === 'light' ? 'Light' : 'Dark');
const resolvedModeLabel = computed(() => modeLabel(resolvedMode.value));
const otherModeLabel = computed(() => modeLabel(resolvedMode.value === 'light' ? 'dark' : 'light'));
const paperInkPair = computed<PaperInkPair>(() => paperInk.value[resolvedMode.value]);
const paperInkFields: Array<{ key: keyof PaperInkPair; label: string }> = [
  { key: 'paper', label: 'Paper (background)' },
  { key: 'ink', label: 'Ink (text)' },
];

function setPaperInkHex(key: keyof PaperInkPair, value: unknown): void {
  const hex = parseHex(value as string | null);
  if (!hex) return;
  setDraftPaperInk(resolvedMode.value, { ...paperInkPair.value, [key]: hex });
}

function swapPaperInk(): void {
  const { paper, ink } = paperInkPair.value;
  setDraftPaperInk(resolvedMode.value, { paper: ink, ink: paper });
}

const paperInkLinkedModel = computed({
  get: () => paperInk.value.linked,
  set: (linked: boolean) => setDraftPaperInkLinked(Boolean(linked), resolvedMode.value),
});
const paperInkIsDefault = computed(() => isDefaultPaperInk(paperInk.value));
const paperInkChecks = computed(() => checkPaperInk(paperInkPair.value, resolvedMode.value));

/** Neutral steps (page → text) plus ink alpha washes over paper, as the page will paint them. */
const paperInkPreview = computed(() => {
  const pair = paperInkPair.value;
  const steps = NEUTRAL_ROLE_STEPS[resolvedMode.value];
  const solid = [
    0,
    steps['--surface-color'],
    steps['--surface-variant'],
    steps['--border-strong'],
    steps['--text-secondary-color'],
    steps['--text-color'],
  ].map((step) => ({ id: `neutral-${step}`, css: neutralStep(pair, step) }));
  const alpha = [8, 24, 48].map((a) => {
    const wash = `color-mix(in srgb, ${pair.ink} ${a}%, transparent)`;
    return { id: `ink-a${a}`, css: `linear-gradient(${wash}, ${wash}), ${pair.paper}` };
  });
  return [...solid, ...alpha];
});

// --- Setups: select, delete with Undo, save / replace ------------------------------------
const pendingSetupUndo = ref<{ setup: StyleSetup; index: number; wasActive: boolean } | null>(null);
let setupUndoTimer: ReturnType<typeof setTimeout> | null = null;

function onSelectSetup(setup: StyleSetup): void {
  loadSetupIntoDraft(setup);
  saveName.value = setup.name;
}

function onDeleteSetup(id: string): void {
  const index = styleSetups.value.findIndex((item) => item.id === id);
  const setup = styleSetups.value[index];
  if (!setup) return;
  pendingSetupUndo.value = { setup, index, wasActive: activeSetupId.value === id };
  removeSetup(id);
  if (setupUndoTimer) clearTimeout(setupUndoTimer);
  setupUndoTimer = setTimeout(() => {
    pendingSetupUndo.value = null;
  }, SETUP_UNDO_MS);
}

function undoDeleteSetup(): void {
  const pending = pendingSetupUndo.value;
  if (!pending) return;
  restoreSetup(pending.setup, pending.index, pending.wasActive);
  pendingSetupUndo.value = null;
  if (setupUndoTimer) clearTimeout(setupUndoTimer);
}

const replaceTarget = ref<StyleSetup | null>(null);
const saveError = ref('');
watch(saveName, () => {
  replaceTarget.value = null;
  saveError.value = '';
});

function onSave(): void {
  const name = saveName.value.trim();
  saveError.value = name ? '' : 'Name this setup';
  if (!name) return;
  const existing = styleSetups.value.find((item) => item.name === name);
  if (existing) {
    replaceTarget.value = existing;
    return;
  }
  saveDraftAs(name);
}

function confirmReplace(): void {
  const target = replaceTarget.value;
  if (!target) return;
  saveDraftAs(target.name, target.id);
  replaceTarget.value = null;
}

function saveAsNew(): void {
  const base = saveName.value.trim();
  let name = `${base} (2)`;
  for (let n = 3; styleSetups.value.some((item) => item.name === name); n += 1) name = `${base} (${n})`;
  saveDraftAs(name);
  replaceTarget.value = null;
}

function onApply(): void {
  applyDraft();
  replaceTarget.value = null;
  saveError.value = '';
}

function onDiscard(): void {
  revertDraft();
  replaceTarget.value = null;
  saveError.value = '';
}

onBeforeUnmount(() => {
  stopModeWatch?.();
  if (setupUndoTimer) clearTimeout(setupUndoTimer);
});
</script>

<style lang="scss" src="./AppStyleStudio.scss" scoped></style>
