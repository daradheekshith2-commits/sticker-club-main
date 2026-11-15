import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = 'https://www.pixwora.store';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://iarclkcnxpbbxxpfwamd.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_WoCLL6yGouN7AtxgjRgqHg_VzBi89Ab';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function escapeXml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// In-memory cache for the generated sitemap (1 hour TTL)
let cachedSitemapXml: string | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export default async function handler(_req: any, res: any) {
  const now = Date.now();

  // 1. Check in-memory cache
  if (cachedSitemapXml && now - lastCacheTime < CACHE_TTL_MS) {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(cachedSitemapXml);
  }

  // 2. Try generating fresh sitemap from live Supabase to automatically pick up newly published products
  try {
    let allProducts: any[] = [];
    let from = 0;
    const step = 1000;

    while (true) {
      const { data, error } = await supabase
        .from('Product')
        .select('slug, name, category, productType, images:ProductImage(url)')
        .eq('status', 'PUBLISHED')
        .eq('active', true)
        .range(from, from + step - 1);

      if (error || !data || data.length === 0) break;
      allProducts = allProducts.concat(data);
      if (data.length < step) break;
      from += step;
    }

    if (allProducts.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

      const addUrl = (loc: string, priority = '0.8', changefreq = 'daily', images: Array<{ src: string; title?: string }> = []) => {
        xml += '  <url>\n';
        xml += `    <loc>${escapeXml(loc)}</loc>\n`;
        xml += `    <lastmod>${today}</lastmod>\n`;
        xml += `    <changefreq>${changefreq}</changefreq>\n`;
        xml += `    <priority>${priority}</priority>\n`;
        for (const img of images) {
          if (img && img.src) {
            const fullSrc = img.src.startsWith('http') ? img.src : `${BASE_URL}${img.src.startsWith('/') ? '' : '/'}${img.src}`;
            xml += '    <image:image>\n';
            xml += `      <image:loc>${escapeXml(fullSrc)}</image:loc>\n`;
            if (img.title) {
              xml += `      <image:title>${escapeXml(img.title)}</image:title>\n`;
            }
            xml += '    </image:image>\n';
          }
        }
        xml += '  </url>\n';
      };

      // 1. Homepage
      addUrl(`${BASE_URL}/`, '1.0', 'daily', [
        { src: `${BASE_URL}/logo.jpeg`, title: 'Pixwora Store Logo' },
      ]);

      // 2. Core Shop Hubs (2 URLs)
      addUrl(`${BASE_URL}/shop?category=stickers`, '0.9', 'daily');
      addUrl(`${BASE_URL}/shop?category=posters`, '0.9', 'daily');

      // 3. Creative Builders (2 URLs)
      addUrl(`${BASE_URL}/create-your-stickers`, '0.9', 'weekly');
      addUrl(`${BASE_URL}/build-your-wall`, '0.9', 'weekly');

      // 4. Special Collection & Community Landing Pages (7 URLs)
      addUrl(`${BASE_URL}/build-your-pack`, '0.8', 'weekly');
      addUrl(`${BASE_URL}/matching-duos`, '0.8', 'weekly');
      addUrl(`${BASE_URL}/secret-messages`, '0.8', 'weekly');
      addUrl(`${BASE_URL}/collectibles`, '0.8', 'weekly');
      addUrl(`${BASE_URL}/rare-collections`, '0.8', 'weekly');
      addUrl(`${BASE_URL}/vibes`, '0.8', 'weekly');
      addUrl(`${BASE_URL}/reviews`, '0.8', 'daily');

      // 5. Category Vibe Landing Views (14 URLs: 9 stickers + 5 posters)
      const stickerVibes = ['anime', 'cute', 'quotes', 'gaming', 'movies', 'marvel', 'bts', 'devotion', 'sports'];
      for (const v of stickerVibes) {
        addUrl(`${BASE_URL}/shop?category=stickers&vibe=${v}`, '0.8', 'daily');
      }

      const posterVibes = ['anime', 'movies', 'quotes', 'music', 'motivation'];
      for (const v of posterVibes) {
        addUrl(`${BASE_URL}/shop?category=posters&vibe=${v}`, '0.8', 'daily');
      }

      // 6. Formats (3 URLs)
      addUrl(`${BASE_URL}/shop?category=stickers&type=pack`, '0.8', 'daily');
      addUrl(`${BASE_URL}/shop?category=stickers&type=sheet`, '0.8', 'daily');
      addUrl(`${BASE_URL}/shop?category=posters&type=poster-set`, '0.8', 'daily');

      // 7. Individual Published Product Pages with Image Sitemaps
      for (const p of allProducts) {
        const isPoster = p.category === 'posters' || p.productType === 'poster';
        const prodImages: Array<{ src: string; title?: string }> = [];
        if (p.images && p.images.length > 0) {
          for (const img of p.images.slice(0, 3)) {
            const src = img.url || img.src;
            if (src) {
              prodImages.push({
                src,
                title: `${p.name} ${isPoster ? 'Wall Poster' : 'Waterproof Vinyl Sticker'} - Pixwora`,
              });
            }
          }
        }
        addUrl(`${BASE_URL}/product/${p.slug}`, '0.7', 'weekly', prodImages);
      }

      // 8. Policy & Info Pages (7 URLs)
      addUrl(`${BASE_URL}/about`, '0.6', 'monthly');
      addUrl(`${BASE_URL}/faq`, '0.6', 'monthly');
      addUrl(`${BASE_URL}/contact`, '0.6', 'monthly');
      addUrl(`${BASE_URL}/shipping`, '0.5', 'monthly');
      addUrl(`${BASE_URL}/returns`, '0.5', 'monthly');
      addUrl(`${BASE_URL}/terms`, '0.5', 'monthly');
      addUrl(`${BASE_URL}/privacy`, '0.5', 'monthly');

      xml += '</urlset>\n';

      cachedSitemapXml = xml;
      lastCacheTime = now;

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).send(xml);
    }
  } catch (err) {
    console.warn('Dynamic sitemap live generation notice:', err);
  }

  // 3. Fallback: serve pre-generated sitemap on disk if Supabase live query failed
  const sitemapPaths = [
    path.join(process.cwd(), 'dist', 'sitemap.xml'),
    path.join(process.cwd(), 'public', 'sitemap.xml'),
  ];

  for (const sp of sitemapPaths) {
    if (fs.existsSync(sp)) {
      try {
        const content = fs.readFileSync(sp, 'utf8');
        cachedSitemapXml = content;
        lastCacheTime = now;
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
        return res.status(200).send(content);
      } catch {}
    }
  }

  // 4. Ultimate static fallback if disk files are unreadable
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  res.status(200).send('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://www.pixwora.store/</loc></url>\n</urlset>');
}
