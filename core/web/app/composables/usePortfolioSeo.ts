import { isSplashPath } from '#shared/journey-preference';
import { documentTitleForPath } from '#shared/site-profile';

type PortfolioSeoInput = {
  title: string;
  description: string;
  path: string;
  image?: string;
};

export function usePortfolioSeo(input: PortfolioSeoInput): void {
  const config = useRuntimeConfig();
  const base = String(config.public.siteUrl || 'http://localhost:4200').replace(/\/$/, '');
  const canonical = `${base}${input.path.startsWith('/') ? input.path : `/${input.path}`}`;
  const title = documentTitleForPath(input.title, input.path);
  const image = input.image
    ? input.image.startsWith('http')
      ? input.image
      : `${base}${input.image}`
    : 'https://repository-images.githubusercontent.com/1349135003/7f6935cc-3cf2-44f8-89c7-ec4462c5bc1f';

  useSeoMeta({
    title,
    description: input.description,
    ogTitle: title,
    ogDescription: input.description,
    ogType: 'website',
    ogUrl: canonical,
    ogImage: image,
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: input.description,
    twitterImage: image,
  });

  useHead({
    title,
    titleTemplate: isSplashPath(input.path) ? '%s' : undefined,
    link: [{ rel: 'canonical', href: canonical }],
  });
}
