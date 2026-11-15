import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { brand } from '../config/brand';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

test('Brand configuration uses production hostname consistently', () => {
  assert.equal(brand.publicUrl, 'https://www.pixwora.store');
  assert.equal(brand.currency, 'INR');
  assert.equal(brand.locale, 'en-IN');
});

test('robots.txt exists and specifies sitemap and crawlers correctly', () => {
  const robotsPath = path.join(rootDir, 'public', 'robots.txt');
  assert.ok(fs.existsSync(robotsPath), 'public/robots.txt must exist');
  const content = fs.readFileSync(robotsPath, 'utf8');

  assert.ok(content.includes('User-agent: *'), 'Must include general user-agent');
  assert.ok(content.includes('Disallow: /admin'), 'Must disallow admin area');
  assert.ok(content.includes('Disallow: /account'), 'Must disallow account area');
  assert.ok(content.includes('Disallow: /checkout'), 'Must disallow checkout');
  assert.ok(content.includes('Disallow: /login'), 'Must disallow login');
  assert.ok(content.includes('Disallow: /api/'), 'Must disallow API routes');
  assert.ok(content.includes('User-agent: Googlebot'), 'Must explicitly welcome Googlebot');
  assert.ok(content.includes('Sitemap: https://www.pixwora.store/sitemap.xml'), 'Must declare production sitemap');
});

test('XML sitemap exists, is valid XML, and includes primary indexable URLs', () => {
  const sitemapPath = path.join(rootDir, 'public', 'sitemap.xml');
  assert.ok(fs.existsSync(sitemapPath), 'public/sitemap.xml must exist');
  const xml = fs.readFileSync(sitemapPath, 'utf8');

  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), 'Must start with XML declaration');
  assert.ok(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'), 'Must have sitemap namespace');
  assert.ok(xml.includes('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'), 'Must have image namespace');

  // Verify core URLs
  assert.ok(xml.includes('<loc>https://www.pixwora.store/</loc>'), 'Must include homepage');
  assert.ok(xml.includes('<loc>https://www.pixwora.store/shop?category=stickers</loc>'), 'Must include stickers shop');
  assert.ok(xml.includes('<loc>https://www.pixwora.store/shop?category=posters</loc>'), 'Must include posters shop');
  assert.ok(xml.includes('<loc>https://www.pixwora.store/create-your-stickers</loc>'), 'Must include custom stickers');
  assert.ok(xml.includes('<loc>https://www.pixwora.store/build-your-wall</loc>'), 'Must include wall builder');

  // Verify private pages are NEVER in sitemap
  assert.ok(!xml.includes('/admin'), 'Must never include admin in sitemap');
  assert.ok(!xml.includes('/account'), 'Must never include account in sitemap');
  assert.ok(!xml.includes('/checkout'), 'Must never include checkout in sitemap');

  // Verify image sitemap tags exist
  assert.ok(xml.includes('<image:image>'), 'Must include image tags for Google Images discovery');
  assert.ok(xml.includes('<image:loc>'), 'Must include image loc tags');
});

test('index.html contains complete head metadata and schema', () => {
  const indexPath = path.join(rootDir, 'index.html');
  const html = fs.readFileSync(indexPath, 'utf8');

  assert.ok(html.includes('<link rel="canonical" href="https://www.pixwora.store/" />'), 'Must contain canonical link');
  assert.ok(html.includes('<meta property="og:site_name" content="Pixwora" />'), 'Must contain OG site_name');
  assert.ok(html.includes('<meta property="og:type" content="website" />'), 'Must contain OG type');
  assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image" />'), 'Must contain Twitter card');
  assert.ok(html.includes('"@type": "Organization"'), 'Must contain Organization schema');
  assert.ok(html.includes('"@type": "WebSite"'), 'Must contain WebSite schema');
  assert.ok(html.includes('"@type": "SearchAction"'), 'Must contain SearchAction schema');
  assert.ok(html.includes('<h1>'), 'Must contain fallback H1 for crawlers');
});

test('Dynamic product handler serves 200 with schema for valid products and 404 with noindex for unknown slugs', async () => {
  const handler = (await import('../../api/product')).default;

  const mockResponse = () => {
    let statusCode = 200;
    const headers: Record<string, string> = {};
    let body = '';
    return {
      setHeader: (k: string, v: string) => {
        headers[k.toLowerCase()] = v;
      },
      status: (code: number) => {
        statusCode = code;
        return {
          send: (b: string) => {
            body = b;
          },
        };
      },
      getResult: () => ({ statusCode, headers, body }),
    };
  };

  // 1. Seed product test
  const resSeed = mockResponse();
  await handler({ url: '/api/product?slug=chai-first', query: { slug: 'chai-first' }, headers: { host: 'www.pixwora.store' } }, resSeed);
  const outSeed = resSeed.getResult();
  assert.equal(outSeed.statusCode, 200);
  assert.ok(outSeed.body.includes('<title>Chai First Sticker — Buy Online India | Pixwora</title>'));
  assert.ok(outSeed.body.includes('https://www.pixwora.store/product/chai-first'));
  assert.ok(outSeed.body.includes('"@type": "Product"'));
  assert.ok(outSeed.body.includes('"@type": "BreadcrumbList"'));
  assert.ok(outSeed.body.includes('<h1>Chai First Waterproof Vinyl Sticker</h1>'));

  // 2. Live Supabase product test
  const resLive = mockResponse();
  await handler({ url: '/api/product?slug=iron-man', query: { slug: 'iron-man' }, headers: { host: 'www.pixwora.store' } }, resLive);
  const outLive = resLive.getResult();
  assert.equal(outLive.statusCode, 200);
  assert.ok(outLive.body.includes('<title>iron man Sticker — Buy Online India | Pixwora</title>'));
  assert.ok(outLive.body.includes('"@type": "Product"'));

  // 3. Unknown non-existent product test
  const res404 = mockResponse();
  await handler({ url: '/api/product?slug=fake-product-does-not-exist-12345', query: { slug: 'fake-product-does-not-exist-12345' }, headers: { host: 'www.pixwora.store' } }, res404);
  const out404 = res404.getResult();
  assert.equal(out404.statusCode, 404);
  assert.ok(out404.headers['x-robots-tag']?.includes('noindex'));
  assert.ok(out404.body.includes('<meta name="robots" content="noindex, nofollow" />'));
  assert.ok(out404.body.includes('<title>Product Not Found — Pixwora</title>'));
});
