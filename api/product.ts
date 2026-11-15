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
  let dbResponded = false;
  let dbError = false;

  // 1. Check in-memory cache
  const cached = productCache.get(slug);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    product = cached.product;
  }

  // 2. Fetch from Supabase (sole authoritative source of truth for published product eligibility)
  if (!product) {
    try {
      const { data, error } = await supabase
        .from('Product')
        .select('*, inventory:Inventory(quantity), images:ProductImage(*), variants:ProductVariant(*)')
        .eq('slug', slug)
        .maybeSingle();

      if (error) {
        dbError = true;
        console.warn('Supabase query error:', error.message);
      } else {
        dbResponded = true;
        if (data) {
          product = data;
          productCache.set(slug, { product, timestamp: Date.now() });
        }
      }
    } catch (e: any) {
      dbError = true;
      console.warn('Supabase network exception / outage:', e?.message || e);
    }
  }

  // 3. Authoritative DB decision:
  // If the live database responded and found no record, this product is GENUINELY not found.
  // We NEVER resurrect deleted or unpublished legacy products from static catalogue snapshots.
  if (dbResponded && !product) {
    return send404(res, 'Product Not Found');
  }

  // 4. Database Outage Disaster Recovery:
  // ONLY in the event of an active database connection error or network outage, check seed products
  if (dbError && !product) {
    const seedFile = path.join(process.cwd(), 'public', 'seed-products.json');
    if (fs.existsSync(seedFile)) {
      try {
        const list = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
        const match = list.find((p: any) => p.slug === slug);
        if (match && match.status === 'PUBLISHED' && match.active !== false) {
          product = match;
        }
      } catch {}
    }

    if (!product) {
      return sendServiceUnavailable(res, 'Database temporarily unavailable');
    }
  }

  // 5. Validate product active & published status
  if (!product || product.status !== 'PUBLISHED' || product.active === false) {
    return send404(res, 'Product Not Found');
  }

  // 6. Construct Accurate SEO Metadata matching genuine product specs
  const isPoster = product.category === 'posters' || product.productType === 'poster';
  const prodTypeLabel = isPoster
    ? 'Wall Poster'
    : product.productType === 'sheet'
    ? 'Sticker Sheet'
    : product.productType === 'pack'
    ? 'Sticker Pack'
    : 'Waterproof Vinyl Sticker';

  const pageTitle = `${product.name} ${isPoster ? 'Wall Poster' : 'Sticker'} — Buy Online India | Pixwora`;

  // Material & Finish: Posters are 300 GSM matte cardstock; stickers are waterproof vinyl
  const materialClaim = isPoster
    ? 'Printed on 300 GSM archival matte cardstock with rich color reproduction.'
    : 'Printed on waterproof die-cut vinyl with durable scratch-resistant lamination.';

  // Stock Availability: verified against inventory relation
  const inStock = product.inventory ? product.inventory.quantity > 0 : true;
  const availabilitySchema = inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
  const stockLabel = inStock ? 'In Stock' : 'Currently Out of Stock';

  const cleanDesc = product.shortDescription || (product.description ? product.description.slice(0, 140) : `Buy ${product.name} online at Pixwora. Student-run brand from Hyderabad.`);
  const metaDescription = `Buy ${product.name} ${prodTypeLabel} online at Pixwora. ${cleanDesc} ${materialClaim} Genuine INR ₹${product.price}. Dispatches in 24–48 hours across India.`;
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
          availability: availabilitySchema,
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

  // 7. Template HTML
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
        <p><strong>Availability:</strong> ${stockLabel}</p>
        <p><strong>Material:</strong> ${isPoster ? '300 GSM Archival Matte Cardstock' : 'Waterproof Vinyl'}</p>
        <p><strong>Delivery:</strong> Dispatches within 24–48 hours. Pan-India shipping to 24,000+ PIN codes.</p>
        <p><a href="/shop?category=${isPoster ? 'posters' : 'stickers'}">Explore more ${isPoster ? 'wall posters' : 'laptop stickers'}</a></p>
      </main>
    </div>`;

  template = template.replace(/<div id="root">[\s\S]*?<\/div>/i, semanticRoot);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (dbError) {
    // During database outages, do not cache responses on edge so recovery is immediate
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  }
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

function sendServiceUnavailable(res: any, _reason?: string) {
  let template = getHtmlTemplate();

  template = template.replace(/<title>.*?<\/title>/i, `<title>Service Temporarily Unavailable — Pixwora</title>`);
  template = template.replace(/<head>/i, `<head>\n    <meta name="robots" content="noindex, nofollow" />`);

  const root503 = `
    <div id="root">
      <main style="padding: 3rem 1.5rem; max-width: 800px; margin: 0 auto; text-align: center; font-family: sans-serif;">
        <h1>Service Temporarily Unavailable</h1>
        <p>Our catalogue service is undergoing scheduled maintenance. Please refresh in a moment.</p>
      </main>
    </div>`;

  template = template.replace(/<div id="root">[\s\S]*?<\/div>/i, root503);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.status(503).send(template);
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
