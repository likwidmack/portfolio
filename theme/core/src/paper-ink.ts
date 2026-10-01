/**
 * Pen & paper: paper is the background and ink the foreground in every mode, one pair per mode.
 * The neutral scale runs paper (step 0) → ink (step 1000); roles pick a step per mode. These
 * tables mirror `globals/_root.scss` and `tokens/_colors.scss` (guarded by
 * `tests/five-input-colors.spec.ts`), so tools such as Style Studio can check a pair before it
 * is applied.
 */
import { contrast, mixOklab } from './color-mix.js';

export type PaperInkMode = 'light' | 'dark';
export type PaperInkPair = { paper: string; ink: string };

/** Default pairs: dark mode is light mode's pair inverted. */
export const DEFAULT_PAPER_INK: Record<PaperInkMode, PaperInkPair> = {
  light: { paper: '#faf6f3', ink: '#0f0908' },
  dark: { paper: '#0f0908', ink: '#faf6f3' },
};

/** Role → neutral step, per mode. */
export const NEUTRAL_ROLE_STEPS = {
  light: {
    '--main-background': 0,
    '--main-background-secondary': 50,
    '--surface-color': 50,
    '--surface-variant': 100,
    '--text-color': 950,
    '--text-secondary-color': 700,
    '--border-strong': 500,
  },
  dark: {
    '--main-background': 0,
    '--main-background-secondary': 50,
    '--surface-color': 50,
    '--surface-variant': 75,
    '--text-color': 975,
    '--text-secondary-color': 700,
    '--border-strong': 450,
  },
} as const satisfies Record<PaperInkMode, Record<string, number>>;

/** Alpha steps exposed as `--paper-a<N>` / `--ink-a<N>` (N % over transparent). */
export const PAPER_INK_ALPHA_STEPS = [4, 8, 12, 16, 24, 32, 48, 64, 80, 90] as const;

/** `--neutral-<step>` for a pair (0 = paper … 1000 = ink). */
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
  id: 'text' | 'text-secondary' | 'border-strong';
  label: string;
  ratio: number;
  min: number;
  pass: boolean;
};

/**
 * WCAG checks for a pair in a mode: body text and secondary text ≥ 4.5:1 on page, surface and
 * variant (worst case reported); control borders ≥ 3:1 on page and surface.
 */
export function checkPaperInk(pair: PaperInkPair, mode: PaperInkMode): PaperInkCheck[] {
  const steps = NEUTRAL_ROLE_STEPS[mode];
  const n = (step: number) => neutralStep(pair, step);
  const grounds = [steps['--main-background'], steps['--surface-color'], steps['--surface-variant']].map(n);
  const worst = (fg: string, on: string[]) => Math.min(...on.map((g) => contrast(fg, g)));
  const row = (id: PaperInkCheck['id'], label: string, ratio: number, min: number): PaperInkCheck => ({
    id,
    label,
    ratio: Math.round(ratio * 100) / 100,
    min,
    pass: ratio >= min,
  });
  return [
    row('text', 'Text', worst(n(steps['--text-color']), grounds), 4.5),
    row('text-secondary', 'Secondary text', worst(n(steps['--text-secondary-color']), grounds), 4.5),
    row('border-strong', 'Control borders', worst(n(steps['--border-strong']), grounds.slice(0, 2)), 3),
  ];
}

/** The other mode's pair when one pair drives both: the same colours, swapped. */
