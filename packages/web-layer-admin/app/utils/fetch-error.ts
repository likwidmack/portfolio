/** Status / message from a `$fetch` (ofetch) error, if present. */
type FetchErrorShape = { statusCode?: number; statusMessage?: string };

const asFetchError = (error: unknown): FetchErrorShape =>
  error && typeof error === 'object' ? (error as FetchErrorShape) : {};

export const fetchErrorStatus = (error: unknown): number | undefined => asFetchError(error).statusCode;

export const fetchErrorMessage = (error: unknown): string | undefined => asFetchError(error).statusMessage;
