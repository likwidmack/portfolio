/**
 * GET /api/messages — list contact messages (admin Bearer token required).
 */
import { requireAdminToken } from '@tgmc/web-layer-admin/server/utils/admin-auth';
import { defineEventHandler } from 'h3';
import { getMessageStore } from '../../db';
import { listContactMessages } from './service';
import { messageStoreOptionsFromRuntimeConfig } from './store-options';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  requireAdminToken(event, config.adminToken);

  const store = getMessageStore(messageStoreOptionsFromRuntimeConfig(config));
  return listContactMessages(store);
});
