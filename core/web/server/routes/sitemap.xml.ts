import { defineEventHandler, setHeader } from 'h3';

const paths = [
  '/',
  '/work',
  '/work/media-systems',
  '/work/innovation-prototyping',
  '/work/human-controlled-ai-lab',
  '/work/spatial-experiences',
  '/work/data-visualization',
  '/work/experience-systems',
  '/ai-lab',
  '/process',
  '/about',
  '/blog',
];

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event);
  const siteUrl = String(config.public.siteUrl || 'http://localhost:4200').replace(/\/$/, '');
  setHeader(event, 'content-type', 'application/xml; charset=utf-8');
  const urls = paths.map((path) => `  <url><loc>${siteUrl}${path}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
});
