export type GalleryMotif = 'lattice' | 'orbit' | 'spectrum' | 'nodes';
export type GalleryTone = 'cool' | 'warm' | 'neutral' | 'signal';
export type GalleryMediaType = 'image' | 'video' | 'audio';
export type GalleryExhibitKind = 'code' | 'media' | 'viz';
export type GalleryFilterKind = 'all' | 'image' | 'video' | 'code' | 'viz';
export type GalleryViewMode = 'feed' | 'grid';

export type GalleryMeta = {
  href?: string;
  hrefLabel?: string;
  motif?: GalleryMotif;
  role?: string;
  stack?: string[];
  summary: string;
  title: string;
  tone?: GalleryTone;
  type: string;
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
  { id: 'image', label: 'Images' },
  { id: 'video', label: 'Video' },
  { id: 'code', label: 'Code' },
  { id: 'viz', label: 'Diagrams' },
];

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

function matchesGroup(post: GalleryPost, groupId: string): boolean {
  return groupId === 'all' || post.categoryId === groupId;
}

function matchesKind(post: GalleryPost, kind: GalleryFilterKind): boolean {
  switch (kind) {
    case 'all':
      return true;
    case 'code':
      return post.kind === 'code';
    case 'viz':
      return post.kind === 'viz';
    case 'image':
      return (
        post.kind === 'shell' ||
        (post.kind === 'media' && post.exhibit?.kind === 'media' && post.exhibit.mediaType === 'image')
      );
    case 'video':
      return post.kind === 'media' && post.exhibit?.kind === 'media' && post.exhibit.mediaType === 'video';
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
