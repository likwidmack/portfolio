/**
 * Inspectable evidence examples drawn from shipped portfolio work (code, data, styles).
 * Kept as plain strings so the dialog stays free of secrets and employer internals.
 */

export type EvidenceExampleKind = 'code' | 'data' | 'styles';

export interface EvidenceExampleCard {
  id: string;
  kind: EvidenceExampleKind;
  title: string;
  summary: string;
  language: string;
  sourceLabel: string;
  href?: string;
  code: string;
}

export const EVIDENCE_EXAMPLE_TABS: Array<{ value: EvidenceExampleKind; label: string }> = [
  { value: 'code', label: 'Code' },
  { value: 'data', label: 'Data' },
  { value: 'styles', label: 'Styles' },
];

export const EVIDENCE_EXAMPLES: EvidenceExampleCard[] = [
  {
    id: 'code-media-player',
    kind: 'code',
    title: 'Media player entry',
    summary: 'Browser-safe playback helpers packaged for the Media Systems story.',
    language: 'ts',
    sourceLabel: '@tgmc/media-player',
    href: '/media-player',
    code: `import { TgmcPlayer, type PlaybackMode } from '@tgmc/media-player';

const mode: PlaybackMode = 'mse-hls';
const player = new TgmcPlayer({ mode, autoplay: false });

player.on('state', (state) => {
  // ready | loading | stalled | unsupported — explain, then recover
  renderPlaybackStatus(state);
});`,
  },
  {
    id: 'code-card-media',
    kind: 'code',
    title: 'Work-card media picker',
    summary: 'Prefer image, then video poster, then diagram for unified story thumbnails.',
    language: 'ts',
    sourceLabel: 'shared/portfolio-types.ts',
    href: '/work',
    code: `export function getCaseStudyCardMedia(study: CaseStudy) {
  const image = study.media.find((item) => item.type === 'image');
  if (image) return { src: image.src, alt: image.alt };

  const video = study.media.find((item) => item.type === 'video' && item.poster);
  if (video?.poster) return { src: video.poster, alt: video.alt };

  const diagram = study.media.find((item) => item.type === 'diagram');
  return diagram ? { src: diagram.src, alt: diagram.alt } : null;
}`,
  },
  {
    id: 'code-blog-store',
    kind: 'code',
    title: 'BlogPostStore contract',
    summary: 'Four-env store interface behind the DB-backed SSR blog APIs.',
    language: 'ts',
    sourceLabel: 'server/db/blog-types.ts',
    href: '/blog',
    code: `export interface BlogPostStore {
  listPublished(): Promise<BlogPost[]>;
  listAll(): Promise<BlogPost[]>;
  getBySlug(slug: string): Promise<BlogPost | null>;
  getById(id: string): Promise<BlogPost | null>;
  create(input: CreateBlogPostInput): Promise<BlogPost>;
  update(id: string, input: UpdateBlogPostInput): Promise<BlogPost | null>;
  delete(id: string): Promise<boolean>;
}`,
  },
  {
    id: 'data-case-study',
    kind: 'data',
    title: 'Case study evidence shape',
    summary: 'Typed Nuxt Content payload powering /work and featured home cards.',
    language: 'json',
    sourceLabel: 'content/case-studies/*.json',
    href: '/work',
    code: `{
  "slug": "media-systems",
  "title": "Media Systems",
  "evidence": [
    {
      "label": "Implementation proof",
      "value": "@tgmc/media-player MSE/HLS workspace package"
    }
  ],
  "media": [
    {
      "type": "diagram",
      "src": "/i/portfolio/media-system-flow.svg",
      "alt": "Playback state recovery flow"
    }
  ]
}`,
  },
  {
    id: 'data-home-featured',
    kind: 'data',
    title: 'Featured work slugs',
    summary: 'Home pulls stories by slug instead of embedding project copies.',
    language: 'json',
    sourceLabel: 'content/home.json',
    href: '/',
    code: `{
  "featuredWork": {
    "heading": "Systems, prototypes, and AI interactions",
    "slugs": [
      "media-systems",
      "innovation-prototyping",
      "human-controlled-ai-lab"
    ]
  }
}`,
  },
  {
    id: 'data-election-encode',
    kind: 'data',
    title: 'Visualization encoding notes',
    summary: 'Sanitized ingest → encode → present contract from the Data Visualization story.',
    language: 'json',
    sourceLabel: 'work/data-visualization',
    href: '/work/data-visualization',
    code: `{
  "pipeline": ["ingest", "encode", "present", "accessible-read"],
  "encodings": ["geo-path", "poll-scale", "hierarchy-impact"],
  "failureStates": ["stalled-feed", "partial-results", "missing-labels"]
}`,
  },
  {
    id: 'styles-tokens',
    kind: 'styles',
    title: 'Theme token surface',
    summary: 'Portfolio launch tokens that keep Work cards and dialogs on one visual system.',
    language: 'scss',
    sourceLabel: 'assets/css/portfolio-launch.scss',
    href: '/styles',
    code: `.work-card {
  --work-card-media-ratio: 16 / 10;
  --work-card-media-width: 22.5rem;
  border-right: 1px solid var(--portfolio-rule);
  background: color-mix(in srgb, var(--surface-color) 88%, transparent);
}

.work-card__media {
  aspect-ratio: var(--work-card-media-ratio);
  overflow: hidden;
}`,
  },
  {
    id: 'styles-lanes',
    kind: 'styles',
    title: 'Kitchen-sink lanes',
    summary: 'Native / Foundation / PrimeVue comparison grammar from the Experience Systems story.',
    language: 'scss',
    sourceLabel: 'pages/styles + @tgmc/theme',
    href: '/styles',
    code: `.styles-lanes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

[data-lane='native'] { /* baseline HTML */ }
[data-lane='foundation'] { /* XY layout */ }
[data-lane='primevue'] { /* Ui* wrappers */ }`,
  },
  {
    id: 'styles-dialog',
    kind: 'styles',
    title: 'Evidence dialog frame',
    summary: 'Wider modal shell so code, data, and style cards stay readable.',
    language: 'scss',
    sourceLabel: 'portfolio-launch.scss',
    href: '/work',
    code: `.evidence-examples-dialog.p-dialog {
  width: min(52rem, calc(100vw - 2rem));
}

.evidence-example-card {
  border: 1px solid var(--portfolio-rule);
  padding: 1rem 1.1rem;
  background: color-mix(in srgb, var(--surface-color) 92%, transparent);
}`,
  },
];

export function evidenceExamplesByKind(kind: EvidenceExampleKind): EvidenceExampleCard[] {
  return EVIDENCE_EXAMPLES.filter((example) => example.kind === kind);
}
