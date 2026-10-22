/**
 * Sign-in page copy for a failed token check (`verifyAdminToken`).
 */
import { fetchErrorMessage, fetchErrorStatus } from './fetch-error';

const GENERIC_UNAUTHORIZED = 'Unauthorized';

/** A 401: the server's reason when it gives one (e.g. no ADMIN_TOKEN configured), else the wrong-token line. */
export function rejectedTokenMessage(statusMessage?: string): string {
  const reason = statusMessage?.trim();
  return reason && reason !== GENERIC_UNAUTHORIZED ? reason : 'That token is not valid for this environment.';
}

/** Any other failure: no response, a server error (5xx) or another refusal — each worded differently. */
export function signInErrorMessage(error: unknown): string {
  const status = fetchErrorStatus(error);
  if (!status) return 'Could not reach the admin server — try again.';
  const reason = fetchErrorMessage(error)?.trim();
  const detail = reason ? `: ${reason}` : '';
  if (status >= 500) return `The admin server failed (${status}${detail}) — check its logs, then try again.`;
  return `The admin server refused the check (${status}${detail}).`;
}
