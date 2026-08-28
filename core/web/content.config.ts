/**
 * `@nuxt/content` collections and build settings (`docs` pages with Zod schema, SQLite via better-sqlite3).
 */
// @ts-ignore
import { defineCollection, defineContentConfig } from '@nuxt/content';
import { z } from 'zod';
import { DOCS_COLLECTION_EXCLUDE, DOCS_COLLECTION_INCLUDE, REPO_DOCS_DIR } from './shared/docs-source';

/**
 * Valid keys for named resume entries used by the `resume` data collection.
 * Keeping this enum centralised ensures content authors pick from a controlled
 * *set* of resume variants that the UI understands (used to populate selectors
 * and filename-to-key mappings).
 */
const resumeKeySchema = z.enum([
  'general',
  'seniorFullStack',
  'architectTechnicalLead',
  'frontendRemote2026',
  'frontendRemote2025',
  'uiEngineer',
  'creativeTechnologist',
  'remoteSoftwareDeveloper',
  'associateTechnicalArchitect',
  'seniorFullStackContract',
]);

/**
 * Zod schema describing the shape of the `resume` collection's JSON payload.
 * This schema is intentionally strict to ensure the resume UI receives
 * predictable fields for hero, intro, stats, experience, and downloadable
 * resume metadata. Changes to this shape should be coordinated with any
 * consumers that read `resume.json`.
 */
const resumeContentSchema = z.object({
  hero: z.object({
    eyebrow: z.string(),
    name: z.string(),
    role: z.string(),
    title: z.string(),
    lede: z.string(),
    primaryActionLabel: z.string(),
    secondaryActionLabel: z.string(),
    secondaryActionHref: z.string(),
  }),
  intro: z.object({
    heading: z.string(),
    paragraphs: z.array(z.string()),
  }),
  stats: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
    })
  ),
  capabilitiesHeading: z.string(),
  capabilities: z.array(
    z.object({
      kicker: z.string(),
      title: z.string(),
      body: z.string(),
    })
  ),
  experienceHeading: z.string(),
  experienceIntro: z.string(),
  experience: z.array(
    z.object({
      company: z.string(),
      period: z.string(),
      role: z.string(),
      highlights: z.array(z.string()),
    })
  ),
  skillsHeading: z.string(),
  skillGroups: z.array(
    z.object({
      title: z.string(),
      skills: z.array(z.string()),
    })
  ),
  educationHeading: z.string(),
  education: z.array(
    z.object({
      credential: z.string(),
      school: z.string(),
      year: z.string(),
    })
  ),
  workStyle: z.object({
    heading: z.string(),
    body: z.string(),
  }),
  resumeDownloads: z.object({
    heading: z.string(),
    intro: z.string(),
  }),
  primaryResumeKey: resumeKeySchema,
  resumes: z.array(
    z.object({
      key: resumeKeySchema,
      title: z.string(),
      meta: z.string(),
    })
  ),
});

const homeContentSchema = z.object({
  seo: z.object({
    title: z.string(),
    description: z.string(),
  }),
  hero: z.object({
    brand: z.string(),
    signature: z.string(),
    eyebrow: z.string(),
    lede: z.string(),
    availability: z.string(),
    currentlyLabel: z.string(),
    primaryActionLabel: z.string(),
    primaryActionHref: z.string(),
    secondaryActionLabel: z.string(),
    secondaryActionHref: z.string(),
    title: z.string(),
    titleAccent: z.string(),
    visualCaption: z.string(),
    stats: z.array(
      z.object({
        value: z.string(),
        label: z.string(),
      })
    ),
    disciplines: z.array(z.string()),
  }),
  featuredWork: z.object({
    eyebrow: z.string(),
    heading: z.string(),
    lede: z.string(),
    slugs: z.array(z.string()),
  }),
  principles: z.object({
    eyebrow: z.string(),
    heading: z.string(),
    lede: z.string(),
    items: z.array(
      z.object({
        title: z.string(),
        body: z.string(),
      })
    ),
  }),
  cta: z.object({
    eyebrow: z.string(),
    heading: z.string(),
    lede: z.string(),
    primaryHref: z.string(),
    primaryLabel: z.string(),
    secondaryLabel: z.string(),
    secondaryHref: z.string(),
  }),
});

const productContentSchema = z.object({
  seo: z.object({
    title: z.string(),
    description: z.string(),
  }),
  hero: z.object({
    eyebrow: z.string(),
    title: z.string(),
    lede: z.string(),
  }),
  nav: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
    })
  ),
  overview: z.object({
    heading: z.string(),
    paragraphs: z.array(z.string()),
    highlights: z.array(
      z.object({
        label: z.string(),
        value: z.string(),
      })
    ),
  }),
  presentation: z.object({
    heading: z.string(),
    lede: z.string(),
    tabs: z.array(
      z.object({
        value: z.string(),
        label: z.string(),
      })
    ),
    description: z.object({
      title: z.string(),
      body: z.array(z.string()),
      bullets: z.array(z.string()),
    }),
    diagram: z.object({
      title: z.string(),
      caption: z.string(),
      groups: z.array(
        z.object({
          id: z.string(),
          label: z.string(),
          x: z.number(),
          y: z.number(),
          width: z.number(),
          height: z.number(),
        })
      ),
      nodes: z.array(
        z.object({
          id: z.string(),
          label: z.string(),
          x: z.number(),
          y: z.number(),
          width: z.number(),
          height: z.number(),
        })
      ),
      edges: z.array(
        z.object({
          from: z.string(),
          to: z.string(),
        })
      ),
      umlSource: z.string(),
    }),
    code: z.object({
      title: z.string(),
      caption: z.string(),
      snippets: z.array(
        z.object({
          id: z.string(),
          label: z.string(),
          language: z.string(),
          code: z.string(),
        })
      ),
    }),
  }),
  features: z.object({
    heading: z.string(),
    items: z.array(
      z.object({
        title: z.string(),
        body: z.string(),
      })
    ),
  }),
  feedback: z.object({
    heading: z.string(),
    lede: z.string(),
    actions: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        severity: z.enum(['success', 'info', 'warn', 'error', 'secondary', 'contrast']),
        summary: z.string(),
        detail: z.string(),
      })
    ),
  }),
});

const galleryExhibitSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('code'),
    language: z.string(),
    source: z.string(),
    filename: z.string().optional(),
    lineNumbers: z.boolean().optional(),
    showCopy: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal('media'),
    mediaType: z.enum(['image', 'video', 'audio']),
    src: z.string(),
    alt: z.string().optional(),
    caption: z.string().optional(),
    poster: z.string().optional(),
  }),
  z.object({
    kind: z.literal('viz'),
    caption: z.string().optional(),
    series: z.array(z.object({ label: z.string(), value: z.number() })).optional(),
    diagram: z
      .object({
        ariaLabel: z.string().optional(),
        caption: z.string().optional(),
        edges: z.array(z.object({ from: z.string(), to: z.string() })).optional(),
        groups: z
          .array(
            z.object({
              id: z.string(),
              label: z.string(),
              x: z.number(),
              y: z.number(),
              width: z.number(),
              height: z.number(),
            })
          )
          .optional(),
        nodes: z.array(
          z.object({
            id: z.string(),
            label: z.string(),
            x: z.number(),
            y: z.number(),
            width: z.number(),
            height: z.number(),
          })
        ),
      })
      .optional(),
  }),
]);

const galleryContentSchema = z.object({
  seo: z.object({
    title: z.string(),
    description: z.string(),
  }),
  hero: z.object({
    eyebrow: z.string(),
    title: z.string(),
    lede: z.string(),
  }),
  categories: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      eyebrow: z.string(),
      description: z.string(),
      items: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          type: z.string(),
          summary: z.string(),
          role: z.string().optional(),
          stack: z.array(z.string()).optional(),
          href: z.string().optional(),
          hrefLabel: z.string().optional(),
          motif: z.enum(['lattice', 'orbit', 'spectrum', 'nodes']).optional(),
          tone: z.enum(['cool', 'warm', 'neutral', 'signal']).optional(),
          platform: z.enum(['youtube', 'shorts', 'reels', 'still', 'code', 'viz']).optional(),
          aspect: z.enum(['wide', 'tall', 'square']).optional(),
          views: z.number().nonnegative().optional(),
          likes: z.number().nonnegative().optional(),
          image: z.string().optional(),
          imageAlt: z.string().optional(),
          exhibit: galleryExhibitSchema.optional(),
        })
      ),
    })
  ),
  cta: z.object({
    heading: z.string(),
    lede: z.string(),
    primaryHref: z.string(),
    primaryLabel: z.string(),
  }),
});

const caseStudySchema = z.object({
  slug: z.string().min(1),
  order: z.number().int().nonnegative(),
  title: z.string(),
  category: z.string(),
  summary: z.string(),
  role: z.string(),
  timeframe: z.string(),
  confidentiality: z.enum(['public', 'sanitized']),
  problem: z.string(),
  constraints: z.array(z.string()),
  approach: z.array(z.string()),
  evidence: z.array(z.object({ label: z.string(), value: z.string() })),
  technologies: z.array(z.string()),
  media: z.array(
    z.object({
      type: z.enum(['image', 'video', 'diagram']),
      src: z.string(),
      alt: z.string(),
      caption: z.string().optional(),
      poster: z.string().optional(),
    })
  ),
  links: z.array(z.object({ label: z.string(), href: z.string() })),
});

const decisionCardSchema = z.object({
  id: z.string().min(1),
  date: z.string(),
  source: z.enum(['codex', 'chatgpt', 'github', 'adobe']),
  title: z.string(),
  promptExcerpt: z.string(),
  decision: z.string(),
  result: z.string(),
  learning: z.string(),
  caseStudySlug: z.string().optional(),
  evidenceHref: z.string().url().optional(),
  privacyStatus: z.enum(['approved', 'sanitized', 'private']),
});

const codeContentSchema = z.object({
  seo: z.object({
    title: z.string(),
    description: z.string(),
  }),
  hero: z.object({
    eyebrow: z.string(),
    title: z.string(),
    lede: z.string(),
  }),
  windowTitle: z.string(),
  explorer: z.array(z.string().min(1)),
  repos: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      language: z.string().min(1),
      description: z.string().min(1),
      updated: z.string().min(1),
      // `#` when the monorepo is private (anonymous GitHub 404); real URLs when public.
      href: z.union([z.string().url(), z.literal('#')]).optional(),
    })
  ),
});

const writingContentSchema = z.object({
  seo: z.object({
    title: z.string(),
    description: z.string(),
  }),
  hero: z.object({
    eyebrow: z.string(),
    title: z.string(),
    lede: z.string(),
  }),
  essays: z.array(
    z.object({
      id: z.string().min(1),
      category: z.string().min(1),
      status: z.enum(['planned', 'proposed', 'draft', 'required', 'published']),
      title: z.string().min(1),
      excerpt: z.string().min(1),
      featured: z.boolean().optional(),
      href: z.string().optional(),
    })
  ),
});

/**
 * Content configuration for `@nuxt/content`.
 *
 * - `collections` defines structured content (docs pages and typed data files)
 *   with Zod validation.
 * - `content.experimental.sqliteConnector` enables the fast SQLite-backed
 *   content store during build for improved query performance.
 */
export default defineContentConfig({
  collections: {
    docs: defineCollection({
      type: 'page',
      schema: z
        .object({
          title: z.string().optional(),
          description: z.string().optional(),
          tags: z.array(z.string()).optional(),
          layout: z.string().optional(),
          permalink: z.string().optional(),
        })
        .passthrough(),
      source: {
        cwd: REPO_DOCS_DIR,
        include: DOCS_COLLECTION_INCLUDE,
        exclude: [...DOCS_COLLECTION_EXCLUDE],
      },
    }),
    gallery: defineCollection({
      type: 'data',
      source: 'gallery.json',
      schema: galleryContentSchema,
    }),
    code: defineCollection({
      type: 'data',
      source: 'code.json',
      schema: codeContentSchema,
    }),
    writing: defineCollection({
      type: 'data',
      source: 'writing.json',
      schema: writingContentSchema,
    }),
    resume: defineCollection({
      type: 'data',
      source: 'resume.json',
      schema: resumeContentSchema,
    }),
    home: defineCollection({
      type: 'data',
      source: 'home.json',
      schema: homeContentSchema,
    }),
    product: defineCollection({
      type: 'data',
      source: 'product.json',
      schema: productContentSchema,
    }),
    caseStudies: defineCollection({
      type: 'data',
      source: 'case-studies/*.json',
      schema: caseStudySchema,
    }),
    decisionCards: defineCollection({
      type: 'data',
      source: 'decision-cards/*.json',
      schema: decisionCardSchema,
    }),
  },
  content: {
    build: {},
    experimental: { sqliteConnector: 'better-sqlite3' },
    watch: { enabled: true },
  },
});
