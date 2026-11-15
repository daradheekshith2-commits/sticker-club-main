import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'https://www.pixwora.store';

function escapeXml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default async function handler(_req: any, res: any) {
  // Check if a pre-generated sitemap exists on disk
  const sitemapPaths = [
    path.join(process.cwd(), 'dist', 'sitemap.xml'),
    path.join(process.cwd(), 'public', 'sitemap.xml'),
  ];

  for (const sp of sitemapPaths) {
    if (fs.existsSync(sp)) {
      try {
        const content = fs.readFileSync(sp, 'utf8');
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
        return res.status(200).send(content);
      } catch {}
    }
  }

  // Fallback dynamic generation
  const today = new Date().toISOString().split('T')[0];
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

  const addUrl = (loc: string, priority = '0.8', changefreq = 'daily') => {
    xml += `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>\n`;
  };

  addUrl(`${BASE_URL}/`, '1.0', 'daily');
  addUrl(`${BASE_URL}/shop?category=stickers`, '0.9', 'daily');
  addUrl(`${BASE_URL}/shop?category=posters`, '0.9', 'daily');
  addUrl(`${BASE_URL}/create-your-stickers`, '0.9', 'weekly');
  addUrl(`${BASE_URL}/build-your-wall`, '0.9', 'weekly');
  addUrl(`${BASE_URL}/about`, '0.6', 'monthly');
  addUrl(`${BASE_URL}/faq`, '0.6', 'monthly');
  addUrl(`${BASE_URL}/contact`, '0.6', 'monthly');

  xml += '</urlset>\n';

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  res.status(200).send(xml);
}
