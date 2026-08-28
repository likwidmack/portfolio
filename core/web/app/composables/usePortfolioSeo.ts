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
  const image = input.image
    ? input.image.startsWith('http')
      ? input.image
      : `${base}${input.image}`
    : 'https://raw.githubusercontent.com/likwidmack/portfolio/main/.github/social-preview.png';

  useSeoMeta({
    title: input.title,
    description: input.description,
    ogTitle: input.title,
    ogDescription: input.description,
    ogType: 'website',
    ogUrl: canonical,
    ogImage: image,
    twitterCard: 'summary_large_image',
    twitterTitle: input.title,
    twitterDescription: input.description,
    twitterImage: image,
  });

  useHead({ link: [{ rel: 'canonical', href: canonical }] });
}
