<template lang="pug">
.page-content.styles-page
  header
    p.eyebrow-container.text-shadow-primary Design system
    h1.display Styles
    p.lead One kitchen sink for&nbsp;
      code @tgmc/theme
      | : Native HTML, Foundation XY layout, and PrimeVue&nbsp;
      code Ui*
      |
      | wrappers side by side.

  .page-with-nav
    AppPageNav(:items="_navItems")

    div(data-region="body")
      section#compare(aria-labelledby="compare-heading")
        h2#compare-heading.title How to read this page
        p.lead Each sample row uses three columns so Native, Foundation, and PrimeVue stay aligned for parity checks.

        .styles-lanes(aria-hidden="true")
          span(data-lane="native") Native
          span(data-lane="foundation") Foundation
          span(data-lane="primevue") PrimeVue

      section#theme-mode(aria-labelledby="theme-heading")
        h2#theme-heading.title Theme mode
        p.lead Preference is <code>light</code> | <code>dark</code> | <code>system</code>, resolved against&nbsp;
          code prefers-color-scheme
          |
          | via <code>useThemeTokens()</code>.

        ClientOnly
          template(#fallback)
            p Loading theme controls…
          .styles-compare
            article.styles-col(data-lane="native")
              p.styles-col__label Native
              p
                | Preference:&nbsp;
                strong {{ themePreference }}
              p
                | Resolved:&nbsp;
                strong {{ themeResolved }}

            article.styles-col(data-lane="foundation")
              p.styles-col__label Foundation
              .layout(data-algo="complex")
                .grid-x.grid-margin-x
                  .cell.small-4
                    button.btn.w-full(
                      type="button",
                      :aria-pressed="themePreference === 'light'",
                      :data-variant="themePreference === 'light' ? 'solid' : 'outline'",
                      @click="_setThemePreference('light')"
                    ) Light
                  .cell.small-4
                    button.btn.w-full(
                      type="button",
                      :aria-pressed="themePreference === 'system'",
                      :data-variant="themePreference === 'system' ? 'solid' : 'outline'",
                      @click="_setThemePreference('system')"
                    ) System
                  .cell.small-4
                    button.btn.w-full(
                      type="button",
                      :aria-pressed="themePreference === 'dark'",
                      :data-variant="themePreference === 'dark' ? 'solid' : 'outline'",
                      @click="_setThemePreference('dark')"
                    ) Dark

            article.styles-col(data-lane="primevue")
              p.styles-col__label PrimeVue
              .button-row
                UiButton(
                  label="Light",
                  type="button",
                  :severity="themePreference === 'light' ? undefined : 'secondary'",
                  :variant="themePreference === 'light' ? undefined : 'outlined'",
                  @click="_setThemePreference('light')"
                )
                UiButton(
                  label="System",
                  type="button",
                  :severity="themePreference === 'system' ? undefined : 'secondary'",
                  :variant="themePreference === 'system' ? undefined : 'outlined'",
                  @click="_setThemePreference('system')"
                )
                UiButton(
                  label="Dark",
                  type="button",
                  :severity="themePreference === 'dark' ? undefined : 'secondary'",
                  :variant="themePreference === 'dark' ? undefined : 'outlined'",
                  @click="_setThemePreference('dark')"
                )

      section#typography(aria-labelledby="typography-heading")
        h2#typography-heading.title Typography
        p.lead Heading samples, body copy, and inline marks across stacks.

        .styles-compare
          article.styles-col(data-lane="native")
            p.styles-col__label Native
            p.heading-sample(data-size="3") Heading 3
            p.heading-sample(data-size="4", data-variant="title") Title 4
            p Paragraph with <strong>strong</strong>, <em>emphasis</em>, <code>code</code>, and <mark>mark</mark>.
            p
              abbr(title="HyperText Markup Language") HTML
              |
              | · H<sub>2</sub>O · m<sup>2</sup>

          article.styles-col(data-lane="foundation")
            p.styles-col__label Foundation
            .layout(data-algo="complex")
              .grid-x.grid-margin-x
                .cell.small-12
                  p.heading-sample(data-size="3") Heading 3
                  p.heading-sample(data-size="4", data-variant="title") Title 4
                  p Body in an XY&nbsp;
                    code cell
                    |
                    | track with the same type tokens.
                  p.lead Nested copy stays readable at&nbsp;
                    code medium+
                    |
                    | widths.

          article.styles-col(data-lane="primevue")
            p.styles-col__label PrimeVue
            p.heading-sample(data-size="3") Heading 3
            p.heading-sample(data-size="4", data-variant="title") Title 4
            UiMessage(severity="info")
              | Stack:&nbsp;
              code {{ _uiStackLabel }}
            .button-row
              UiTag(value="Typography", severity="secondary")
              UiTag(value="Scale", rounded)
      section#buttons(aria-labelledby="buttons-heading")
        h2#buttons-heading.title Buttons
        p.lead Primary actions from theme&nbsp;
          code .btn
          | , Foundation XY clusters, and&nbsp;
          code UiButton
          | .

        .styles-compare
          article.styles-col(data-lane="native")
            p.styles-col__label Native
            .button-row
              button.btn(type="button", data-variant="solid") Solid
              button.btn(type="button", data-variant="outline") Outline
              button.btn(type="button", data-variant="ghost") Ghost
            .button-row
              button.btn(type="button", data-variant="soft") Soft
              button.btn(type="button", data-variant="glass") Glass
            .button-row
              button.btn(type="button", data-variant="outline", data-size="sm") Small
              button.btn(type="button", data-variant="outline", data-size="lg") Large
            .btn-group(role="group", aria-label="Native button group")
              button.btn(type="button", data-variant="solid") Left
              button.btn(type="button", data-variant="solid") Middle
              button.btn(type="button", data-variant="solid") Right

          article.styles-col(data-lane="foundation")
            p.styles-col__label Foundation
            .layout(data-algo="complex")
              .grid-x.grid-margin-x
                .cell.small-12.medium-6
                  button.btn.w-full(type="button", data-variant="solid") Full cell
                .cell.small-12.medium-6
                  button.btn.w-full(type="button", data-variant="outline") Full cell
              .grid-x.grid-margin-x
                .cell.small-4
                  button.btn.w-full(type="button", data-variant="soft") A
                .cell.small-4
                  button.btn.w-full(type="button", data-variant="ghost") B
                .cell.small-4
                  button.btn.w-full(type="button", data-variant="glass") C

          article.styles-col(data-lane="primevue")
            p.styles-col__label PrimeVue
            .button-row
              UiButton(label="Primary", type="button")
              UiButton(label="Secondary", type="button", severity="secondary", variant="outlined")
            .button-row
              UiButton(label="Success", type="button", severity="success")
              UiButton(label="Danger", type="button", severity="danger", variant="outlined")
            .button-row
              UiButton(label="Text", type="button", variant="text")
              UiButton(label="Dialog", type="button", icon="pi pi-external-link", @click="_dialogOpen = true")
            UiDialog(v-model:visible="_dialogOpen", header="Sample dialog")
              p Confirm actions live in the PrimeVue column.
              template(#footer)
                .button-row.mb-0
                  UiButton(
                    label="Close",
                    type="button",
                    severity="secondary",
                    variant="text",
                    @click="_dialogOpen = false"
                  )
                  UiButton(label="Confirm", type="button", @click="_dialogOpen = false")

      section#forms(aria-labelledby="forms-heading")
        h2#forms-heading.title Forms
        p.lead Text fields and choices — native controls, XY-arranged fields, and Ui wrappers.

        .styles-compare
          article.styles-col(data-lane="native")
            p.styles-col__label Native
            form(@submit.prevent)
              .field
                label(for="styles-native-name") Name
                input#styles-native-name(type="text", name="name", autocomplete="name", placeholder="Jane Doe")
              .field
                label(for="styles-native-note") Note
                textarea#styles-native-note(name="note", rows="3", placeholder="Short note")
              .field
                label(for="styles-native-role") Role
                select#styles-native-role(name="role")
                  option(value="", disabled, selected) — Pick —
                  option(value="design") Designer
                  option(value="dev") Developer
              .button-row
                input#styles-native-check(type="checkbox", name="subscribe", checked)
                label(for="styles-native-check") Subscribe

          article.styles-col(data-lane="foundation")
            p.styles-col__label Foundation
            form(@submit.prevent)
              .layout(data-algo="complex")
                .grid-x.grid-margin-x
                  .cell.small-12.medium-6
                    .field
                      label(for="styles-xy-name") Name
                      input#styles-xy-name(type="text", name="xy-name", placeholder="Jane Doe")
                  .cell.small-12.medium-6
                    .field
                      label(for="styles-xy-role") Role
                      select#styles-xy-role(name="xy-role")
                        option(value="", disabled, selected) — Pick —
                        option(value="design") Designer
                        option(value="dev") Developer
                .grid-x.grid-margin-x
                  .cell.small-12
                    .field
                      label(for="styles-xy-note") Note
                      textarea#styles-xy-note(name="xy-note", rows="3", placeholder="XY full-width note")

          article.styles-col(data-lane="primevue")
            p.styles-col__label PrimeVue
            form(@submit.prevent)
              .field
                label(for="styles-ui-name") Name
                UiInputText(v-model="_uiName", input-id="styles-ui-name", name="ui-name", placeholder="Jane Doe")
              .field
                label(for="styles-ui-role") Role
                UiSelect(
                  v-model="_uiRole",
                  input-id="styles-ui-role",
                  name="ui-role",
                  :options="_uiRoleOptions",
                  option-label="label",
                  option-value="value",
                  placeholder="Choose a role"
                )
              .field
                label(for="styles-ui-note") Note
                UiTextarea(
                  v-model="_uiNote",
                  input-id="styles-ui-note",
                  name="ui-note",
                  :rows="3",
                  placeholder="Short note"
                )
              .button-row
                UiCheckbox(v-model="_uiSubscribed", input-id="styles-ui-check", name="ui-subscribe")
                label(for="styles-ui-check") Subscribe
              .button-row
                UiToggleSwitch(v-model="_uiDarkish", input-id="styles-ui-toggle")
                label(for="styles-ui-toggle") Toggle

      section#layout(aria-labelledby="layout-heading")
        h2#layout-heading.title Layout
        p.lead Structural intents: CSS Grid/Flex utilities, Foundation XY, and PrimeVue surfaces.

        .styles-compare
          article.styles-col(data-lane="native")
            p.styles-col__label Native
            p(data-type="kicker") auto-grid
            .auto-grid(data-layout="surface")
              .panel
                p.m-0 A
              .panel
                p.m-0 B
              .panel
                p.m-0 C
            p(data-type="kicker") cluster
            .layout(data-algo="cluster")
              span.styles-chip Alpha
              span.styles-chip Beta
              span.styles-chip Gamma

          article.styles-col(data-lane="foundation")
            p.styles-col__label Foundation
            p(data-type="kicker") grid-x · equal thirds
            .layout(data-algo="complex")
              .grid-x.grid-margin-x
                .cell.small-12.medium-4
                  .panel
                    p.m-0 Col 1
                .cell.small-12.medium-4
                  .panel
                    p.m-0 Col 2
                .cell.small-12.medium-4
                  .panel
                    p.m-0 Col 3
            p(data-type="kicker") 8 / 4 split
            .layout(data-algo="complex")
              .grid-x.grid-margin-x
                .cell.small-12.medium-8
                  .panel
                    p.m-0 Main
                .cell.small-12.medium-4
                  .panel
                    p.m-0 Rail

          article.styles-col(data-lane="primevue")
            p.styles-col__label PrimeVue
            UiCard
              template(#title) UiCard
              template(#subtitle) Equal column card
              template(#content)
                p.m-0 Card body uses the shared page column width.
              template(#footer)
                .button-row.mb-0
                  UiButton(label="Action", type="button", size="small")
            UiPanel(header="UiPanel")
              p.m-0 Panel content for chrome parity.

      section#feedback(aria-labelledby="feedback-heading")
        h2#feedback-heading.title Feedback
        p.lead Status, tags, and progress — native notes, XY panels, and Ui chrome.

        .styles-compare
          article.styles-col(data-lane="native")
            p.styles-col__label Native
            p.note Native note surface for callouts and asides.
            ul.list
              li Success path documented
              li Warn on empty state
            .field
              label(for="styles-native-progress") Progress
              progress#styles-native-progress.max-w-full(max="100", :value="_progress") {{ _progress }}%

          article.styles-col(data-lane="foundation")
            p.styles-col__label Foundation
            .layout(data-algo="complex")
              .grid-x.grid-margin-x
                .cell.small-12
                  .panel
                    p(data-type="panel-title") XY callout
                    p.m-0 Foundation places feedback in equal-width cells beside neighboring stacks.
                .cell.small-6
                  .panel
                    p.m-0 Left half
                .cell.small-6
                  .panel
                    p.m-0 Right half

          article.styles-col(data-lane="primevue")
            p.styles-col__label PrimeVue
            UiMessage(severity="success") Success message sample
            UiMessage(severity="warn") Warning message sample
            .button-row
              UiBadge(value="3", severity="danger")
              UiBadge(value="New", severity="info")
              UiChip(label="Chip", icon="pi pi-user")
              UiChip(label="Removable", removable, @remove="_onChipRemove")
            .field
              label Progress
              UiProgressBar(:value="_progress", :show-value="true", aria-label="Progress completion")
            UiTimeline(:value="_timelineItems", align="left")
              template(#content="{ item }")
                p.m-0
                  strong {{ item.status }}
                  |
                  | — {{ item.detail }}

      section#colors(aria-labelledby="colors-heading")
        h2#colors-heading.title Colors
        p.lead Semantic and accent tokens shared by all three stacks.

        h3 Semantic
        ul.auto-grid.list(data-layout="swatch")
          li.swatch(v-for="swatch in _semanticSwatches", :key="swatch.token")
            span(data-chip, :style="{ background: `var(${swatch.token})` }", aria-hidden="true")
            div(data-meta)
              code {{ swatch.token }}
              span {{ swatch.label }}

        h3 Brand &amp; surface
        ul.auto-grid.list(data-layout="swatch")
          li.swatch(v-for="swatch in _brandSwatches", :key="swatch.token")
            span(data-chip, :style="{ background: `var(${swatch.token})` }", aria-hidden="true")
            div(data-meta)
              code {{ swatch.token }}
              span {{ swatch.label }}

        h3 Spectrum
        ul.auto-grid.list(data-layout="swatch-compact")
          li.swatch(v-for="swatch in _spectrumSwatches", :key="swatch.token")
            span(data-chip, :style="{ background: `var(${swatch.token})` }", :title="swatch.token", aria-hidden="true")
            div(data-meta)
              code {{ swatch.token }}

      section#surfaces(aria-labelledby="surfaces-heading")
        h2#surfaces-heading.title Surfaces
        p.lead Background, border, and text tokens in context — still equal thirds.

        .styles-compare
          article.styles-col.surface-demo(
            v-for="surface in _surfaces",
            :key="surface.id",
            :style="surface.style",
            :data-lane="surface.lane"
          )
            p.styles-col__label {{ surface.laneLabel }}
            h3 {{ surface.title }}
            p {{ surface.body }}
            p(data-tokens)
              code(v-for="token in surface.tokens", :key="token") {{ token }}

      section#code(aria-labelledby="code-heading")
        h2#code-heading.title Code
        p.lead Syntax-highlighted blocks from global&nbsp;
          code _syntax.scss
          |
          | — raw&nbsp;
          code pre
          | , XY-wrapped samples, and&nbsp;
          code UiCodeBlock
          | .

        .styles-compare
          article.styles-col(data-lane="native")
            p.styles-col__label Native
            p(data-type="kicker") pre · language-scss
            UiCodeBlock(:code="_codeScss", language="scss", render-mode="ssr", aria-label="Native SCSS sample")
            p(data-type="kicker") pre · language-ts
            UiCodeBlock(:code="_codeTs", language="ts", render-mode="ssr", aria-label="Native TypeScript sample")

          article.styles-col(data-lane="foundation")
            p.styles-col__label Foundation
            .layout(data-algo="complex")
              .grid-x.grid-margin-x
                .cell.small-12
                  p(data-type="kicker") cell · language-vue
                  UiCodeBlock(:code="_codeVue", language="html", render-mode="ssr", aria-label="Foundation Vue sample")
                .cell.small-12
                  p(data-type="kicker") cell · language-bash
                  UiCodeBlock(
                    :code="_codeBash",
                    language="bash",
                    render-mode="ssr",
                    aria-label="Foundation shell sample"
                  )

          article.styles-col(data-lane="primevue")
            p.styles-col__label PrimeVue
            UiCodeBlock(
              :code="_codeScss",
              language="scss",
              render-mode="client-only",
              aria-label="UiCodeBlock SCSS sample"
            )
            UiCodeBlock(
              :code="_codeTs",
              language="ts",
              :line-numbers="true",
              render-mode="client-only",
              aria-label="UiCodeBlock TypeScript sample"
            )
            UiCodeBlock(
              :code="_codeJson",
              language="json",
              render-mode="client-only",
              aria-label="UiCodeBlock JSON sample"
            )
</template>

<script setup lang="ts">
import type { ThemeModePreference, ThemeResolvedMode } from '#shared/theme/theme-tokens-api';

definePageMeta({
  breadcrumb: 'Styles',
});

useHead({
  title: 'Styles',
  meta: [
    {
      name: 'description',
      content:
        'Unified style kitchen sink: Native HTML, Foundation XY, and PrimeVue Ui wrappers in equal-width columns.',
    },
  ],
});

const _navItems = [
  { id: 'compare', label: 'Overview' },
  { id: 'theme-mode', label: 'Theme mode' },
  { id: 'typography', label: 'Typography' },
  { id: 'buttons', label: 'Buttons' },
  { id: 'forms', label: 'Forms' },
  { id: 'layout', label: 'Layout' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'colors', label: 'Colors' },
  { id: 'surfaces', label: 'Surfaces' },
  { id: 'code', label: 'Code' },
];

const _codeScss = `:root[data-theme='light'] {
  --button-fg: #{dyn-color-against-fill($primary-color-light, $secondary-color-light)};
  --button-bg: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
}`;

const _codeTs = `import { pickContrastingInk } from '@tgmc/theme';

const ink = pickContrastingInk({
  backgroundColor: '#132440',
  backgroundImage: 'linear-gradient(135deg, #285a48, #132440)',
});`;

const _codeVue = `<UiCodeBlock
  :code="snippet"
  language="scss"
  render-mode="client-only"
/>`;

const _codeBash = `npm run start
nx build @tgmc/theme`;

const _codeJson = `{
  "name": "@tgmc/theme",
  "exports": {
    "./scss": "./scss/index.scss"
  }
}`;

const _semanticSwatches = [
  { token: '--primary-color', label: 'Primary' },
  { token: '--secondary-color', label: 'Secondary' },
  { token: '--tertiary-color', label: 'Tertiary' },
  { token: '--accent-color', label: 'Accent' },
  { token: '--success', label: 'Success' },
  { token: '--warning', label: 'Warning' },
  { token: '--error', label: 'Error' },
  { token: '--info', label: 'Info' },
] as const;

const _brandSwatches = [
  { token: '--main-background', label: 'Main background' },
  { token: '--main-background-secondary', label: 'Secondary background' },
  { token: '--surface-color', label: 'Surface' },
  { token: '--surface-variant', label: 'Surface variant' },
  { token: '--text-color', label: 'Text' },
  { token: '--text-secondary-color', label: 'Text secondary' },
  { token: '--border-color', label: 'Border' },
  { token: '--focus-ring', label: 'Focus ring' },
] as const;

const _spectrumSwatches = [
  { token: '--color-red' },
  { token: '--color-orange' },
  { token: '--color-amber' },
  { token: '--color-yellow' },
  { token: '--color-lime' },
  { token: '--color-green' },
  { token: '--color-teal' },
  { token: '--color-blue' },
  { token: '--color-purple' },
  { token: '--color-magenta' },
] as const;

const _surfaces = [
  {
    id: 'main',
    lane: 'native',
    laneLabel: 'Native',
    title: 'Main canvas',
    body: 'Default page canvas using main background and body text.',
    tokens: ['--main-background', '--text-color'],
    style: {
      background: 'var(--main-background)',
      color: 'var(--text-color)',
      borderColor: 'var(--border-color)',
    },
  },
  {
    id: 'surface',
    lane: 'foundation',
    laneLabel: 'Foundation',
    title: 'Surface panel',
    body: 'Raised panel using surface contrast — typical XY cell fill.',
    tokens: ['--surface-color', '--text-secondary-color'],
    style: {
      background: 'var(--surface-color)',
      color: 'var(--text-color)',
      borderColor: 'var(--border-color)',
    },
  },
  {
    id: 'accent',
    lane: 'primevue',
    laneLabel: 'PrimeVue',
    title: 'Accent wash',
    body: 'Soft primary tint for callouts and highlighted Prime surfaces.',
    tokens: ['--primary-color', '--border-color'],
    style: {
      background: 'color-mix(in srgb, var(--primary-color-default) 16%, var(--main-background))',
      color: 'var(--text-color)',
      borderColor: 'color-mix(in srgb, var(--primary-color-default) 35%, transparent)',
    },
  },
] as const;

const _uiName = ref('');
const _uiRole = ref<string | null>(null);
const _uiNote = ref('');
const _uiSubscribed = ref(false);
const _uiDarkish = ref(false);
const _progress = ref(62);
const _dialogOpen = ref(false);

const { stack: _uiStack } = useUiStack();
const _uiStackLabel = computed(() => _uiStack);

const _uiRoleOptions = [
  { label: 'Designer', value: 'designer' },
  { label: 'Developer', value: 'developer' },
  { label: 'Product manager', value: 'pm' },
];

const _timelineItems = [
  { status: 'Ordered', detail: 'Token pack registered' },
  { status: 'Processing', detail: 'Bridges applied to PrimeVue' },
  { status: 'Shipped', detail: 'Theme mode synced to DOM' },
];

const themePreference = ref<ThemeModePreference>('system');
const themeResolved = ref<ThemeResolvedMode>('dark');
let stopThemeSubscription: (() => void) | undefined;

onMounted(() => {
  const theme = useThemeTokens();
  themePreference.value = theme.getThemeMode();
  themeResolved.value = theme.getResolvedThemeMode();
  stopThemeSubscription = theme.subscribeThemeMode((change) => {
    themePreference.value = change.preference;
    themeResolved.value = change.resolved;
  });
});

onBeforeUnmount(() => {
  stopThemeSubscription?.();
});

function _setThemePreference(mode: ThemeModePreference): void {
  useThemeTokens().setThemeMode(mode);
}

function _onChipRemove(): void {
  // Demo handler — removable chip.
}
</script>

<style lang="scss" scoped>
.styles-page {
  [data-region='body'] {
    display: grid;
    gap: var(--section-gap, 2rem);
    min-width: 0;

    section {
      width: 100%;
    }
  }

  [data-type='kicker'] {
    margin: 0 0 0.35rem;
    color: var(--text-secondary-color, var(--text-color));
    font-size: var(--font-size-sm);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  [data-type='panel-title'] {
    margin: 0 0 0.35rem;
    font-weight: 600;
  }
}

.styles-lanes,
.styles-compare {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(0.75rem, 2vw, 1.25rem);
  align-items: stretch;
}

.styles-lanes {
  margin: 0 0 0.5rem;
  padding: 0.55rem 0.65rem;
  border: 1px solid color-mix(in srgb, var(--border-color) 65%, transparent);
  border-radius: var(--border-radius-md, 0.5rem);
  background: color-mix(in srgb, var(--surface-color) 55%, transparent);

  span {
    margin: 0;
    font-size: var(--font-size-sm);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    text-align: center;
  }
}

.styles-col {
  display: grid;
  gap: 0.65rem;
  min-width: 0;
  height: 100%;
  margin: 0;
  padding: 0.9rem 1rem 1.1rem;
  border: 1px solid color-mix(in srgb, var(--border-color) 65%, transparent);
  border-radius: var(--border-radius-md, 0.5rem);
  background: color-mix(in srgb, var(--surface-color) 45%, transparent);
  box-shadow: none;

  &.surface-demo {
    border-width: 1px;
    border-style: solid;
  }

  :deep(.panel) {
    margin: 0;
  }

  :deep(.button-row) {
    margin-bottom: 0;
  }

  :deep(.syntax-block),
  :deep(.ui-code-block pre) {
    margin: 0;
    max-width: 100%;
  }

  :deep(.ui-code-block) {
    min-width: 0;
  }
}

.styles-col__label {
  margin: 0;
  color: var(--secondary-color, var(--primary-color));
  font-size: var(--font-size-xs);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.styles-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary-color) 14%, transparent);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

@media (max-width: $breakpoint-tablet) {
  .styles-lanes,
  .styles-compare {
    grid-template-columns: 1fr;
  }

  .styles-lanes {
    display: none;
  }
}
</style>
