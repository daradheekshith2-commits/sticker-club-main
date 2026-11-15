import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = 'https://www.pixwora.store';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://iarclkcnxpbbxxpfwamd.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_WoCLL6yGouN7AtxgjRgqHg_VzBi89Ab';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// In-memory cache for live product lookups to keep response TTFB under 50ms
const productCache = new Map<string, { product: any; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory cache

export default async function handler(req: any, res: any) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const slug = (req.query?.slug || url.searchParams.get('slug') || '').toString().trim().toLowerCase();

  if (!slug) {
    return send404(res, 'Product Not Found');
  }

  let product: any = null;

  // 1. Check in-memory cache
  const cached = productCache.get(slug);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    product = cached.product;
  }

  // 2. Fetch from Supabase (source of truth for live products)
  if (!product) {
    try {
      const { data, error } = await supabase
        .from('Product')
        .select('*, images:ProductImage(*), variants:ProductVariant(*)')
        .eq('slug', slug)
        .maybeSingle();

      if (!error && data) {
        product = data;
        productCache.set(slug, { product, timestamp: Date.now() });
      }
    } catch (e) {
      console.warn('Supabase product query error:', e);
    }
  }

  // 3. Fallback to seed products & catalogue snapshot if Supabase did not find it
  if (!product) {
    const candidateFiles = [
      path.join(process.cwd(), 'public', 'seed-products.json'),
      path.join(process.cwd(), 'public', 'products-catalogue.json'),
    ];
    for (const f of candidateFiles) {
      if (fs.existsSync(f)) {
        try {
          const list = JSON.parse(fs.readFileSync(f, 'utf8'));
          const match = list.find((p: any) => p.slug === slug);
          if (match) {
            product = match;
            productCache.set(slug, { product, timestamp: Date.now() });
            break;
          }
        } catch {}
      }
    }
  }

  // 4. Validate product active & published status
  if (!product || product.status !== 'PUBLISHED' || product.active === false) {
    return send404(res, 'Product Not Found');
  }

  // 5. Construct SEO Metadata
  const isPoster = product.category === 'posters' || product.productType === 'poster';
  const prodTypeLabel = isPoster ? 'Wall Poster' : 'Waterproof Vinyl Sticker';
  const pageTitle = `${product.name} ${isPoster ? 'Wall Poster' : 'Sticker'} — Buy Online India | Pixwora`;
  const cleanDesc = product.shortDescription || (product.description ? product.description.slice(0, 155) : `Buy ${product.name} ${prodTypeLabel} online at Pixwora. Premium quality, student-run brand from Hyderabad.`);
  const metaDescription = `Buy ${product.name} ${prodTypeLabel} online at Pixwora. ${cleanDesc} Waterproof finish. Genuine INR ₹${product.price}. Fast shipping across India.`;
  const canonicalUrl = `${BASE_URL}/product/${product.slug}`;

  // Image URL
  const rawImg = product.images?.[0]?.url || product.images?.[0]?.src || '/logo.jpeg';
  const fullImgUrl = rawImg.startsWith('http') ? rawImg : `${BASE_URL}${rawImg.startsWith('/') ? '' : '/'}${rawImg}`;

  // Structured Data (Product + BreadcrumbList)
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        '@id': `${canonicalUrl}#product`,
        name: `${product.name} ${isPoster ? 'Wall Poster' : 'Sticker'}`,
        url: canonicalUrl,
        description: product.description || product.shortDescription || metaDescription,
        sku: product.id,
        image: [fullImgUrl],
        brand: {
          '@type': 'Brand',
          name: 'Pixwora',
        },
        category: isPoster ? 'Wall Posters' : 'Stickers',
        offers: {
          '@type': 'Offer',
          url: canonicalUrl,
          priceCurrency: 'INR',
          price: String(product.price),
          priceValidUntil: '2027-12-31',
          itemCondition: 'https://schema.org/NewCondition',
          availability: 'https://schema.org/InStock',
          seller: {
            '@type': 'Organization',
            name: 'Pixwora',
          },
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumbs`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${BASE_URL}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: isPoster ? 'Wall Posters' : 'Stickers',
            item: isPoster ? `${BASE_URL}/shop?category=posters` : `${BASE_URL}/shop?category=stickers`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: product.name,
            item: canonicalUrl,
          },
        ],
      },
    ],
  };

  // 6. Template HTML
  let template = getHtmlTemplate();

  template = template.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`);
  template = template.replace(/<meta\s+name=["']description["'][^>]*content=["'][^"']*["'][^>]*>/i, `<meta name="description" content="${escapeHtml(metaDescription)}" />`);
  template = template.replace(/<link\s+rel=["']canonical["'][^>]*href=["'][^"']*["'][^>]*>/i, `<link rel="canonical" href="${canonicalUrl}" />`);
  template = template.replace(/<meta\s+property=["']og:title["'][^>]*content=["'][^"']*["'][^>]*>/i, `<meta property="og:title" content="${escapeHtml(pageTitle)}" />`);
  template = template.replace(/<meta\s+property=["']og:description["'][^>]*content=["'][^"']*["'][^>]*>/i, `<meta property="og:description" content="${escapeHtml(metaDescription)}" />`);
  template = template.replace(/<meta\s+property=["']og:url["'][^>]*content=["'][^"']*["'][^>]*>/i, `<meta property="og:url" content="${canonicalUrl}" />`);
  template = template.replace(/<meta\s+property=["']og:image["'][^>]*content=["'][^"']*["'][^>]*>/i, `<meta property="og:image" content="${escapeHtml(fullImgUrl)}" />`);
  template = template.replace(/<meta\s+name=["']twitter:title["'][^>]*content=["'][^"']*["'][^>]*>/i, `<meta name="twitter:title" content="${escapeHtml(pageTitle)}" />`);
  template = template.replace(/<meta\s+name=["']twitter:description["'][^>]*content=["'][^"']*["'][^>]*>/i, `<meta name="twitter:description" content="${escapeHtml(metaDescription)}" />`);
  template = template.replace(/<meta\s+name=["']twitter:image["'][^>]*content=["'][^"']*["'][^>]*>/i, `<meta name="twitter:image" content="${escapeHtml(fullImgUrl)}" />`);

  // Inject JSON-LD Schema
  const schemaScript = `\n    <script id="pixwora-page-ld-json" type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n    </script>\n`;
  template = template.replace('</head>', `${schemaScript}</head>`);

  // Inject semantic HTML inside <div id="root"> for crawlers
  const semanticRoot = `
    <div id="root">
      <main style="padding: 2rem; max-width: 1200px; margin: 0 auto; font-family: sans-serif;">
        <nav aria-label="Breadcrumb">
          <a href="/">Home</a> &gt;
          <a href="/shop?category=${isPoster ? 'posters' : 'stickers'}">${isPoster ? 'Wall Posters' : 'Stickers'}</a> &gt;
          <span>${escapeHtml(product.name)}</span>
        </nav>
        <h1>${escapeHtml(product.name)} ${escapeHtml(prodTypeLabel)}</h1>
        <img src="${escapeHtml(fullImgUrl)}" alt="${escapeHtml(product.name)} - ${escapeHtml(prodTypeLabel)} Pixwora" style="max-width: 400px; width: 100%; height: auto;" />
        <p>${escapeHtml(product.description || product.shortDescription || '')}</p>
        <p><strong>Price:</strong> ₹${product.price} (INR)</p>
        <p><strong>Brand:</strong> Pixwora (Hyderabad, India)</p>
        <p><strong>Availability:</strong> In Stock</p>
        <p><a href="/shop?category=${isPoster ? 'posters' : 'stickers'}">Explore more ${isPoster ? 'wall posters' : 'laptop stickers'}</a></p>
      </main>
    </div>`;

  template = template.replace(/<div id="root">[\s\S]*?<\/div>/i, semanticRoot);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(template);
}

function send404(res: any, _reason?: string) {
  let template = getHtmlTemplate();
  template = template.replace(/<title>.*?<\/title>/i, `<title>Product Not Found — Pixwora</title>`);
  template = template.replace(/<head>/i, `<head>\n    <meta name="robots" content="noindex, nofollow" />`);

  const root404 = `
    <div id="root">
      <main style="padding: 3rem 1.5rem; max-width: 800px; margin: 0 auto; text-align: center; font-family: sans-serif;">
        <h1>Product Not Found</h1>
        <p>We couldn't find the product you're looking for. It may have been discontinued or removed.</p>
        <p><a href="/shop" style="display: inline-block; padding: 0.75rem 1.5rem; background: #FF1026; color: white; text-decoration: none; border-radius: 9999px; font-weight: bold; margin-top: 1rem;">Back to the Shop</a></p>
      </main>
    </div>`;

  template = template.replace(/<div id="root">[\s\S]*?<\/div>/i, root404);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=600');
  res.status(404).send(template);
}

function getHtmlTemplate(): string {
  const candidates = [
    path.join(process.cwd(), 'dist', 'index.html'),
    path.join(process.cwd(), 'index.html'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        return fs.readFileSync(p, 'utf8');
      } catch {}
    }
  }

  // Pure fallback if filesystem cannot be read
  return `<!doctype html>
<html lang="en-IN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/jpeg" href="/logo.jpeg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PIXWORA — Original Stickers & Posters</title>
    <meta name="description" content="Original stickers and posters for students from Hyderabad." />
    <link rel="canonical" href="https://www.pixwora.store/" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
}
