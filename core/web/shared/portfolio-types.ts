export interface CaseStudy {
  slug: string;
  order: number;
  title: string;
  category: string;
  summary: string;
  role: string;
  timeframe: string;
  confidentiality: 'public' | 'sanitized';
  problem: string;
  constraints: string[];
  approach: string[];
  evidence: Array<{ label: string; value: string }>;
  technologies: string[];
  media: Array<{
    type: 'image' | 'video' | 'diagram';
    src: string;
    alt: string;
    caption?: string;
    poster?: string;
    lqip?: string;
    dominantColor?: string;
    aspectCss?: string;
  }>;
  links: Array<{ label: string; href: string }>;
}

export interface DecisionCard {
  id: string;
  date: string;
  source: 'codex' | 'chatgpt' | 'github' | 'adobe';
  title: string;
  promptExcerpt: string;
  decision: string;
  result: string;
  learning: string;
  caseStudySlug?: string;
  evidenceHref?: string;
  privacyStatus: 'approved' | 'sanitized' | 'private';
}

/** Public process pages always fail closed when a card has not passed review. */
export function isPublicDecisionCard(card: DecisionCard): boolean {
  return card.privacyStatus === 'approved' || card.privacyStatus === 'sanitized';
}

export function sortCaseStudies(studies: CaseStudy[]): CaseStudy[] {
  // Nuxt Content may surface `order` as a string from SQLite — coerce for stable numeric sort.
  return [...studies].sort((a, b) => Number(a.order) - Number(b.order));
}

/** Previous / next case study in Discovery order (`order` ascending); `null` at either end or for an unknown slug. */
export function adjacentStudies(
  studies: CaseStudy[],
  slug: string
): { previous: CaseStudy | null; next: CaseStudy | null } {
  const sorted = sortCaseStudies(studies);
  const index = sorted.findIndex((study) => study.slug === slug);
  if (index === -1) return { previous: null, next: null };
  return { previous: sorted[index - 1] ?? null, next: sorted[index + 1] ?? null };
}

/** Prefer a still image, then a video poster, then a diagram for work-card thumbnails. */
export type CaseStudyCardMedia = {
  src: string;
  alt: string;
  lqip?: string;
  dominantColor?: string;
  aspectCss?: string;
};

export function getCaseStudyCardMedia(study: CaseStudy): CaseStudyCardMedia | null {
  const image = study.media.find((item) => item.type === 'image');
  if (image) {
    return {
      src: image.src,
      alt: image.alt,
      lqip: image.lqip,
      dominantColor: image.dominantColor,
      aspectCss: image.aspectCss,
    };
  }

  const videoWithPoster = study.media.find((item) => item.type === 'video' && item.poster);
  if (videoWithPoster?.poster) {
    return {
      src: videoWithPoster.poster,
      alt: videoWithPoster.alt,
      lqip: videoWithPoster.lqip,
      dominantColor: videoWithPoster.dominantColor,
      aspectCss: videoWithPoster.aspectCss,
    };
  }

  const diagram = study.media.find((item) => item.type === 'diagram');
  if (diagram) {
    return { src: diagram.src, alt: diagram.alt };
  }

  return null;
}
