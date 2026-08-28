import { describe, expect, it } from 'vitest';

import {
  filterGalleryPosts,
  flattenGalleryPosts,
  formatGalleryCount,
  galleryEngagementLabel,
  resolveGalleryAspect,
  resolveGalleryPlatform,
  type GalleryContent,
} from '../shared/gallery-types';

const sample: GalleryContent = {
  seo: { title: 'Gallery', description: 'Samples' },
  hero: { eyebrow: 'shelf', title: 'Gallery', lede: 'Feed' },
  cta: { heading: 'Cta', lede: 'Lede', primaryHref: 'mailto:a@b.c', primaryLabel: 'Mail' },
  categories: [
    {
      id: 'xr3d',
      label: '3D / XR',
      eyebrow: 'spatial',
      description: 'Spatial',
      items: [
        {
          id: 'still',
          title: 'Still',
          type: 'Image',
          platform: 'still',
          views: 6400,
          likes: 410,
          summary: 'A still',
          exhibit: { kind: 'media', mediaType: 'image', src: '/i/a.png' },
        },
        {
          id: 'reel',
          title: 'Reel',
          type: 'Video',
          platform: 'reels',
          aspect: 'tall',
          views: 19800,
          likes: 1200,
          summary: 'A reel',
          exhibit: { kind: 'media', mediaType: 'video', src: '/v/a.mp4' },
        },
        {
          id: 'walkthrough',
          title: 'Walkthrough',
          type: 'Longform',
          platform: 'youtube',
          aspect: 'wide',
          views: 12400,
          likes: 840,
          summary: 'A walkthrough',
          exhibit: { kind: 'media', mediaType: 'video', src: '/v/b.mp4' },
        },
      ],
    },
    {
      id: 'code',
      label: 'Code',
      eyebrow: 'eng',
      description: 'Snippets',
      items: [
        {
          id: 'pipe',
          title: 'Pipeline',
          type: 'TS',
          platform: 'code',
          summary: 'Syntax',
          exhibit: { kind: 'code', language: 'ts', source: 'export {}' },
        },
      ],
    },
  ],
};

describe('gallery browse helpers', () => {
  it('flattens category items into a feed list', () => {
    const posts = flattenGalleryPosts(sample);
    expect(posts).toHaveLength(4);
    expect(posts[0]?.categoryId).toBe('xr3d');
    expect(posts[3]?.kind).toBe('code');
  });

  it('filters by group and social kind', () => {
    const posts = flattenGalleryPosts(sample);
    expect(filterGalleryPosts(posts, 'all', 'video').map((post) => post.id)).toEqual(['walkthrough']);
    expect(filterGalleryPosts(posts, 'all', 'shorts').map((post) => post.id)).toEqual(['reel']);
    expect(filterGalleryPosts(posts, 'code', 'all').map((post) => post.id)).toEqual(['pipe']);
    expect(filterGalleryPosts(posts, 'xr3d', 'stills').map((post) => post.id)).toEqual(['still']);
  });

  it('resolves platform, aspect, and teal engagement labels', () => {
    const posts = flattenGalleryPosts(sample);
    const reel = posts.find((post) => post.id === 'reel')!;
    const still = posts.find((post) => post.id === 'still')!;
    expect(resolveGalleryPlatform(reel)).toBe('reels');
    expect(resolveGalleryAspect(reel)).toBe('tall');
    expect(formatGalleryCount(19800)).toBe('19.8k');
    expect(galleryEngagementLabel(still)).toBe('6.4k views · 410 likes');
  });
});
