import {
  JOURNEY_COOKIE_MAX_AGE,
  JOURNEY_PATH_COOKIE,
  JOURNEY_SKIP_COOKIE,
  parseSkipFlag,
  previousViewIfValid,
  previousViewTitle,
  writeJourneyPreviousView,
  writeJourneySkip,
  type JourneyStorageWriter,
} from '#shared/journey-preference';

/**
 * Load the cookie driver only on the client. A static `@tgmc/utilities/browser`
 * import here would pull that entry into the Nitro graph via AppPrimaryNav/AppSplash.
 */
async function clientJourneyStorage(): Promise<JourneyStorageWriter | null> {
  if (!import.meta.client) return null;
  const { default: storage } = await import('../../services/storage/storage-service');
  return storage;
}

const journeyCookieOptions = {
  path: '/',
  maxAge: JOURNEY_COOKIE_MAX_AGE,
  sameSite: 'lax' as const,
};

function probeCookiesWritable(): boolean {
  if (!import.meta.client) return true;
  try {
    const key = 'tgmc-journey-probe';
    document.cookie = `${key}=1; path=/; max-age=60; SameSite=Lax`;
    const ok = document.cookie.split(';').some((part) => part.trim().startsWith(`${key}=`));
    document.cookie = `${key}=; path=/; max-age=0`;
    return ok;
  } catch {
    return false;
  }
}

export function useJourneyPreference() {
  const skipCookie = useCookie(JOURNEY_SKIP_COOKIE, journeyCookieOptions);
  const pathCookie = useCookie(JOURNEY_PATH_COOKIE, journeyCookieOptions);
  const cookiesReadable = ref(true);

  const skip = computed({
    get: () => parseSkipFlag(skipCookie.value),
    set: (value: boolean) => {
      skipCookie.value = value ? '1' : '0';
      void clientJourneyStorage().then((storage) => {
        if (storage) return writeJourneySkip(storage, value);
        return undefined;
      });
    },
  });

  const previousPath = computed(() => previousViewIfValid(pathCookie.value ?? null));
  const previousTitle = computed(() => (previousPath.value ? previousViewTitle(previousPath.value) : null));

  const rememberCurrentView = (fullPath: string) => {
    const canonical = previousViewIfValid(fullPath);
    if (!canonical) return;
    pathCookie.value = canonical;
    void clientJourneyStorage().then((storage) => {
      if (storage) return writeJourneyPreviousView(storage, canonical);
      return undefined;
    });
  };

  if (getCurrentInstance()) {
    onMounted(() => {
      cookiesReadable.value = probeCookiesWritable();
    });
  }

  return { skip, previousPath, previousTitle, cookiesReadable, rememberCurrentView };
}
