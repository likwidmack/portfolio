/**
 * GET /api/admin/session — token check for the sign-in form: `{ ok: true }` for the admin token, 401 otherwise.
 */
import { defineEventHandler } from 'h3';
import { checkAdminSession } from '../../utils/admin-handler';

export default defineEventHandler(checkAdminSession);
