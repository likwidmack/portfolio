/**
 * Example Nitro GET handler (`/api/greet`): returns `{ message }` interpolated from optional `name` query string.
 */
import { defineEventHandler, getQuery } from 'h3';

export default defineEventHandler((event) => {
  // `getQuery` returns a loose object of parsed query parameters. This handler
  // intentionally accepts any `name` value and falls back to 'World' when
  // omitted. Example: GET /api/greet?name=Tamara -> { message: 'Hello Tamara' }
  const q = getQuery(event);
  const projectName = q.name || 'World';

  return {
    message: `Hello ${projectName}`,
  };
});
