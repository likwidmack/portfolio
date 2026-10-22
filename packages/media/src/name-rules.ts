/** Name rules shared by the library: free-name suggestions and extension/mime agreement. */

import { MediaNameConflictError, RecipeValidationError } from './errors.js';
import { suggestMediaName } from './filename.js';
import { extensionForMime, extensionMatchesMime } from './kinds.js';
import { originalKey, type MediaNameRef } from './paths.js';
import type { CatalogStore } from './ports/index.js';

/** Highest numeric suffix tried when suggesting a free name. */
export const MAX_NAME_SUGGESTIONS = 1000;

/**
 * Name conflict for `ref` + `ext` with the first free `-2`, `-3`, ... suggestion. Suggestions are
 * checked by name (extension-free), the same unit that is unique.
 */
export async function nameConflictWithSuggestion(
  catalog: Pick<CatalogStore, 'getNameHolder'>,
  ref: MediaNameRef,
  ext: string
): Promise<MediaNameConflictError> {
  const path = originalKey({ ...ref, ext });
  for (let attempt = 2; attempt <= MAX_NAME_SUGGESTIONS; attempt += 1) {
    const name = suggestMediaName(ref.name, ext, attempt);
    if (!(await catalog.getNameHolder({ tenant: ref.tenant, kind: ref.kind, name }))) {
      return new MediaNameConflictError(path, {
        name,
        filename: `${name}.${ext}`,
        path: originalKey({ ...ref, name, ext }),
      });
    }
  }
  return new MediaNameConflictError(path);
}

/**
 * Reject a filename extension that contradicts the MIME type (`x.png` + `image/jpeg`), naming the
 * corrected filename. Unknown MIME types accept any extension.
 */
export function assertExtensionMatchesMime(name: string, ext: string, mime: string | null | undefined): void {
  if (!ext || !mime || extensionMatchesMime(ext, mime)) {
    return;
  }
  throw new RecipeValidationError(
    `Filename extension ".${ext}" does not match mime "${mime}"; use "${name}.${extensionForMime(mime)}"`
  );
}
