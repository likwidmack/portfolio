/**
 * Shared PrimeVue Nuxt module options for `@tgmc/theme`.
 *
 * Default: **styled** PrimeVue with `themePrimeVuePreset` (Nora remapped onto
 * `@tgmc/theme` CSS variables) and cascade layer order matching theme SCSS.
 * Pass `unstyled: true` to skip Nora CSS and rely on `@layer primevue` Sass instead.
 */
import { definePreset } from '@primeuix/themes';
import Nora from '@primeuix/themes/nora';

/** Shade ladder from a single theme CSS color token (Nora severity primitives). */
function themeColorScale(token: string) {
  return {
    50: `color-mix(in srgb, ${token} 12%, white)`,
    100: `color-mix(in srgb, ${token} 22%, white)`,
    200: `color-mix(in srgb, ${token} 36%, white)`,
    300: `color-mix(in srgb, ${token} 52%, white)`,
    400: `color-mix(in srgb, ${token} 72%, white)`,
    500: token,
    600: `color-mix(in srgb, ${token} 88%, black)`,
    700: `color-mix(in srgb, ${token} 76%, black)`,
    800: `color-mix(in srgb, ${token} 64%, black)`,
    900: `color-mix(in srgb, ${token} 48%, black)`,
    950: `color-mix(in srgb, ${token} 28%, black)`,
  };
}

/** Shared semantic tokens for both light and dark — mode values live in CSS vars. */
const themeSemanticScheme = {
  primary: {
    color: 'var(--theme-primary-color)',
    contrastColor: 'var(--theme-button-fg-color)',
    hoverColor: 'var(--theme-primary-hover-color, var(--primary-default))',
    activeColor: 'var(--theme-accent-color, var(--tertiary-color))',
  },
  highlight: {
    background: 'color-mix(in srgb, var(--theme-primary-color) 18%, transparent)',
    focusBackground: 'color-mix(in srgb, var(--theme-primary-color) 28%, transparent)',
    color: 'var(--theme-primary-color)',
    focusColor: 'var(--theme-focus-ring-color, var(--theme-primary-color))',
  },
  mask: {
    background: 'color-mix(in srgb, var(--theme-main-background-color) 35%, black)',
    color: 'var(--theme-text-color)',
  },
  formField: {
    background: 'var(--theme-form-background-color)',
    disabledBackground: 'var(--theme-form-background-disabled-color)',
    filledBackground: 'var(--theme-form-background-color)',
    filledHoverBackground: 'color-mix(in srgb, var(--theme-form-background-color) 88%, var(--theme-primary-color))',
    filledFocusBackground: 'var(--theme-form-background-color)',
    borderColor: 'var(--theme-border-strong-color, var(--theme-border-strong-color))',
    hoverBorderColor: 'var(--theme-text-secondary-color)',
    focusBorderColor: 'var(--theme-focus-ring-color, var(--theme-focus-ring-color))',
    invalidBorderColor: 'var(--theme-form-invalid-color, var(--theme-error-hue-color))',
    color: 'var(--theme-text-color)',
    disabledColor: 'var(--theme-text-secondary-color)',
    placeholderColor: 'var(--theme-form-placeholder-color, var(--theme-text-secondary-color))',
    invalidPlaceholderColor: 'var(--theme-form-invalid-color, var(--theme-error-hue-color))',
    floatLabelColor: 'var(--theme-text-secondary-color)',
    floatLabelFocusColor: 'var(--theme-primary-color)',
    floatLabelActiveColor: 'var(--theme-text-secondary-color)',
    floatLabelInvalidColor: 'var(--theme-form-invalid-color, var(--theme-error-hue-color))',
    iconColor: 'var(--theme-text-color)',
    shadow: 'none',
  },
  text: {
    color: 'var(--theme-text-color)',
    hoverColor: 'var(--theme-text-color)',
    mutedColor: 'var(--theme-text-secondary-color)',
    hoverMutedColor: 'var(--theme-text-color)',
  },
  content: {
    background: 'var(--theme-surface-color)',
    hoverBackground: 'var(--theme-surface-variant-color)',
    borderColor: 'var(--theme-border-color)',
    color: 'var(--theme-text-color)',
    hoverColor: 'var(--theme-text-color)',
  },
  overlay: {
    select: {
      background: 'var(--theme-surface-color)',
      borderColor: 'var(--theme-border-color)',
      color: 'var(--theme-text-color)',
    },
    popover: {
      background: 'var(--theme-surface-color)',
      borderColor: 'var(--theme-border-color)',
      color: 'var(--theme-text-color)',
    },
    modal: {
      background: 'var(--theme-surface-color)',
      borderColor: 'var(--theme-border-color)',
      color: 'var(--theme-text-color)',
    },
  },
  list: {
    option: {
      focusBackground: 'color-mix(in srgb, var(--theme-primary-color) 14%, transparent)',
      selectedBackground: 'color-mix(in srgb, var(--theme-primary-color) 22%, transparent)',
      selectedFocusBackground: 'color-mix(in srgb, var(--theme-primary-color) 28%, transparent)',
      color: 'var(--theme-text-color)',
      focusColor: 'var(--theme-text-color)',
      selectedColor: 'var(--theme-primary-color)',
      selectedFocusColor: 'var(--theme-primary-color)',
      icon: {
        color: 'var(--theme-text-secondary-color)',
        focusColor: 'var(--theme-text-color)',
      },
    },
    optionGroup: {
      background: 'transparent',
      color: 'var(--theme-text-secondary-color)',
    },
  },
  navigation: {
    item: {
      focusBackground: 'color-mix(in srgb, var(--theme-primary-color) 16%, transparent)',
      activeBackground: 'var(--theme-surface-variant-color)',
      color: 'var(--theme-text-color)',
      focusColor: 'var(--theme-primary-color)',
      activeColor: 'var(--theme-text-color)',
      icon: {
        color: 'var(--theme-text-secondary-color)',
        focusColor: 'var(--theme-primary-color)',
        activeColor: 'var(--theme-text-color)',
      },
    },
    submenuLabel: {
      background: 'transparent',
      color: 'var(--theme-text-secondary-color)',
    },
    submenuIcon: {
      color: 'var(--theme-text-secondary-color)',
      focusColor: 'var(--theme-primary-color)',
      activeColor: 'var(--theme-text-color)',
    },
  },
} as const;

/** Light: high surfaces / dark ink via theme tokens. */
const themeSurfaceLight = {
  0: 'var(--theme-surface-color)',
  50: 'var(--theme-main-background-color)',
  100: 'var(--theme-surface-variant-color)',
  200: 'color-mix(in srgb, var(--theme-border-color) 75%, var(--theme-surface-color))',
  300: 'var(--theme-border-color)',
  400: 'color-mix(in srgb, var(--theme-text-secondary-color) 55%, var(--theme-border-color))',
  500: 'var(--theme-text-secondary-color)',
  600: 'color-mix(in srgb, var(--theme-text-color) 45%, var(--theme-text-secondary-color))',
  700: 'color-mix(in srgb, var(--theme-text-color) 72%, var(--theme-text-secondary-color))',
  800: 'var(--theme-text-color)',
  900: 'var(--theme-text-color)',
  950: 'color-mix(in srgb, var(--theme-text-color) 92%, black)',
} as const;

/** Dark: dark ground / light ink via theme tokens. */
const themeSurfaceDark = {
  0: 'var(--theme-surface-color)',
  50: 'color-mix(in srgb, var(--theme-surface-color) 92%, var(--theme-main-background-color))',
  100: 'var(--theme-surface-variant-color)',
  200: 'color-mix(in srgb, var(--theme-surface-variant-color) 80%, var(--theme-border-color))',
  300: 'var(--theme-border-color)',
  400: 'color-mix(in srgb, var(--theme-border-color) 70%, var(--theme-text-secondary-color))',
  500: 'var(--theme-text-secondary-color)',
  600: 'color-mix(in srgb, var(--theme-text-secondary-color) 70%, var(--theme-text-color))',
  700: 'color-mix(in srgb, var(--theme-text-color) 75%, var(--theme-text-secondary-color))',
  800: 'var(--theme-text-color)',
  900: 'var(--theme-text-color)',
  950: 'color-mix(in srgb, var(--theme-text-color) 90%, white)',
} as const;

/**
 * Our overrides on Nora: every colour reads a `--theme-…-color` (or palette) name. PrimeVue's own
 * `--p-*` variables are generated from these (R-T7c). Guarded by `tests/bridge-colors.spec.ts`.
 */
export const themePrimeVuePresetOverrides = {
  primitive: {
    // Severity primitives → theme status tokens (Button/Tag/Message/Badge).
    green: themeColorScale('var(--theme-success-hue-color)'),
    red: themeColorScale('var(--theme-error-hue-color)'),
    orange: themeColorScale('var(--theme-warning-hue-color)'),
    yellow: themeColorScale('var(--theme-warning-hue-color)'),
    sky: themeColorScale('var(--theme-info-hue-color)'),
    blue: themeColorScale('var(--theme-info-hue-color)'),
  },
  semantic: {
    focusRing: {
      width: '2px',
      style: 'solid',
      color: 'var(--theme-focus-ring-color)',
      offset: '2px',
      shadow: 'none',
    },
    formField: {
      borderRadius: 'var(--form-radius, var(--border-radius-sm, 0.375rem))',
      focusRing: {
        width: '2px',
        style: 'solid',
        color: 'var(--theme-focus-ring-color, var(--theme-focus-ring-color))',
        offset: '-1px',
        shadow: 'none',
      },
    },
    colorScheme: {
      light: {
        surface: themeSurfaceLight,
        ...themeSemanticScheme,
      },
      dark: {
        surface: themeSurfaceDark,
        ...themeSemanticScheme,
      },
    },
  },
  components: {
    button: {
      root: {
        borderRadius: 'var(--button-radius, var(--border-radius-sm))',
        // No pill/full-round buttons — keep rounded variant on the small radius.
        roundedBorderRadius: 'var(--button-radius, var(--border-radius-sm))',
      },
    },
    // Nora defaults badge/progress labels to 0.625rem (10px) — below --type-min.
    // Floor here so styled-mode CSS vars never ship under-readable chrome.
    badge: {
      root: {
        fontSize: 'max(var(--type-min, 12px), 0.75rem)',
      },
      sm: {
        fontSize: 'max(var(--type-min, 12px), 0.75rem)',
      },
    },
    progressbar: {
      label: {
        fontSize: 'max(var(--type-min, 12px), 0.75rem)',
      },
    },
    tag: {
      root: {
        fontSize: 'max(var(--type-min, 12px), 0.75rem)',
      },
    },
  },
};

/** Nora preset remapped onto `@tgmc/theme` CSS variables. */
export const themePrimeVuePreset = definePreset(Nora, themePrimeVuePresetOverrides);

/** Matches `@tgmc/theme` SCSS cascade: `@layer normalize, foundation, primevue, theme`. */
export const themePrimeVueCssLayerOrder = 'normalize, foundation, primevue, theme';

/** Default cssLayer options for styled-mode theme injection. */
export const themePrimeVueCssLayer = {
  name: 'primevue',
  order: themePrimeVueCssLayerOrder,
} as const;

export type ThemePrimeVueNuxtOptions = {
  /** Component names to register (PrimeVue `include` list). */
  components?: string[];
  /** Directive names to register. */
  directives?: string[];
  inputVariant?: 'outlined' | 'filled';
  ripple?: boolean;
  darkModeSelector?: string | 'system' | 'none';
  /**
   * When false (default), enable Nora styled-mode CSS via `themePrimeVuePreset`.
   * When true, skip Nora CSS and rely on theme `@layer primevue` Sass + classic PT.
   */
  unstyled?: boolean;
  /**
   * Styled-mode only: wrap injected PrimeVue CSS in a cascade layer.
   * Defaults to `themePrimeVueCssLayer`.
   * Do not set module-level `cssLayerOrder` when unstyled — theme SCSS already
   * declares `@layer normalize, foundation, primevue, theme`.
   */
  cssLayer?: boolean | { name?: string; order?: string };
  /** Override the styled-mode preset (defaults to `themePrimeVuePreset`). */
  preset?: unknown;
  prefix?: string;
  componentPrefix?: string;
};

const DEFAULT_COMPONENTS = [
  'Accordion',
  'AccordionContent',
  'AccordionHeader',
  'AccordionPanel',
  'Avatar',
  'Badge',
  'Button',
  'Card',
  'Checkbox',
  'Chip',
  'DatePicker',
  'Dialog',
  'Divider',
  'FloatLabel',
  'InputNumber',
  'InputText',
  'Message',
  'Panel',
  'Password',
  'ProgressBar',
  'ProgressSpinner',
  'RadioButton',
  'Select',
  'Skeleton',
  'Tab',
  'TabList',
  'TabPanel',
  'TabPanels',
  'Tabs',
  'Tag',
  'Textarea',
  'Timeline',
  'Toast',
  'ToggleSwitch',
] as const;

/**
 * Returns `@primevue/nuxt-module` configuration.
 * Default path: styled Nora + `themePrimeVuePreset` + cssLayer.
 */
export function createPrimeVueNuxtConfig(options: ThemePrimeVueNuxtOptions = {}) {
  const {
    components = [...DEFAULT_COMPONENTS],
    directives = [],
    inputVariant = 'filled',
    ripple = false,
    darkModeSelector = '.p-dark',
    unstyled = false,
    cssLayer = { ...themePrimeVueCssLayer },
    preset = themePrimeVuePreset,
    prefix = 'p',
    componentPrefix = 'Prime',
  } = options;

  const primeOptions: Record<string, unknown> = {
    unstyled,
    inputVariant,
    ripple,
  };

  if (!unstyled) {
    primeOptions.theme = {
      preset,
      options: {
        prefix,
        darkModeSelector,
        cssLayer,
      },
    };
  }

  return {
    autoImport: true,
    components: {
      prefix: componentPrefix,
      include: Array.from(new Set([...DEFAULT_COMPONENTS, ...components])),
      exclude: [],
    },
    directives: {
      include: directives,
    },
    options: primeOptions,
    usePrimeVue: true,
  };
}

/** Default Nuxt PrimeVue module config for TGMC apps (styled + theme preset). */
export const primevueNuxtConfig = createPrimeVueNuxtConfig();
