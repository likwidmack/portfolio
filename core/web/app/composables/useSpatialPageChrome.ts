import type { ThemeModePreference } from '@tgmc/theme/tokens';

export type SpatialPageId = 'home' | 'work' | 'gallery';

export interface SpatialPageChromeOptions {
  /**
   * Work and Gallery only ship a dark spatial design (see the Claude Design
   * handoff) — force the real theme-mode system to `dark` while mounted so
   * every themed component (PrimeVue dialogs, gallery code/viz exhibits, the
   * shared nav/footer, …) picks up dark tokens too, not just the hand-styled
   * spatial classes. Restores whatever preference was active beforehand on
   * unmount. Home follows the site's actual toggle instead, so it omits this.
   */
  forceDark?: boolean;
}

/**
 * Marks `<html data-spatial-page>` while a spatial-redesign page (Home / Work /
 * Gallery) is mounted, so `assets/css/portfolio-spatial-chrome.scss` can blend the
 * shared nav/footer into the dark (or, on Home, theme-aware) ground. Cleared on
 * unmount so other routes keep the default chrome.
 */
export function useSpatialPageChrome(page: SpatialPageId, options: SpatialPageChromeOptions = {}): void {
  let previousMode: ThemeModePreference | undefined;

  onMounted(() => {
    if (!import.meta.client) return;
    document.documentElement.dataset.spatialPage = page;
    if (options.forceDark) {
      const theme = useThemeTokens();
      previousMode = theme.getThemeMode();
      theme.setThemeMode('dark');
    }
  });
  onBeforeUnmount(() => {
    if (!import.meta.client) return;
    delete document.documentElement.dataset.spatialPage;
    if (options.forceDark && previousMode) {
      useThemeTokens().setThemeMode(previousMode);
    }
  });
}
