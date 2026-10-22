/**
 * Portable media HTTP client (browser + Node). Path-agnostic `baseUrl`.
 */

export const MEDIA_KINDS = ['image', 'svg', 'audio', 'video', 'model', 'document'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export function isMediaKind(value: unknown): value is MediaKind {
  return typeof value === 'string' && (MEDIA_KINDS as readonly string[]).includes(value);
}

export const MEDIA_TENANTS = ['portfolio', 'hyperactivity'] as const;
export type MediaTenant = (typeof MEDIA_TENANTS)[number];

/** Catalog variants: `t` = 320 px, then 640 / 1280 / 1920 px wide. `p` (poster) is reserved. */
export const MEDIA_VARIANTS = ['t', '640', '1280', '1920'] as const;
export type MediaVariant = (typeof MEDIA_VARIANTS)[number];

export type MediaImageFormat = 'webp' | 'avif' | 'jpeg' | 'png';

export type MediaAsset = {
  id: string;
  tenant: MediaTenant;
  kind: MediaKind;
  mime: string;
  sha256: string;
  byteSize: number;
  /** Normalized kebab-case name (no extension), unique per tenant and kind, whatever the extension. */
  name: string;
  /** Storage key and CDN path without the leading slash: `m/{tenant}/{kind}/{name}.{ext}`. */
  path: string;
  meta: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  /** Public URL of the original (list and detail responses only). */
  publicUrl?: string;
  /** Ready `t` thumbnail or the original; `null` for kinds without a preview (list and detail only). */
  previewUrl?: string | null;
};

export type MediaChild = {
  id: string;
  assetId: string;
  role: string;
  /** Catalog variant code, or `custom` for a recipe outside the catalog. */
  variant?: MediaVariant | 'p' | 'custom';
  status: string;
  /** Output key: `m/{tenant}/{kind}/{name}@{variant}.{ext}`; null until materialized. */
  path: string | null;
  meta?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type JobRecord = {
  id: string;
  status: string;
  lastError: string | null;
  type?: string;
  assetId?: string;
  childId?: string;
  attempts?: number;
  createdAt?: string;
  startedAt?: string | null;
  finishedAt?: string | null;
};

export type MediaApiClientOptions = {
  /** e.g. `/api/media` or `/api/admin/media` (no trailing slash required). */
  baseUrl: string;
  /** Bearer token provider (sync or async). */
  getToken: () => string | null | undefined | Promise<string | null | undefined>;
  /** Override fetch (tests). Defaults to global `fetch`. */
  fetch?: typeof fetch;
};

export class MediaApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string, message?: string) {
    super(message ?? `Media API ${status}: ${body || 'request failed'}`);
    this.name = 'MediaApiError';
    this.status = status;
    this.body = body;
  }
}

/**
 * 409 from presign/complete when the requested name is taken. Carries a free name to offer
 * (`hero-shot.png` taken -> `hero-shot-2.png`), or nulls when no suggestion could be found.
 */
export class MediaNameConflictError extends MediaApiError {
  readonly path: string;
  readonly suggestedName: string | null;
  readonly suggestedFilename: string | null;
  readonly suggestedPath: string | null;

  constructor(
    body: string,
    detail: {
      path: string;
      suggestedName?: string | null;
      suggestedFilename?: string | null;
      suggestedPath?: string | null;
    }
  ) {
    super(409, body, `Media name already taken: ${detail.path}`);
    this.name = 'MediaNameConflictError';
    this.path = detail.path;
    this.suggestedName = detail.suggestedName ?? null;
    this.suggestedFilename = detail.suggestedFilename ?? null;
    this.suggestedPath = detail.suggestedPath ?? null;
  }
}

/** `data` of a `name_conflict` 409 (built by `@tgmc/media`'s `mediaErrorToHttp`; kept portable here). */
export type NameConflictData = {
  code: 'name_conflict';
  path: string;
  suggestedName: string | null;
  suggestedFilename: string | null;
  suggestedPath: string | null;
};

/** Parse the body of a failed response into its `name_conflict` data, or `null` for any other body. */
export function parseNameConflictData(body: string): NameConflictData | null {
  try {
    const data = (JSON.parse(body) as { data?: Record<string, unknown> } | null)?.data;
    if (data?.code !== 'name_conflict' || typeof data.path !== 'string') {
      return null;
    }
    const text = (value: unknown) => (typeof value === 'string' ? value : null);
    return {
      code: 'name_conflict',
      path: data.path,
      suggestedName: text(data.suggestedName),
      suggestedFilename: text(data.suggestedFilename),
      suggestedPath: text(data.suggestedPath),
    };
  } catch {
    return null;
  }
}

/** Build the right error for a failed response: a name conflict keeps its suggestion. */
function toApiError(status: number, body: string): MediaApiError {
  const conflict = status === 409 ? parseNameConflictData(body) : null;
  return conflict ? new MediaNameConflictError(body, conflict) : new MediaApiError(status, body);
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

function joinUrl(baseUrl: string, path: string): string {
  const base = normalizeBaseUrl(baseUrl);
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

export type MediaApiClient = {
  listAssets: (filter?: {
    kind?: MediaKind;
    tenant?: MediaTenant;
    tag?: string;
    limit?: number;
    offset?: number;
  }) => Promise<MediaAsset[]>;
  getAsset: (id: string) => Promise<{ asset: MediaAsset; children: MediaChild[] }>;
  deleteAsset: (id: string) => Promise<{ deleted: string }>;
  /** Merge asset meta. Sending `tags` replaces `meta.tags` (use `[]` to clear). */
  updateAssetMeta: (id: string, body: { meta?: Record<string, unknown>; tags?: string[] }) => Promise<MediaAsset>;
  /**
   * Materialize a child. Both `/api/media` and `/api/admin/media` accept:
   * - `variant` (+ optional `format`): a catalog variant at a stable key; re-materializing it
   *   replaces the object in place.
   * - `recipe`: a custom child, fresh on every call.
   * - neither (or `useDefaultThumb: true`): the `t` thumbnail.
   * `role` is an optional free label (defaults to the variant code). `p` is rejected (400).
   */
  materialize: (
    id: string,
    body: {
      role?: string;
      variant?: MediaVariant;
      format?: MediaImageFormat;
      recipe?: unknown;
      useDefaultThumb?: boolean;
    }
  ) => Promise<{ job: JobRecord; mode?: string; child?: MediaChild }>;
  getJob: (id: string) => Promise<JobRecord>;
  /**
   * Admin-style JSON upload (`POST …/assets` with contentBase64).
   * Only available on `/api/admin/media` — portfolio `/api/media` has no POST /assets
   * (use createPresign → PUT → completeIngest instead).
   */
  uploadBase64: (body: {
    kind: MediaKind;
    contentBase64: string;
    mime?: string;
    filename?: string;
    meta?: Record<string, unknown>;
  }) => Promise<MediaAsset>;
  /**
   * Reserve `m/{tenant}/{kind}/{name}.{ext}` from `filename` and get a presigned PUT for it.
   * Rejects with `MediaNameConflictError` (409) when the name is taken.
   */
  createPresign: (body: { kind: MediaKind; mime: string; filename: string; tenant?: MediaTenant }) => Promise<{
    assetId: string;
    path: string;
    name: string;
    expiresAt: string;
    uploadUrl: string;
    /** Send every header exactly as returned (they are signed into `uploadUrl`). */
    headers: Record<string, string>;
  }>;
  completeIngest: (body: {
    assetId: string;
    /** The `path` returned by `createPresign`. */
    path: string;
    kind: MediaKind;
    mime: string;
    sha256?: string;
    filename?: string;
    meta?: Record<string, unknown>;
  }) => Promise<MediaAsset>;
};

/**
 * Create a portable media API client.
 */
export function createMediaApiClient(options: MediaApiClientOptions): MediaApiClient {
  const baseUrl = options.baseUrl;
  const doFetch = options.fetch ?? fetch;

  async function authHeaders(extra?: HeadersInit): Promise<Headers> {
    const headers = new Headers(extra);
    const token = await options.getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return headers;
  }

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = await authHeaders(init.headers);
    const response = await doFetch(joinUrl(baseUrl, path), {
      ...init,
      headers,
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw toApiError(response.status, body);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  return {
    listAssets(filter = {}) {
      const params = new URLSearchParams();
      if (filter.kind) {
        params.set('kind', filter.kind);
      }
      if (filter.tenant) {
        params.set('tenant', filter.tenant);
      }
      if (filter.tag) {
        params.set('tag', filter.tag);
      }
      if (filter.limit != null) {
        params.set('limit', String(filter.limit));
      }
      if (filter.offset != null) {
        params.set('offset', String(filter.offset));
      }
      const query = params.toString();
      return request(`/assets${query ? `?${query}` : ''}`);
    },
    getAsset(id) {
      return request(`/assets/${encodeURIComponent(id)}`);
    },
    deleteAsset(id) {
      return request(`/assets/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
    updateAssetMeta(id, body) {
      return request(`/assets/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    },
    materialize(id, body) {
      return request(`/assets/${encodeURIComponent(id)}/materialize`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    getJob(id) {
      return request(`/jobs/${encodeURIComponent(id)}`);
    },
    uploadBase64(body) {
      return request('/assets', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    createPresign(body) {
      return request('/ingest/presign', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    completeIngest(body) {
      return request('/ingest/complete', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
  };
}
