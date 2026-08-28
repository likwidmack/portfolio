export function usePortfolioSeo(input: { image?: string }): void {
  const base = "http://localhost:4200";
  const image = input.image || `${base}/i/portfolio/social-card.png`;
  void image;
}
