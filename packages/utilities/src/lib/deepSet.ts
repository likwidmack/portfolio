/**
 * Concatenates `rootArray` with additional arrays and returns unique values
 * (via `Set` insertion order).
 *
 * **Not** a nested path / property setter — name is historical. Use only for
 * unique array merges (including from {@link deepAssign}).
 *
 * @param rootArray - Starting array
 * @param arrays - Additional arrays to flatten and merge
 * @returns A new array of unique values
 *
 * @example
 * ```ts
 * deepSet([1, 2], [2, 3]); // [1, 2, 3]
 * ```
 */
export default (rootArray: any[], ...arrays: any[][]) => {
  const merged = [...rootArray, ...arrays.flat()];
  return [...new Set(merged)];
};
