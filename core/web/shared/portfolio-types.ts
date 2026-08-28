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

/** Prefer a still image, then a video poster, then a diagram for work-card thumbnails. */
export function getCaseStudyCardMedia(study: CaseStudy): { src: string; alt: string } | null {
  const image = study.media.find((item) => item.type === 'image');
  if (image) {
    return { src: image.src, alt: image.alt };
  }

  const videoWithPoster = study.media.find((item) => item.type === 'video' && item.poster);
  if (videoWithPoster?.poster) {
    return { src: videoWithPoster.poster, alt: videoWithPoster.alt };
  }

  const diagram = study.media.find((item) => item.type === 'diagram');
  if (diagram) {
    return { src: diagram.src, alt: diagram.alt };
  }

  return null;
}
