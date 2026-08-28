export type GalleryMotif = 'lattice' | 'orbit' | 'spectrum' | 'nodes';
export type GalleryTone = 'cool' | 'warm' | 'neutral' | 'signal';
export type GalleryMediaType = 'image' | 'video' | 'audio';
export type GalleryExhibitKind = 'code' | 'media' | 'viz';
export type GalleryFilterKind = 'all' | 'video' | 'shorts' | 'stills' | 'code' | 'viz';
export type GalleryViewMode = 'feed' | 'grid';
export type GalleryPlatform = 'youtube' | 'shorts' | 'reels' | 'still' | 'code' | 'viz';
export type GalleryAspect = 'wide' | 'tall' | 'square';

export type GalleryMeta = {
  aspect?: GalleryAspect;
  href?: string;
  hrefLabel?: string;
  likes?: number;
  motif?: GalleryMotif;
  platform?: GalleryPlatform;
  role?: string;
  stack?: string[];
  summary: string;
  title: string;
  tone?: GalleryTone;
  type: string;
  views?: number;
};

export type GalleryVizSeriesPoint = {
  label: string;
  value: number;
};

export type GalleryVizDiagram = {
  ariaLabel?: string;
  caption?: string;
  edges?: Array<{ from: string; to: string }>;
  groups?: Array<{
    height: number;
    id: string;
    label: string;
    width: number;
    x: number;
    y: number;
  }>;
  nodes: Array<{
    height: number;
    id: string;
    label: string;
    width: number;
    x: number;
    y: number;
  }>;
};

export type GalleryExhibit =
  | {
      filename?: string;
      kind: 'code';
      language: string;
      lineNumbers?: boolean;
      showCopy?: boolean;
      source: string;
    }
  | {
      alt?: string;
      caption?: string;
      kind: 'media';
      mediaType: GalleryMediaType;
      poster?: string;
      src: string;
    }
  | {
      caption?: string;
      diagram?: GalleryVizDiagram;
      kind: 'viz';
      series?: GalleryVizSeriesPoint[];
    };

export type GalleryItem = GalleryMeta & {
  exhibit?: GalleryExhibit;
  id: string;
  image?: string;
  imageAlt?: string;
};

export type GalleryCategory = {
  description: string;
  eyebrow: string;
  id: string;
  items: GalleryItem[];
  label: string;
};

export type GalleryContent = {
  categories: GalleryCategory[];
  cta: {
    heading: string;
    lede: string;
    primaryHref: string;
    primaryLabel: string;
  };
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

export type GalleryPost = GalleryItem & {
  categoryId: string;
  categoryLabel: string;
  kind: GalleryExhibitKind | 'shell';
};

export const GALLERY_KIND_FILTERS: Array<{ id: GalleryFilterKind; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'video', label: 'Video' },
  { id: 'shorts', label: 'Shorts' },
  { id: 'stills', label: 'Stills' },
  { id: 'code', label: 'Code' },
  { id: 'viz', label: 'Diagrams' },
];

export const GALLERY_PLATFORM_LABEL: Record<GalleryPlatform, string> = {
  youtube: 'YouTube',
  shorts: 'Shorts',
  reels: 'Reels',
  still: 'Still',
  code: 'Code',
  viz: 'Diagram',
};

export function exhibitKind(item: GalleryItem): GalleryPost['kind'] {
  return item.exhibit?.kind ?? 'shell';
}

export function flattenGalleryPosts(content: GalleryContent): GalleryPost[] {
  return content.categories.flatMap((category) =>
    category.items.map((item) => ({
      ...item,
      categoryId: category.id,
      categoryLabel: category.label,
      kind: exhibitKind(item),
    }))
  );
}

export function filterGalleryPosts(posts: GalleryPost[], groupId: string, kind: GalleryFilterKind): GalleryPost[] {
  return posts.filter((post) => matchesGroup(post, groupId) && matchesKind(post, kind));
}

export function resolveGalleryPlatform(post: GalleryPost): GalleryPlatform {
  if (post.platform) {
    return post.platform;
  }
  switch (post.kind) {
    case 'code':
      return 'code';
    case 'viz':
      return 'viz';
    case 'media': {
      if (post.exhibit?.kind === 'media' && post.exhibit.mediaType === 'video') {
        if (post.categoryId === 'reels' || /reel|short/i.test(post.type)) {
          return 'reels';
        }
        return 'youtube';
      }
      return 'still';
    }
    case 'shell':
      return 'still';
    default: {
      const _exhaustive: never = post.kind;
      return _exhaustive;
    }
  }
}

export function resolveGalleryAspect(post: GalleryPost): GalleryAspect {
  if (post.aspect) {
    return post.aspect;
  }
  const platform = resolveGalleryPlatform(post);
  switch (platform) {
    case 'shorts':
    case 'reels':
      return 'tall';
    case 'youtube':
      return 'wide';
    case 'still':
    case 'code':
    case 'viz':
      return 'square';
    default: {
      const _exhaustive: never = platform;
      return _exhaustive;
    }
  }
}

/** Compact engagement label for social tiles (e.g. 12.4k). */
export function formatGalleryCount(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return '0';
  }
  if (value < 1000) {
    return String(Math.round(value));
  }
  const compact = value / 1000;
  if (compact >= 100) {
    return `${Math.round(compact)}k`;
  }
  const rounded = Math.round(compact * 10) / 10;
  return `${rounded}k`;
}

export function galleryEngagementLabel(post: GalleryPost): string | null {
  if (post.views == null && post.likes == null) {
    return null;
  }
  const parts: string[] = [];
  if (post.views != null) {
    parts.push(`${formatGalleryCount(post.views)} views`);
  }
  if (post.likes != null) {
    parts.push(`${formatGalleryCount(post.likes)} likes`);
  }
  return parts.join(' · ');
}

function matchesGroup(post: GalleryPost, groupId: string): boolean {
  return groupId === 'all' || post.categoryId === groupId;
}

function matchesKind(post: GalleryPost, kind: GalleryFilterKind): boolean {
  const platform = resolveGalleryPlatform(post);
  switch (kind) {
    case 'all':
      return true;
    case 'code':
      return platform === 'code';
    case 'viz':
      return platform === 'viz';
    case 'stills':
      return platform === 'still';
    case 'video':
      return platform === 'youtube';
    case 'shorts':
      return platform === 'shorts' || platform === 'reels';
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
