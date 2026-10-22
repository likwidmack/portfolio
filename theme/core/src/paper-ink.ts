/**
 * Pen & paper: paper is the background and ink the foreground in every mode, one pair per mode.
 * The neutral scale runs paper (step 0) → ink (step 1000); roles pick a step per mode. These
 * tables mirror `globals/_root.scss` and `tokens/_colors.scss` (guarded by
 * `tests/five-input-colors.spec.ts`), so tools such as Style Studio can check a pair before it
 * is applied.
 */
import { contrast, mixOklab } from './color-mix.js';
// Import cycle (color-variations → color → paper-ink → color-variations) is safe: neither module
// reads the other's bindings at load time, only inside functions.
import { buildStatusInkTokens, DEFAULT_COLOR_SOURCES, STATUS_COLORS, type StatusColor } from './color-variations.js';

export type PaperInkMode = 'light' | 'dark';
export type PaperInkPair = { paper: string; ink: string };

/** Default pairs: dark mode is light mode's pair inverted. */
export const DEFAULT_PAPER_INK: Record<PaperInkMode, PaperInkPair> = {
  light: { paper: '#faf6f3', ink: '#0f0908' },
  dark: { paper: '#0f0908', ink: '#faf6f3' },
};

/** Role (its `--theme-…-color` name) → neutral step, per mode. */
export const NEUTRAL_ROLE_STEPS = {
  light: {
    '--theme-main-background-color': 0,
    '--theme-main-background-secondary-color': 50,
    '--theme-surface-color': 50,
    '--theme-surface-variant-color': 100,
    '--theme-text-color': 950,
    '--theme-text-secondary-color': 700,
    '--theme-border-strong-color': 500,
  },
  dark: {
    '--theme-main-background-color': 0,
    '--theme-main-background-secondary-color': 50,
    '--theme-surface-color': 50,
    '--theme-surface-variant-color': 75,
    '--theme-text-color': 975,
    '--theme-text-secondary-color': 700,
    '--theme-border-strong-color': 450,
  },
} as const satisfies Record<PaperInkMode, Record<string, number>>;

/** Alpha steps exposed as `--theme-paper-a<N>-color` / `--theme-ink-a<N>-color` (N % over transparent). */
export const PAPER_INK_ALPHA_STEPS = [4, 8, 12, 16, 24, 32, 48, 64, 80, 90] as const;

/** `--theme-neutral-<step>-color` for a pair (0 = paper … 1000 = ink). */
export function neutralStep({ paper, ink }: PaperInkPair, step: number): string {
  if (step <= 0) return paper.toLowerCase();
  if (step >= 1000) return ink.toLowerCase();
  return mixOklab(ink, step / 10, paper);
}

/** The other mode's pair when one pair drives both: the same colours, swapped. */
export function invertPaperInk({ paper, ink }: PaperInkPair): PaperInkPair {
  return { paper: ink, ink: paper };
}

export type PaperInkCheck = {
  id: 'text' | 'text-secondary' | 'border-strong' | `${StatusColor}-ink`;
  label: string;
  ratio: number;
  min: number;
  pass: boolean;
};

const STATUS_LABEL: Record<StatusColor, string> = {
  success: 'Success text',
  warning: 'Warning text',
  error: 'Error text',
  info: 'Info text',
};

/**
 * WCAG checks for a pair in a mode: body text and secondary text ≥ 4.5:1 on page, surface and
 * variant (worst case reported); control borders ≥ 3:1 on page and surface; and each status ink
 * (`--theme-<status>-ink-color`, as the runtime computes it for this pair from the default status
 * sources — `buildStatusInkTokens`) ≥ 4.5:1 on page, surface and variant. The status rows only fail
 * when the pair leaves no lightness at which the status hue reads.
 */
export function checkPaperInk(pair: PaperInkPair, mode: PaperInkMode): PaperInkCheck[] {
  const steps = NEUTRAL_ROLE_STEPS[mode];
  const n = (step: number) => neutralStep(pair, step);
  const grounds = [
    steps['--theme-main-background-color'],
    steps['--theme-surface-color'],
    steps['--theme-surface-variant-color'],
  ].map(n);
  const worst = (fg: string, on: string[]) => Math.min(...on.map((g) => contrast(fg, g)));
  const row = (id: PaperInkCheck['id'], label: string, ratio: number, min: number): PaperInkCheck => ({
    id,
    label,
    ratio: Math.round(ratio * 100) / 100,
    min,
    pass: ratio >= min,
  });
  return [
    row('text', 'Text', worst(n(steps['--theme-text-color']), grounds), 4.5),
    row('text-secondary', 'Secondary text', worst(n(steps['--theme-text-secondary-color']), grounds), 4.5),
    row('border-strong', 'Control borders', worst(n(steps['--theme-border-strong-color']), grounds.slice(0, 2)), 3),
    ...statusRows(pair, mode, grounds, worst, row),
  ];
}

function statusRows(
  pair: PaperInkPair,
  mode: PaperInkMode,
  grounds: string[],
  worst: (fg: string, on: string[]) => number,
  row: (id: PaperInkCheck['id'], label: string, ratio: number, min: number) => PaperInkCheck
): PaperInkCheck[] {
  const inks = buildStatusInkTokens(DEFAULT_COLOR_SOURCES, { light: pair, dark: pair });
  return STATUS_COLORS.map((s) =>
    row(`${s}-ink`, STATUS_LABEL[s], worst(inks[`--theme-${s}-ink-${mode}-color`]!, grounds), 4.5)
  );
}
