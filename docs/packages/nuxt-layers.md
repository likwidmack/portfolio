# Nuxt template layers: architecture blueprint

Companion to the roadmap 2026-10-14-ui-template-revision.md. Task briefs point at the section that applies to them. Items marked "verify" were not confirmed against source. This is a design blueprint: where it differs from shipped code, the code and the package docs ([nuxt-layer-base.md](./nuxt-layer-base.md)) win.

## 1. Layer topology

```
packages/nuxt-layer-base   @tgmc/nuxt-layer-base   (no PrimeVue)
  nuxt.config.ts           modules @nuxt/a11y, @nuxt/icon; Sass injection; icon/a11y defaults
  src/config/{a11y,icons,scss,index}.ts
  app/components/a11y/     UiSkipLink, UiAnnouncer, UiVisuallyHidden
  app/composables/         useA11yAnnouncer, useFocusTrap, useInertOutside
  app/utils/               focus-trap.ts, inert-outside.ts (single copies)

packages/nuxt-layer-ui     @tgmc/nuxt-layer-ui     (extends ['@tgmc/nuxt-layer-base'])
  nuxt.config.ts           @primevue/nuxt-module; primevue config; components dir
  src/config/primevue.ts   moved from core/web/config-properties
  app/components/ui/       33 Ui* + forms / data / editor / upload
  app/composables/         useUiStack, useForm, useFormField, useCrudResource, useConfirmUndo,
                           usePagedList, useRouteQueryState, useUploadQueue, useChartTheme
  app/utils/               form-errors.ts, upload-queue.ts, chart-colors.ts, markdown-policy.ts
  shared/types.ts          public types (export "./types")
```

- Keep editor and charts inside the UI package; heavy dependencies load inside their components (`import()` in `onMounted`).
- `core/web/layers/1.base` is empty and auto-loaded by Nuxt. Removing it needs owner approval.
- **Extends chain (a single path to each layer, no diamond):**
  - `core/web` extends `['@tgmc/nuxt-layer-ui']`, and drops `@nuxt/icon`, `@nuxt/a11y` and `@primevue/nuxt-module` from its own `modules`.
  - `packages/web-layer-admin` extends `['@tgmc/nuxt-layer-ui']`.
  - `core/admin` extends `['@tgmc/web-layer-admin']`, and drops its cross-app `components` / `imports.dirs` paths (after auditing which web composables it uses), its `../web/config-properties/primevue-prop` import, its own `scss.additionalData` and its base icon list.
- **defu merge:** arrays concatenate, but functions replace. The base layer therefore owns the single Sass `additionalData`:

```ts
export function tgmcScssAdditionalData(extraUses: string[] = []) {
  const header = ['@use "pkg:@tgmc/theme/scss/nuxt-auto" as *;', ...extraUses].join('\n');
  return (source: string, filename: string) =>
    !filename.includes('.vue') || filename.includes('node_modules') || source.includes('nuxt-auto')
      ? source
      : `${header}\n${source}`;
}
```

- **Theme Sass without `../../`:**
  - Use `NodePackageImporter`, imported from whichever Sass implementation Vite loads.
  - Add a theme export `"./scss/nuxt-auto": { "sass": "./scss/_nuxt-auto.scss", "default": "./scss/_nuxt-auto.scss" }`.
  - Load paths: `dirname(createRequire(import.meta.url).resolve('@tgmc/theme/package.json'))`.
- **Dependencies:**

| Package                                                                                        | Placement in base            | Placement in ui           |
| ---------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------- |
| `nuxt`, `vue`                                                                                  | peer                         | peer                      |
| `@nuxt/icon`                                                                                   | dep `^2.5.1` (root range)    | via base                  |
| `@nuxt/a11y`                                                                                   | dep, root's resolved version | via base                  |
| `@iconify-json/lucide`                                                                         | dep, root range              | via base                  |
| `@tgmc/theme`, `@tgmc/utilities`                                                               | dep `*`                      | via base                  |
| `primevue`, `@primevue/nuxt-module`, `@primeuix/themes`                                        | —                            | peer `^4.5`               |
| `chart.js`                                                                                     | —                            | dep `^4`                  |
| `@tiptap/vue-3`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extensions`, `@tiptap/markdown` | —                            | dep                       |
| `@standard-schema/spec`                                                                        | —                            | dep                       |
| `zod`                                                                                          | —                            | devDep (apps own schemas) |
| `@primevue/forms`                                                                              | —                            | not adopted               |

Add a guard: layer dependency ranges must equal the root ranges.

- **Guard retarget:**
  - Add `core/web/tests/support/ui-source-roots.ts`: `['core/web/app', 'packages/nuxt-layer-base/app', 'packages/nuxt-layer-ui/app']`.
  - `components-scss`, `colors-scss`, `ui-floors` and `icons` walk every root. Each root must produce at least one file, stale allowlist entries fail, and allowlist keys become repo-relative.
  - Shared icon list in `packages/nuxt-layer-base/src/config/icons.ts` (`TGMC_BASE_ICONS`). The icon test checks names against the base list plus the app list. **This changes the documented icon rule (needs owner approval).**
- **Per layer:**
  - Nx targets `build` (nx:noop), `lint` and `test`;
  - `eslint.config.js` with `eslint-plugin-vue-pug`;
  - a Prettier Pug config;
  - `vitest.config.ts`;
  - `"type": "module"`;
  - included in `npm test` (verify `scripts/test-web.sh`).

## 2. Standard component structure

| Tier                              | Examples                                                          | Shape                                                               | Native fallback              |
| --------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------- |
| 0 Accessibility primitives (base) | UiSkipLink, UiAnnouncer, UiVisuallyHidden                         | `.vue`                                                              | native only                  |
| 1 Primitives                      | UiButton, UiInputText, UiSelect                                   | `ui/UiX.vue`                                                        | required (`useUiStack`)      |
| 2 Composites                      | UiFormField, UiForm, UiDrawer, UiConfirmInline, UiUndoNotice      | `ui/UiX.vue`                                                        | required                     |
| 3 Complex                         | UiDataTable, UiChart, UiRichTextEditor, UiMultiUpload, UiCrudView | `ui/UiX/index.vue` + `UiX.scss` (`<style src scoped>`) + `types.ts` | simplest semantic equivalent |

**Tier 3 fallbacks** (each also covers no-JS and SSR):

- UiDataTable: a native `<table>` with sort buttons in the headers.
- UiChart: that data table.
- UiRichTextEditor: a markdown `UiTextarea`.
- UiMultiUpload: always native; it does not use PrimeVue FileUpload.

`App*` / `Admin*` components stay in the apps. Logic lives in composables and utils; components are views.

**Code conventions:**

- `types.ts` exports `UiXProps`, `UiXEmits`, `UiXSlots` and `UiXExpose`, re-exported from `shared/types.ts`.
- `defineOptions({ inheritAttrs: false })` with `v-bind="$attrs"` on the interactive root; `withDefaults(defineProps<…>())`; `defineModel`; typed `defineEmits` / `defineSlots`; `defineExpose({ focus })` on every focusable component.
- In the Pug template, the Prime branch comes first, then the native branch.
- `size` changes only padding and font size; `min-height: var(--touch-target)` holds for every size.
- Booleans default to `false`. Accessible names use `ariaLabel`, and icon-only controls require it.
- Emit only committed intent (`change`, `submit`, `retry`); don't re-emit native events that `$attrs` already forwards.
- Slots are kebab-case; dynamic cell slots are `cell-<field>`.
- `:deep()` only for library internals. Add the PrimeVue DataTable, Chart and ProseMirror wrappers to `DEEP_ALLOWED`.

**UiButton:**

```ts
interface UiButtonProps {
  label?: string;
  icon?: string;
  ariaLabel?: string;
  severity?: 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'contrast' | 'help';
  variant?: 'outlined' | 'text' | 'link' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean; // aria-busy + aria-disabled, stays focusable, clicks ignored
  to?: RouteLocationRaw;
  href?: string; // NuxtLink / a with p-button classes
  external?: boolean; // target=_blank + visually hidden "(opens in a new tab)"
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}
```

**Testing:**

- Pure utilities: Vitest in the node environment.
- Components: `@nuxt/test-utils` (`environment: 'nuxt'`, `mountSuspended`) plus `@vue/test-utils`.
  - Matrix: `uiStack` set to `'primevue'` and to `'native'`; `v-model` round trip; accessible name and `aria-describedby` / `aria-invalid` wiring; keyboard behaviour; `focus()`.
- End to end: Cypress specimens on `/styles/parity`, plus `ui-audit.cy.ts`.

**Docs:**

- `docs/packages/nuxt-layer-ui.md`: a table of tiers 1 and 2.
- `docs/packages/nuxt-layer-ui/<ui-x>.md`: one page per tier 3 component.
- Catalog entries in `docs/README.md` and `docs/_catalog.md`.
- Keep the JSDoc header in each SFC.

## 3. Forms: in-house `useForm` on Standard Schema (zod 4)

**Why not `@primevue/forms`:**

- It breaks the native fallback, because fields register through PrimeVue's form injection.
- Custom fields (editor, upload) would need adapters.
- It provides no error summary and no server error mapping.

```ts
import type { StandardSchemaV1 } from '@standard-schema/spec';
type In<S extends StandardSchemaV1> = StandardSchemaV1.InferInput<S>;
type Out<S extends StandardSchemaV1> = StandardSchemaV1.InferOutput<S>;
export type FieldErrors = Record<string, string[]>; // dot paths
export interface ServerFormError {
  fieldErrors?: FieldErrors;
  formError?: string;
}
export interface UseFormOptions<S extends StandardSchemaV1> {
  schema: S;
  initialValues: In<S>;
  validateOn?: { initial: 'blur' | 'submit'; afterError: 'change' };
  onSubmit(values: Out<S>, ctx: { signal: AbortSignal }): Promise<void> | void;
  mapServerError?(error: unknown): ServerFormError | null; // default reads FetchError.data.data
  announce?: { saving?: string; saved?: string } | false;
}
export interface UseFormReturn<S extends StandardSchemaV1> {
  id: string;
  values: Ref<In<S>>;
  errors: Readonly<Ref<FieldErrors>>;
  formError: Ref<string | null>;
  touched: Readonly<Ref<Set<string>>>;
  dirty: ComputedRef<boolean>;
  pending: Readonly<Ref<boolean>>;
  submitCount: Readonly<Ref<number>>;
  field(name: string): FieldBinding;
  handleSubmit(e?: Event): Promise<void>;
  validate(name?: string): Promise<boolean>;
  setErrors(e: ServerFormError): void;
  reset(values?: In<S>): void;
  rebase(name: string, normalized: unknown): void;
  focusFirstInvalid(): void;
}
export interface FieldBinding {
  id: string;
  name: string;
  modelValue: unknown;
  'onUpdate:modelValue': (v: unknown) => void;
  onBlur: () => void;
  invalid: boolean;
  'aria-invalid'?: 'true';
  'aria-describedby': string;
  'aria-required'?: 'true';
}
```

```pug
UiForm(:form="form", aria-labelledby="post-form-title")
  UiFormErrorSummary
  UiFormField(name="title", label="Title", required, v-slot="{ field }")
    UiInputText(v-bind="field")
  UiFormField(name="body", label="Body", hint="Markdown", v-slot="{ field }")
    UiRichTextEditor(v-bind="field")
  UiFormActions
    UiButton(type="submit", label="Save", :loading="form.pending.value")
```

- **UiForm** renders `<form novalidate :aria-busy>`.
- **UiFormField:**
  - the label is `for` the field id; hint `${id}-hint`; error `${id}-error`;
  - the error uses `--theme-error-ink-color`, the `circle-alert` icon and a visually hidden "Error:" prefix;
  - fields carry `data-field-name`.
- **Failed submit:** the summary lists links to each invalid field, `focusFirstInvalid()` runs, the announcer reads the error count, and fields switch to validating on change.
- **Pending:** the submit button shows `loading` and the form has `aria-busy`. Inputs stay enabled and resubmitting is ignored. The announcer says "Saving…" and then "Saved".
- **Unsaved changes:** `useUnsavedChangesGuard(form.dirty)` uses route-leave confirmation plus the browser's `beforeunload` warning.
- **Server errors:**
  - `packages/web-layer-admin/server/utils/validation-error.ts` throws a 422 with `{ fieldErrors, formError }`.
  - A 409 maps to `formError`.
  - The shared schema lives in `web-layer-admin/shared/blog-schema.ts`.

## 4. Data and CRUD

```ts
export interface CrudAdapter<T, Id, F, C = Partial<T>, U = Partial<T>> {
  getId(item: T): Id;
  list(p: {
    filter: F;
    offset: number;
    limit: number;
    sort?: SortState;
    signal: AbortSignal;
  }): Promise<{ items: T[]; total?: number }>;
  get?(id: Id): Promise<T>;
  create?(input: C): Promise<T>;
  update?(id: Id, patch: U): Promise<T>;
  remove?(id: Id): Promise<void>;
}
export interface SortState {
  field: string;
  order: 'asc' | 'desc';
}
export function usePagedList<T>(o: {
  fetchPage: (p: { offset: number; limit: number; signal: AbortSignal }) => Promise<{ items: T[]; total?: number }>;
  pageSize?: number;
  key: MaybeRefOrGetter<unknown>;
}): {
  items: Ref<T[]>;
  total: Ref<number | undefined>;
  loading: Ref<boolean>;
  error: Ref<unknown>;
  hasMore: ComputedRef<boolean>;
  loadMore(): Promise<void>;
  reset(): void;
};
export function useConfirmUndo<T, Id>(o: {
  getId(item: T): Id;
  describe(item: T): string;
  hide(item: T): void;
  restore(item: T): void;
  commit(item: T): Promise<void>;
  delayMs?: number;
}): {
  confirmingId: Ref<Id | null>;
  request(item: T): void;
  cancel(): void;
  confirm(item: T): void;
  undo(id: Id): void;
  pending: Ref<Array<{ item: T; deadline: number; paused: boolean }>>;
  pause(id: Id): void;
  resume(id: Id): void;
  flush(): Promise<void>;
};
export function useCrudResource<T, Id, F>(
  adapter: CrudAdapter<T, Id, F>,
  o: { filter: Ref<F>; pageSize?: number }
): ReturnType<typeof usePagedList<T>> & {
  save(id: Id | null, input: Partial<T>): Promise<T>;
  undoable: ReturnType<typeof useConfirmUndo<T, Id>>;
  selected: Ref<T | null>;
};
export function useRouteQueryState<S extends object>(
  codec: { keys: readonly string[]; read(q: LocationQuery, d: S): S; write(s: S, d: S): LocationQuery },
  defaults: S
): ToRefs<S> & { filtered: ComputedRef<boolean>; clear(): void };
// useBrowseQuery becomes useRouteQueryState(browseCodec, defaults), keeping the same behaviour
```

- **Load more:** announces "Loaded 24 more, 72 of 120"; focus stays on the button.
- **Undo window:** the 8-second window pauses while Undo is hovered or focused (WCAG 2.2.1).
  - Before swapping, check the current commit-on-leave versus cancel-on-leave behaviour in the media page and `AppStyleStudio`.
- **UiConfirmInline:** "Delete X? [Delete] [Cancel]" in place. Focus goes to Cancel, and Escape cancels.
- **UiUndoNotice:** a polite status line, "Deleted X. [Undo]".

**UiDataTable** wraps PrimeVue DataTable and Column:

```ts
export interface UiDataTableColumn<T> {
  field: string;
  header: string;
  sortable?: boolean;
  align?: 'start' | 'end';
  format?(value: unknown, row: T): string;
  priority?: 1 | 2 | 3;
  headerHidden?: boolean;
}
export interface UiDataTableProps<T> {
  rows: T[];
  columns: UiDataTableColumn<T>[];
  rowKey: string | ((r: T) => string);
  caption: string;
  captionHidden?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  selectionMode?: 'single' | 'multiple';
  paginator?: { rows: number; totalRecords?: number } | false;
  lazy?: boolean;
}
// v-model:sort / selection / page; emits rowActivate; slots cell-<field>, actions, empty, toolbar
```

- **Responsive:** a container query switches to stacked rows below about 32em. Otherwise the table sits in a scroll region (`role="region"`, `tabindex="0"`, `aria-label`).
- **Sorting:** `aria-sort`, plus a polite "Sorted by …" announcement.
- **PrimeVue includes:** add DataTable, Column, ColumnGroup, Row, Paginator, Chart, Drawer and Toolbar to the components list in `tgmcPrimeVueConfig()`.

**UiChart** wraps PrimeVue Chart (Chart.js):

```ts
export type ChartTone = 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
export interface UiChartProps {
  type: 'bar' | 'line' | 'pie' | 'doughnut';
  title: string;
  summary: string;
  labels: string[];
  series: Array<{ label: string; data: number[]; tone?: ChartTone }>;
  valueFormat?(n: number): string;
  table?: 'toggle' | 'visible';
  height?: string;
}
```

- **Colours:** `useChartTheme()` maps tones to `--theme-<tone>-color`, text to `--theme-text-color` and grid lines to `--theme-border-color`.
  - Values are read with `getComputedStyle` and normalized through a 1×1 canvas, because they can be `color-mix()`.
  - Colours are re-resolved on theme or mode change (a MutationObserver on `<html>` plus `prefers-color-scheme`).
  - There are no colour literals in code.
- **Accessibility:**
  - The canvas gets `role="img"` and an `aria-label` of title plus summary.
  - A "Show data table" disclosure (`aria-expanded`) renders UiDataTable in native mode.
  - Series are told apart by point style or dash pattern, not colour alone.
  - Animation is off under reduced motion.
  - Tick font size is at least `--type-min`.
- **SSR:** `<ClientOnly>`, with the table as the fallback.

**UiCrudView:**

```ts
export interface UiCrudViewProps<T, Id, F> {
  resource: ReturnType<typeof useCrudResource<T, Id, F>>;
  title: string;
  columns: UiDataTableColumn<T>[];
  itemLabel(row: T): string;
  filters?: Array<{
    key: keyof F & string;
    label: string;
    type: 'chips' | 'select' | 'search';
    options?: { value: string; label: string }[];
  }>;
  editor?: 'drawer' | 'page';
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}
// v-model:view ('table'|'grid'); slots toolbar, summary (UiChart), cell-<field>, grid-item, editor({ item, close }), empty
```

- **Layout order:**
  1. Header (title and Create).
  2. Filter bar (chips with `aria-pressed`, synced to the route query).
  3. Status line ("Showing 24 of 120").
  4. Table or grid.
  5. Load more.
  6. UiDrawer editor.
  7. Undo region.
- **UiDrawer:** built on native `<dialog>` with `showModal()` (built-in inert background and focus containment), plus `useFocusTrap` as a safety net.
  - It could retire both `inertOutside` copies; check this against why the custom trap exists.

## 5. UiRichTextEditor (Tiptap v3)

```ts
export interface UiRichTextEditorProps {
  modelValue?: string;
  id?: string;
  label?: string;
  ariaDescribedby?: string;
  invalid?: boolean;
  placeholder?: string;
  maxLength?: number;
  headingLevels?: Array<2 | 3 | 4>;
  sourceToggle?: boolean;
}
// emits update:modelValue(md), normalized(md) → form.rebase, blur; expose focus()
```

- **Extensions:**
  - `StarterKit`, with no Tab binding.
  - `Link`, limited to http, https and mailto, with `isAllowedUri`.
  - `Placeholder` and `CharacterCount` (from `@tiptap/extensions`).
  - `@tiptap/markdown` (verify the version, or fall back to `tiptap-markdown`).
  - Images and tables are phase 2.
- **Markdown in and out:**
  - Load with `setContent(md, { contentType: 'markdown' })`; read back with `getMarkdown()`.
  - Debounce updates by 150ms and flush on blur.
  - Skip `setContent` when the incoming value equals the last emitted one.
  - Emit `normalized` after the first load.
- **Sanitisation:**
  - The schema drops unknown nodes and raw HTML is off.
  - Pasted HTML is stripped (`transformPastedHTML`).
  - `app/utils/markdown-policy.ts` lists the allowed nodes, marks and protocols; a test asserts parity with the `sanitize-html` render config.
  - The server keeps sanitising at render time and enforces a maximum length.
- **SSR:** Tiptap is loaded with `await import('./create-editor')` in `onMounted`, inside `<ClientOnly>`. The `#fallback` is a `UiTextarea`, which also serves no-JS and source mode.
- **Toolbar accessibility:**
  - `role="toolbar"`, `aria-label="Formatting"` and `aria-controls`.
  - Roving tabindex with Left/Right/Home/End.
  - Toggle buttons carry `aria-pressed` and `aria-keyshortcuts`.
  - The heading picker is a `UiSelect`.
  - Links are added through a small dialog form, never `window.prompt`.
  - Buttons are at least 44px and the toolbar wraps at 375px.
- **Content area:**
  - `role="textbox"`, `aria-multiline`, `aria-labelledby`, `aria-describedby` and `aria-invalid`.
  - The focus ring sits on the wrapper's `:focus-within`.
  - Tab always leaves the editor. List indent uses a toolbar button and `Ctrl+]` / `Ctrl+[`.
  - The character count is announced at 90% and 100%.
- **Icons:** bold, italic, strikethrough, code, square-code, list, list-ordered, quote, link, unlink, minus, undo-2, redo-2, indent-increase, indent-decrease, circle-alert.

## 6. UiMultiUpload

```ts
export type UploadStatus =
  'queued' | 'uploading' | 'processing' | 'done' | 'error' | 'canceled' | 'conflict' | 'rejected';
export interface UploadItem<R = unknown> {
  id: string;
  file: File;
  name: string;
  status: UploadStatus;
  progress: number | null;
  error?: string;
  conflict?: { suggestedName: string | null; message: string };
  result?: R;
  attempts: number;
}
export class UploadConflictError extends Error {
  constructor(
    readonly suggestedName: string | null,
    msg: string
  ) {
    super(msg);
  }
}
export interface UploaderAdapter<R> {
  readonly reportsProgress: boolean;
  readonly maxBytes?: number;
  upload(
    file: File,
    ctx: { name: string; signal: AbortSignal; onProgress(loaded: number, total: number): void }
  ): Promise<R>;
}
export interface UploadRules {
  accept?: string[];
  maxBytes?: number;
  maxFiles?: number;
  allowEmpty?: boolean;
}
export type ConflictDecision = { action: 'rename'; name: string } | { action: 'skip' };
export function useUploadQueue<R>(o: {
  adapter: UploaderAdapter<R>;
  rules?: UploadRules;
  concurrency?: number;
  onConflict?(item: UploadItem<R>): Promise<ConflictDecision>;
}): {
  items: Ref<UploadItem<R>[]>;
  add(files: FileList | File[]): void;
  cancel(id: string): void;
  cancelAll(): void;
  retry(id: string): void;
  retryFailed(): void;
  remove(id: string): void;
  active: ComputedRef<boolean>;
  summary: ComputedRef<{ done: number; failed: number; total: number }>;
};
```

- **Adapters** live in `packages/media-client/src/upload-adapters.ts`, behind a new browser-only `./browser` export.
  - `createBase64Uploader`: today's behaviour; FileReader progress, then `uploadBase64`. Concurrency 1, and a conservative `maxBytes`.
  - `createPresignedUploader`:
    1. `createPresign`; a 409 becomes `UploadConflictError`.
    2. An XHR PUT with the signed headers, using `upload.onprogress` and abort on the signal.
    3. `completeIngest`.

    It re-presigns once the URL has expired. **Prerequisite:** MinIO and S3 CORS must allow PUT from the admin origin.
- **Validation:** MIME type and extension, size, count, empty files and duplicates. Rejected files stay visible as rows with a reason.
- **Queue:** a scheduler fills free slots in order (default concurrency 2). Cancel works per row and for all; retry is per row or "Retry failed".
- **Conflict:** an inline row prompt, "Use <suggested>" / "Rename…" / "Skip". There is no replace option.
- **Input:**
  - The drop zone is a `<label>` for a visually hidden, focusable `<input type="file" multiple :accept>`.
  - Drag-and-drop is an enhancement only.
  - Targets are at least 44px, and long names use `overflow-wrap: anywhere`.
- **Status:**
  - Each row has a `<progress>` with a name, plus visible percentage text; row actions are named.
  - A global `role="status"` reads "Uploading N of M".
  - The announcer speaks only at start, completion or failure, and the end, never on progress ticks.
  - A `beforeunload` warning is active while uploads are running.
- **Emits:** `uploaded`, `complete`, `rejected`; optional `v-model:items`.

## 7. Duplicates to consolidate

- the two `inertOutside` copies and admin's `focus-trap`;
- the two delete+Undo state machines (media page, `AppStyleStudio`);
- `iconConfig` duplicated in both `nuxt.config.ts` files;
- three Sass `additionalData` functions;
- admin importing `../web/config-properties/primevue-prop`;
- the local `.sr-only` versus the theme's utility;
- ad-hoc live regions versus `UiAnnouncer`;
- `media-paging` versus `usePagedList`;
- `useBrowseQuery` versus `useRouteQueryState`.

## 8. Defects to fix in the `nuxt-layer-base` draft (Task 4)

1. `useA11yAnnouncer` uses module-level refs, which leak between SSR requests. Use `useState('tgmc:a11y:polite' | 'tgmc:a11y:assertive')`, run timers only on the client, and clear any pending timer.
2. `role="status"` combined with a dynamic `aria-live="assertive"` contradicts itself. Render two always-present regions, one `role="status"` and one `role="alert"`, mounted once with an instance guard.
3. UiSkipLink:
   - Its colour literals (`#ffffff`, `#111827`, `#0284c7`, `rgba(...)`) fail `colors-scss`.
   - `top: -9999px` fails the units policy.
   - `outline: none` plus a shadow-only focus state disappears in forced-colors mode.

   Fix: theme roles, the `focus-ring-shadow` mixin, `min-height: var(--touch-target)` and `transform: translateY(-120%)`. The target `<main id>` needs `tabindex="-1"`; check for an existing skip link in `layouts/site.vue`.

4. Templates aren't Pug. Use the theme's visually-hidden utility (check its name in `theme/core/scss/globals`).
5. The `../../theme/core` path works only inside the monorepo. Use `pkg:` or `createRequire`.
6. `additionalData` collides with the apps' own (the app's function wins), and it lacks the `node_modules` and `nuxt-auto` guards. Make the layer the single owner via `tgmcScssAdditionalData(extra)`.
7. `@nuxt/icon ^1.10.3` installs a nested v1. Align to `^2.5.1`, pin `@nuxt/a11y` to root's resolved version, set `nuxt ^4.5`, and add `@iconify-json/lucide`.
8. The icon config has no `clientBundle`. Move the list into `src/config/icons.ts` and retarget the test.
9. Auto-imports:
   - `imports.imports` doesn't cover server routes (that needs `nitro.imports`).
   - `imports.dirs: ['app/composables']` probably resolves to `app/app/composables` (verify); drop it.
   - Prefer explicit imports over generic names (`isObject`, `deepMerge`), and verify they exist in `@tgmc/utilities/universal`.
10. The head `meta` duplicates Nuxt's defaults; use `app.head.charset` / `viewport`. `htmlAttrs.lang` conflicts with `@nuxtjs/i18n`, so leave it to the app.
11. The a11y config fails on violations and writes its report in every environment, and `rules: []` does nothing. Scope it: `$development` for highlights and logging, `$test` for the report with fail-on-violation, `$production` disabled.
12. Missing plumbing: Nx targets, `tsconfig.json`, `eslint.config.js`, Prettier Pug config, `vitest.config.ts`, and a `nuxt prepare` step for types.
13. Name collisions: register under `app/components/a11y` with `pathPrefix: false` and check that no `Ui*` names are duplicated.
14. Announcer race: the 50ms clear-then-set loses back-to-back messages. Queue messages or use `{ id, text }`, and clear the timer on each call.
