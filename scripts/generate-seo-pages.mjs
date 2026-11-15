import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const BASE_URL = 'https://www.pixwora.store';
const TODAY = new Date().toISOString().split('T')[0];

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function generateSitemapAndPages() {
  console.log('Generating Pixwora XML Sitemap and SEO Prerendered Shells...');

  const cataloguePath = path.join(rootDir, 'public', 'products-catalogue.json');
  let products = [];
  if (fs.existsSync(cataloguePath)) {
    try {
      products = JSON.parse(fs.readFileSync(cataloguePath, 'utf8'));
    } catch (e) {
      console.warn('Could not parse products-catalogue.json:', e);
    }
  }

  // Also try fetching newly added live products from Supabase if network is available
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://iarclkcnxpbbxxpfwamd.supabase.co';
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_WoCLL6yGouN7AtxgjRgqHg_VzBi89Ab';
    const supabase = createClient(supabaseUrl, supabaseKey);

    let from = 0;
    const step = 1000;
    const dbMap = new Map();
    while (true) {
      const { data, error } = await supabase
        .from('Product')
        .select('id, slug, name, description, price, status, active, category, productType, images:ProductImage(*)')
        .range(from, from + step - 1);
      if (error || !data || data.length === 0) break;
      for (const p of data) {
        dbMap.set(p.slug, p);
      }
      if (data.length < step) break;
      from += step;
    }

    if (dbMap.size > 0) {
      console.log(`Synced ${dbMap.size} live products from Supabase.`);
      // Live Supabase database is the single source of truth for real, purchasable products
      products = Array.from(dbMap.values());
    }
  } catch (err) {
    console.log('Notice: Supabase live sync skipped or offline, using local catalogue snapshot.', err.message);
  }

  // Filter only published and active products
  const publishedProducts = products.filter((p) => p.status === 'PUBLISHED' && p.active !== false);
  console.log(`Total published products eligible for sitemap: ${publishedProducts.length}`);

  // Build XML Sitemap
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ';
  xml += 'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

  const addUrl = (loc, priority = '0.8', changefreq = 'daily', images = []) => {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(loc)}</loc>\n`;
    xml += `    <lastmod>${TODAY}</lastmod>\n`;
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

  // 2. Core Shop & Category Landing Pages (2 URLs)
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

  // 5. Individual Published Product Pages with Image Sitemaps
  for (const p of publishedProducts) {
    const isPoster = p.category === 'posters' || p.productType === 'poster';
    const prodImages = [];
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

  // 6. Policy & Info Pages
  addUrl(`${BASE_URL}/about`, '0.6', 'monthly');
  addUrl(`${BASE_URL}/faq`, '0.6', 'monthly');
  addUrl(`${BASE_URL}/contact`, '0.6', 'monthly');
  addUrl(`${BASE_URL}/shipping`, '0.5', 'monthly');
  addUrl(`${BASE_URL}/returns`, '0.5', 'monthly');
  addUrl(`${BASE_URL}/terms`, '0.5', 'monthly');
  addUrl(`${BASE_URL}/privacy`, '0.5', 'monthly');

  xml += '</urlset>\n';

  // Write to public/sitemap.xml
  const publicSitemap = path.join(rootDir, 'public', 'sitemap.xml');
  fs.writeFileSync(publicSitemap, xml, 'utf8');
  console.log(`Wrote sitemap to ${publicSitemap}`);

  // Write to dist/sitemap.xml if dist exists
  const distDir = path.join(rootDir, 'dist');
  if (fs.existsSync(distDir)) {
    const distSitemap = path.join(distDir, 'sitemap.xml');
    fs.writeFileSync(distSitemap, xml, 'utf8');
    console.log(`Wrote sitemap to ${distSitemap}`);

    // Copy public/robots.txt to dist/robots.txt
    const publicRobots = path.join(rootDir, 'public', 'robots.txt');
    const distRobots = path.join(distDir, 'robots.txt');
    if (fs.existsSync(publicRobots)) {
      fs.copyFileSync(publicRobots, distRobots);
      console.log(`Copied robots.txt to ${distRobots}`);
    }

    // Pre-render static pages in dist/
    const baseHtmlPath = path.join(distDir, 'index.html');
    if (fs.existsSync(baseHtmlPath)) {
      const templateHtml = fs.readFileSync(baseHtmlPath, 'utf8');

      const prerenderPage = (subPath, title, desc, h1, canonicalPath) => {
        const outDir = path.join(distDir, subPath);
        fs.mkdirSync(outDir, { recursive: true });
        const targetFile = path.join(outDir, 'index.html');

        let html = templateHtml;
        html = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
        html = html.replace(/<meta\s+name=["']description["'][^>]*content=["'][^"']*["'][^>]*>/i, `<meta name="description" content="${desc}" />`);
        html = html.replace(/<link\s+rel=["']canonical["'][^>]*href=["'][^"']*["'][^>]*>/i, `<link rel="canonical" href="${BASE_URL}${canonicalPath}" />`);
        html = html.replace(/<meta\s+property=["']og:title["'][^>]*content=["'][^"']*["'][^>]*>/i, `<meta property="og:title" content="${title}" />`);
        html = html.replace(/<meta\s+property=["']og:description["'][^>]*content=["'][^"']*["'][^>]*>/i, `<meta property="og:description" content="${desc}" />`);
        html = html.replace(/<meta\s+property=["']og:url["'][^>]*content=["'][^"']*["'][^>]*>/i, `<meta property="og:url" content="${BASE_URL}${canonicalPath}" />`);

        // Update semantic fallback root content
        const rootContent = `
    <div id="root">
      <main style="padding: 2rem; max-width: 1200px; margin: 0 auto; font-family: sans-serif;">
        <nav aria-label="Breadcrumbs"><a href="/">Home</a> &gt; <span>${h1}</span></nav>
        <h1>${h1}</h1>
        <p>${desc}</p>
        <nav aria-label="Explore"><a href="/shop?category=stickers">Stickers</a> | <a href="/shop?category=posters">Posters</a> | <a href="/create-your-stickers">Create Custom Stickers</a></nav>
      </main>
    </div>`;

        html = html.replace(/<div id="root">[\s\S]*?<\/div>/i, rootContent);
        fs.writeFileSync(targetFile, html, 'utf8');
      };

      prerenderPage(
        'shop',
        'Buy Original Stickers & Wall Posters Online India | Pixwora',
        'Browse Pixwora full catalogue of waterproof laptop stickers, anime vinyl decals, and 300 GSM room wall posters in India. Student-run brand from Hyderabad.',
        'Shop Stickers & Wall Posters',
        '/shop'
      );

      prerenderPage(
        'create-your-stickers',
        'Custom Stickers Online India — Print Your Own Vinyl Stickers | Pixwora',
        'Upload your artwork and print custom waterproof vinyl stickers with live 3D preview, custom shapes, sizes and matte or glossy finishes from Pixwora Hyderabad.',
        'Custom Sticker Printing Online India',
        '/create-your-stickers'
      );

      prerenderPage(
        'build-your-wall',
        'Build Your Own Wall Collage Kit India — Custom Room Poster Packs | Pixwora',
        'Design and arrange your aesthetic wall collage with Pixwora. Mix anime art, movie prints and your own photos in A5, A4 and A3 sizes with live layout preview.',
        'Build Your Room Wall Collage',
        '/build-your-wall'
      );

      prerenderPage(
        'about',
        'About Pixwora — Student-Run Sticker & Wall Poster Brand in Hyderabad',
        'Learn the story behind Pixwora. A student-run brand from Hyderabad creating original waterproof vinyl stickers and premium wall posters.',
        'About Pixwora',
        '/about'
      );

      prerenderPage(
        'faq',
        'FAQ — Frequently Asked Questions | Pixwora Store',
        'Answers to common questions about Pixwora stickers, wall posters, waterproof materials, payment methods and shipping across India.',
        'Frequently Asked Questions',
        '/faq'
      );

      prerenderPage(
        'contact',
        'Contact Us | Pixwora Hyderabad',
        'Get in touch with Pixwora for custom orders, bulk queries, or feedback. WhatsApp, email and Instagram support available.',
        'Contact Pixwora',
        '/contact'
      );

      prerenderPage(
        'reviews',
        'Customer Reviews & Real Photos | Pixwora Store',
        'See real customer reviews and photos of Pixwora waterproof stickers and room wall posters from students across India.',
        'Customer Reviews & Photos',
        '/reviews'
      );

      prerenderPage(
        'vibes',
        'Shop Stickers & Wall Posters by Vibe | Pixwora',
        'Find stickers and posters by your favorite themes: Anime, Movies, Superheroes, Cars & Bikes, Aesthetic, Gaming and K-Pop at Pixwora.',
        'Shop Stickers & Posters by Vibe',
        '/vibes'
      );

      console.log('Successfully pre-rendered static HTML landing pages in dist/');
    }
  }
}

generateSitemapAndPages();
