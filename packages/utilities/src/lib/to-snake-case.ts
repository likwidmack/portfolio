/**
 * Converts camelCase-ish strings into `snake_case` by inserting underscores
 * before uppercase runs, then lowercasing.
 *
 * @example
 * ```ts
 * toSnakeCase('fooBarBaz'); // 'foo_bar_baz'
 * ```
 */
export function toSnakeCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}

export default toSnakeCase;
