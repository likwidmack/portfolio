/**
 * HTTP mapping of domain errors, shared by every route kit (`@tgmc/media-nuxt`, `core/admin`).
 * The result feeds h3 `createError` directly, so `@tgmc/media` itself stays free of h3.
 */

import {
  MediaBlobExistsError,
  MediaBlobTooLargeError,
  MediaConflictError,
  MediaNameConflictError,
  MediaNotFoundError,
  RecipeValidationError,
} from './errors.js';

/** `data.code` of the 409 body for a taken name; `@tgmc/media-client` parses it back. */
export const NAME_CONFLICT_CODE = 'name_conflict' as const;

/** `data` of a name-conflict 409: the requested key plus a free name to offer (nulls when none found). */
export type NameConflictData = {
  code: typeof NAME_CONFLICT_CODE;
  path: string;
  suggestedName: string | null;
  suggestedFilename: string | null;
  suggestedPath: string | null;
};

export type MediaHttpError = {
  statusCode: 400 | 404 | 409 | 412 | 413;
  statusMessage: string;
  data?: NameConflictData;
};

/**
 * 404 not found, 400 validation, 409 conflict (a name conflict carries its suggestion in `data`),
 * 412 create-only write to an existing object, 413 upload over its byte cap.
 * `null` for errors that are not part of the media domain: rethrow those.
 */
export function mediaErrorToHttp(err: unknown): MediaHttpError | null {
  if (err instanceof MediaNameConflictError) {
    return {
      statusCode: 409,
      statusMessage: err.message,
      data: {
        code: NAME_CONFLICT_CODE,
        path: err.path,
        suggestedName: err.suggestedName,
        suggestedFilename: err.suggestedFilename,
        suggestedPath: err.suggestedPath,
      },
    };
  }
  if (err instanceof MediaConflictError) {
    return { statusCode: 409, statusMessage: err.message };
  }
  if (err instanceof MediaNotFoundError) {
    return { statusCode: 404, statusMessage: err.message };
  }
  if (err instanceof RecipeValidationError) {
    return { statusCode: 400, statusMessage: err.message };
  }
  if (err instanceof MediaBlobExistsError) {
    return { statusCode: 412, statusMessage: err.message };
  }
  if (err instanceof MediaBlobTooLargeError) {
    return { statusCode: 413, statusMessage: err.message };
  }
  return null;
}
