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
    color: 'var(--primary-color)',
    contrastColor: 'var(--button-fg)',
    hoverColor: 'var(--primary-hover, var(--primary-default))',
    activeColor: 'var(--accent-color, var(--tertiary-color))',
  },
  highlight: {
    background: 'color-mix(in srgb, var(--primary-color) 18%, transparent)',
    focusBackground: 'color-mix(in srgb, var(--primary-color) 28%, transparent)',
    color: 'var(--primary-color)',
    focusColor: 'var(--focus-ring, var(--primary-color))',
  },
  mask: {
    background: 'color-mix(in srgb, var(--main-background) 35%, black)',
    color: 'var(--text-color)',
  },
  formField: {
    background: 'var(--form-background)',
    disabledBackground: 'var(--form-background-disabled)',
    filledBackground: 'var(--form-background)',
    filledHoverBackground: 'color-mix(in srgb, var(--form-background) 88%, var(--primary-color))',
    filledFocusBackground: 'var(--form-background)',
    borderColor: 'var(--form-border-color)',
    hoverBorderColor: 'color-mix(in srgb, var(--form-border-color) 70%, var(--primary-color))',
    focusBorderColor: 'var(--form-focus-ring, var(--focus-ring))',
    invalidBorderColor: 'var(--form-invalid-color, var(--error))',
    color: 'var(--text-color)',
    disabledColor: 'var(--text-secondary-color)',
    placeholderColor: 'var(--form-placeholder, var(--text-secondary-color))',
    invalidPlaceholderColor: 'var(--form-invalid-color, var(--error))',
    floatLabelColor: 'var(--text-secondary-color)',
    floatLabelFocusColor: 'var(--primary-color)',
    floatLabelActiveColor: 'var(--text-secondary-color)',
    floatLabelInvalidColor: 'var(--form-invalid-color, var(--error))',
    iconColor: 'var(--text-color)',
    shadow: 'none',
  },
  text: {
    color: 'var(--text-color)',
    hoverColor: 'var(--text-color)',
    mutedColor: 'var(--text-secondary-color)',
    hoverMutedColor: 'var(--text-color)',
  },
  content: {
    background: 'var(--surface-color)',
    hoverBackground: 'var(--surface-variant)',
    borderColor: 'var(--border-color)',
    color: 'var(--text-color)',
    hoverColor: 'var(--text-color)',
  },
  overlay: {
    select: {
      background: 'var(--surface-color)',
      borderColor: 'var(--border-color)',
      color: 'var(--text-color)',
    },
    popover: {
      background: 'var(--surface-color)',
      borderColor: 'var(--border-color)',
      color: 'var(--text-color)',
    },
    modal: {
      background: 'var(--surface-color)',
      borderColor: 'var(--border-color)',
      color: 'var(--text-color)',
    },
  },
  list: {
    option: {
      focusBackground: 'color-mix(in srgb, var(--primary-color) 14%, transparent)',
      selectedBackground: 'color-mix(in srgb, var(--primary-color) 22%, transparent)',
      selectedFocusBackground: 'color-mix(in srgb, var(--primary-color) 28%, transparent)',
      color: 'var(--text-color)',
      focusColor: 'var(--text-color)',
      selectedColor: 'var(--primary-color)',
      selectedFocusColor: 'var(--primary-color)',
      icon: {
        color: 'var(--text-secondary-color)',
        focusColor: 'var(--text-color)',
      },
    },
    optionGroup: {
      background: 'transparent',
      color: 'var(--text-secondary-color)',
    },
  },
  navigation: {
    item: {
      focusBackground: 'color-mix(in srgb, var(--primary-color) 16%, transparent)',
      activeBackground: 'var(--surface-variant)',
      color: 'var(--text-color)',
      focusColor: 'var(--primary-color)',
      activeColor: 'var(--text-color)',
      icon: {
        color: 'var(--text-secondary-color)',
        focusColor: 'var(--primary-color)',
        activeColor: 'var(--text-color)',
      },
    },
    submenuLabel: {
      background: 'transparent',
      color: 'var(--text-secondary-color)',
    },
    submenuIcon: {
      color: 'var(--text-secondary-color)',
      focusColor: 'var(--primary-color)',
      activeColor: 'var(--text-color)',
    },
  },
} as const;

/** Light: high surfaces / dark ink via theme tokens. */
const themeSurfaceLight = {
  0: 'var(--surface-color)',
  50: 'var(--main-background)',
  100: 'var(--surface-variant)',
  200: 'color-mix(in srgb, var(--border-color) 75%, var(--surface-color))',
  300: 'var(--border-color)',
  400: 'color-mix(in srgb, var(--text-secondary-color) 55%, var(--border-color))',
  500: 'var(--text-secondary-color)',
  600: 'color-mix(in srgb, var(--text-color) 45%, var(--text-secondary-color))',
  700: 'color-mix(in srgb, var(--text-color) 72%, var(--text-secondary-color))',
  800: 'var(--text-color)',
  900: 'var(--text-color)',
  950: 'color-mix(in srgb, var(--text-color) 92%, black)',
} as const;

/** Dark: dark ground / light ink via theme tokens. */
const themeSurfaceDark = {
  0: 'var(--surface-color)',
  50: 'color-mix(in srgb, var(--surface-color) 92%, var(--main-background))',
  100: 'var(--surface-variant)',
  200: 'color-mix(in srgb, var(--surface-variant) 80%, var(--border-color))',
  300: 'var(--border-color)',
  400: 'color-mix(in srgb, var(--border-color) 70%, var(--text-secondary-color))',
  500: 'var(--text-secondary-color)',
  600: 'color-mix(in srgb, var(--text-secondary-color) 70%, var(--text-color))',
  700: 'color-mix(in srgb, var(--text-color) 75%, var(--text-secondary-color))',
  800: 'var(--text-color)',
  900: 'var(--text-color)',
  950: 'color-mix(in srgb, var(--text-color) 90%, white)',
} as const;

/** Nora preset remapped onto `@tgmc/theme` CSS variables. */
export const themePrimeVuePreset = definePreset(Nora, {
  primitive: {
    // Severity primitives → theme status tokens (Button/Tag/Message/Badge).
    green: themeColorScale('var(--success)'),
    red: themeColorScale('var(--error)'),
    orange: themeColorScale('var(--warning)'),
    yellow: themeColorScale('var(--warning)'),
    sky: themeColorScale('var(--info)'),
    blue: themeColorScale('var(--info)'),
  },
  semantic: {
    focusRing: {
      width: '2px',
      style: 'solid',
      color: 'var(--focus-ring)',
      offset: '2px',
      shadow: 'none',
    },
    formField: {
      borderRadius: 'var(--form-radius, var(--border-radius-sm, 0.375rem))',
      focusRing: {
        width: '2px',
        style: 'solid',
        color: 'var(--form-focus-ring, var(--focus-ring))',
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
});

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
