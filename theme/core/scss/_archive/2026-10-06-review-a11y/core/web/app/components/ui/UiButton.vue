<style lang="scss" scoped>
// Thin polish only — fill/severity colors come from Nora preset + `_primevue-union`.
.p-button {
  border-radius: var(--button-radius, 2px);
  font-family: var(--font-family-mono);
  // `max()` floors, not just rem: the theme halves --font-size-default at tablet/mobile
  // widths (site-wide fluid type), which otherwise shrinks this rem-based label and
  // padding down to an ~8.6px / ~24px-tall button — readable on desktop, illegible
  // and barely tappable everywhere else.
  font-size: max(0.75rem, 12px);
  min-height: var(--touch-target, 44px); // touch target (WCAG 2.5.5 / repo UI rule)
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  box-shadow: var(--button-shadow);
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    background-color 220ms ease,
    border-color 180ms ease,
    color 180ms ease,
    filter 180ms ease;

  &[href] {
    text-decoration: none;
    color: var(--theme-text-secondary-color, var(--theme-button-fg-color));

    &:hover,
    &:focus,
    &:active {
      text-decoration: none;
    }
  }

  &:focus-visible,
  &:focus {
    box-shadow:
      0 0 0 3px var(--theme-focus-ring-color),
      var(--button-shadow-hover, var(--button-shadow));
  }

  // Filled status buttons take the theme's status text (the mode paper), not the primary ink.
  &:not([disabled]):not(.p-button-text):not(.p-button-link):not(.p-button-outlined):not(.p-button-success):not(
      .p-button-warn
    ):not(.p-button-warning):not(.p-button-danger):not(.p-button-info) {
    color: var(--theme-button-secondary-fg-color, var(--theme-button-fg-color));
  }

  // Outlined status buttons keep the theme's status ink / hue (`pv-outline-tone`); the rest hover in
  // the primary ink (≥ 4.5:1 on the theme's hover wash) — not a palette mix that is not checked.
  &.p-button-outlined:not(.p-button-success):not(.p-button-warn):not(.p-button-warning):not(.p-button-danger):not(
      .p-button-info
    ) {
    text-shadow: 1px -1px 1px color-mix(in srgb, var(--theme-text-color) 76%, transparent);

    &:hover,
    &:focus-visible {
      border-color: var(--portfolio-rose-color, var(--theme-primary-color));
      color: var(--theme-primary-ink-color);
    }
  }

  &.p-button-text {
    text-shadow: 1px -1px 1px color-mix(in srgb, var(--theme-primary-inverted-color) 52%, transparent);
    box-shadow: none;
  }
}
</style>
