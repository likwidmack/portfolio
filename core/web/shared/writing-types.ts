/**
 * Editorial writing shelf for `/blog` — statused essays (documentation-standard IA),
 * distinct from DB-backed `BlogPost` notes.
 */

export type WritingDocStatus = 'planned' | 'proposed' | 'draft' | 'required' | 'published';

export type WritingEssay = {
  category: string;
  excerpt: string;
  featured?: boolean;
  href?: string;
  id: string;
  status: WritingDocStatus;
  title: string;
};

export type WritingContent = {
  essays: WritingEssay[];
  hero: {
    eyebrow: string;
    lede: string;
    title: string;
  };
  seo: {
    description: string;
    title: string;
  };
};

/** Card used by the editorial grid (content essays + published API notes). */
export type WritingGridCard = {
  excerpt: string;
  featured: boolean;
  href: string;
  id: string;
  kicker: string;
  title: string;
};

export const WRITING_STATUS_LABEL: Record<WritingDocStatus, string> = {
  planned: 'planned',
  proposed: 'proposed',
  draft: 'draft',
  required: 'required',
  published: 'published',
};

export function formatWritingKicker(category: string, status: WritingDocStatus): string {
  return `${category} · ${WRITING_STATUS_LABEL[status]}`;
}

export function essayToGridCard(essay: WritingEssay): WritingGridCard {
  return {
    id: essay.id,
    title: essay.title,
    excerpt: essay.excerpt,
    href: essay.href ?? '',
    featured: Boolean(essay.featured),
    kicker: formatWritingKicker(essay.category, essay.status),
  };
}

export type PublishedNoteInput = {
  excerpt?: string | null;
  id: string;
  publishedAt?: string | null;
  slug: string;
  title: string;
};

/**
 * Map a published API blog note into an editorial grid card.
 * Kickers stay "Notes · published" so DB posts remain visually distinct from essays.
 */
export function noteToGridCard(post: PublishedNoteInput, formatDate: (iso: string) => string): WritingGridCard {
  const when = post.publishedAt ? formatDate(post.publishedAt) : '';
  return {
    id: `note-${post.id}`,
    title: post.title,
    excerpt: (post.excerpt || '').trim(),
    href: `/blog/${post.slug}`,
    featured: false,
    kicker: when ? `Notes · published · ${when}` : 'Notes · published',
  };
}

/**
 * Build the editorial shelf: featured essay first (or first essay), then remaining
 * essays, then published notes. Matches the Writing board layout (feature + cells).
 */
export function buildWritingGrid(
  essays: WritingEssay[],
  notes: PublishedNoteInput[],
  formatDate: (iso: string) => string
): WritingGridCard[] {
  const essayCards = essays.map(essayToGridCard);
  const featuredIndex = essayCards.findIndex((card) => card.featured);
  const orderedEssays =
    featuredIndex <= 0
      ? essayCards.map((card, index) => (index === 0 ? { ...card, featured: true } : { ...card, featured: false }))
      : [
          { ...essayCards[featuredIndex], featured: true },
          ...essayCards.filter((_, index) => index !== featuredIndex).map((card) => ({ ...card, featured: false })),
        ];

  const noteCards = notes.map((post) => noteToGridCard(post, formatDate));
  return [...orderedEssays, ...noteCards];
}

export type WritingGridLayout = {
  feature: WritingGridCard | null;
  primaryCells: WritingGridCard[];
  secondaryCells: WritingGridCard[];
};

/** Partition cards into the canvas editorial composition. */
export function partitionWritingGrid(cards: WritingGridCard[]): WritingGridLayout {
  if (!cards.length) {
    return { feature: null, primaryCells: [], secondaryCells: [] };
  }
  const [feature, ...rest] = cards;
  return {
    feature: { ...feature, featured: true },
    primaryCells: rest.slice(0, 2),
    secondaryCells: rest.slice(2),
  };
}
