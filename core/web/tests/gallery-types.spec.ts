import { describe, expect, it } from 'vitest';

import { filterGalleryPosts, flattenGalleryPosts, type GalleryContent } from '../shared/gallery-types';

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
          summary: 'A still',
          exhibit: { kind: 'media', mediaType: 'image', src: '/img/a.png' },
        },
        {
          id: 'reel',
          title: 'Reel',
          type: 'Video',
          summary: 'A reel',
          exhibit: { kind: 'media', mediaType: 'video', src: '/video/a.mp4' },
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
    expect(posts).toHaveLength(3);
    expect(posts[0]?.categoryId).toBe('xr3d');
    expect(posts[2]?.kind).toBe('code');
  });

  it('filters by group and kind', () => {
    const posts = flattenGalleryPosts(sample);
    expect(filterGalleryPosts(posts, 'all', 'video').map((post) => post.id)).toEqual(['reel']);
    expect(filterGalleryPosts(posts, 'code', 'all').map((post) => post.id)).toEqual(['pipe']);
    expect(filterGalleryPosts(posts, 'xr3d', 'image').map((post) => post.id)).toEqual(['still']);
  });
});
