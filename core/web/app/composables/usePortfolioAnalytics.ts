type PortfolioEvent =
  | 'contact_click'
  | 'deck_download'
  | 'lab_approval'
  | 'lab_complete'
  | 'lab_start'
  | 'resume_download'
  | 'theme_changed'
  | 'work_view';

type SafeEventProperties = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (command: 'event', name: string, properties?: SafeEventProperties) => void;
  }
}

/** Analytics adapter with a deliberately small event surface. Raw AI input is never accepted. */
export function usePortfolioAnalytics() {
  const track = (event: PortfolioEvent, properties: SafeEventProperties = {}) => {
    if (!import.meta.client) return;
    window.gtag?.('event', event, properties);
    window.dispatchEvent(new CustomEvent('tgmc:analytics', { detail: { event, properties } }));
  };

  return { track };
}
