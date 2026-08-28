export function usePortfolioSeo(input: { image?: string }): void {
  const base = "http://localhost:4200";
  const image = input.image || `${base}/img/portfolio/social-card.png`;
  void image;
}
