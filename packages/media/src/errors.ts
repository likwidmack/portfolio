/** Domain errors for `@tgmc/media`. */

export class MediaNotFoundError extends Error {
  readonly code = 'MEDIA_NOT_FOUND' as const;

  constructor(message: string) {
    super(message);
    this.name = 'MediaNotFoundError';
  }
}

export class MediaConflictError extends Error {
  readonly code = 'MEDIA_CONFLICT' as const;

  constructor(message: string) {
    super(message);
    this.name = 'MediaConflictError';
  }
}

/**
 * A media name is already taken. Names are unique per tenant and kind, whatever the extension
 * (`hero.png` blocks `hero.jpg`), because variant keys drop the original's extension. `path` is the
 * requested key. Maps to HTTP 409 with a suggested free name (`manhattan-keyframe-2`, then `-3`, ...).
 */
export class MediaNameConflictError extends MediaConflictError {
  readonly path: string;
  readonly suggestedName: string | null;
  readonly suggestedFilename: string | null;
  readonly suggestedPath: string | null;

  constructor(path: string, suggestion?: { name: string; filename: string; path: string }) {
    super(
      suggestion
        ? `Media name already taken: ${path} (suggested: ${suggestion.filename})`
        : `Media name already taken: ${path}`
    );
    this.name = 'MediaNameConflictError';
    this.path = path;
    this.suggestedName = suggestion?.name ?? null;
    this.suggestedFilename = suggestion?.filename ?? null;
    this.suggestedPath = suggestion?.path ?? null;
  }
}

/**
 * A create-only write hit an existing object: the filesystem equivalent of an S3 PUT with
 * `If-None-Match: *` failing. Originals are never overwritten. Maps to HTTP 412.
 */
export class MediaBlobExistsError extends Error {
  readonly code = 'MEDIA_BLOB_EXISTS' as const;

  constructor(readonly key: string) {
    super(`Object already exists: ${key}`);
    this.name = 'MediaBlobExistsError';
  }
}

/** A streamed upload went past its byte cap. Maps to HTTP 413. */
export class MediaBlobTooLargeError extends Error {
  readonly code = 'MEDIA_BLOB_TOO_LARGE' as const;

  constructor(readonly maxBytes: number) {
    super(`Object exceeds the maximum size of ${maxBytes} bytes`);
    this.name = 'MediaBlobTooLargeError';
  }
}

export class TransformerNotImplementedError extends Error {
  readonly code = 'TRANSFORMER_NOT_IMPLEMENTED' as const;

  constructor(kind: string) {
    super(`Transformer not implemented for kind: ${kind}`);
    this.name = 'TransformerNotImplementedError';
  }
}

export class RecipeValidationError extends Error {
  readonly code = 'RECIPE_VALIDATION' as const;

  constructor(message: string) {
    super(message);
    this.name = 'RecipeValidationError';
  }
}
