import { defineEventHandler, setHeader } from 'h3';

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event);
  const siteUrl = String(config.public.siteUrl || 'http://localhost:4200').replace(/\/$/, '');
  setHeader(event, 'content-type', 'text/plain; charset=utf-8');
  return `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${siteUrl}/sitemap.xml\n`;
});
