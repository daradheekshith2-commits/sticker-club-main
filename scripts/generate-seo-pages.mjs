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

function formatLastMod(rawDate) {
  if (!rawDate) return null;
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  } catch {
    return null;
  }
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
        .select('id, slug, name, description, price, status, active, category, productType, createdAt, updatedAt, images:ProductImage(*)')
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

  const addUrl = (loc, priority = '0.8', changefreq = 'daily', images = [], lastmod = null) => {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(loc)}</loc>\n`;
    if (lastmod) {
      xml += `    <lastmod>${escapeXml(lastmod)}</lastmod>\n`;
    }
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

  // 5. Individual Published Product Pages with Image Sitemaps and genuine lastmod
  for (const p of publishedProducts) {
    const isPoster = p.category === 'posters' || p.productType === 'poster';
    const prodImages = [];
    if (p.images && p.images.length > 0) {
      for (const img of p.images.slice(0, 3)) {
        const src = img.url || img.src;
        if (src) {
          prodImages.push({
            src,
            title: `${p.name} ${isPoster ? '300 GSM Matte Wall Poster' : 'Waterproof Vinyl Sticker'} - Pixwora`,
          });
        }
      }
    }
    const genuineLastMod = formatLastMod(p.updatedAt || p.createdAt);
    addUrl(`${BASE_URL}/product/${p.slug}`, '0.7', 'weekly', prodImages, genuineLastMod);
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

      const storeFaqs = [
        {
          q: 'What makes Pixwora stickers waterproof and durable?',
          a: 'Every Pixwora sticker is printed on premium heavy-duty vinyl with a protective matte lamination. This makes them 100% waterproof, scratch-resistant, fade-proof under sunlight, and completely residue-free when peeled from laptops, water bottles, phones, and bike helmets.',
        },
        {
          q: 'What poster sizes do you offer and what paper is used?',
          a: 'Pixwora wall posters come in three standard international sizes: A5 (14.8 × 21 cm / 5.8 × 8.3 in), A4 (21 × 29.7 cm / 8.3 × 11.7 in), and A3 (29.7 × 42 cm / 11.7 × 16.5 in). All posters are printed on heavy 300 GSM archival matte art cardstock with deep, non-reflective color reproduction designed for framing or tape mounting.',
        },
        {
          q: 'How does "Create Your Own" custom sticker printing work?',
          a: 'Upload your own image, illustration, or photo in our custom sticker studio. Choose precision contour die-cut or geometric shapes, select standard 5cm × 5cm (₹20), 6cm × 6cm (₹25), or enter custom dimensions with instant automated pricing. We review every uploaded file for print resolution before printing on waterproof vinyl.',
        },
        {
          q: 'Where is Pixwora based and how long does delivery take across India?',
          a: 'Pixwora is an independent, student-run creative studio based in Hyderabad, Telangana, India. Orders are printed, precision cut, and securely packed in rigid bend-proof mailers within 24 to 48 hours. Pan-India tracked delivery typically arrives in 3–5 business days to over 24,000 PIN codes.',
        },
        {
          q: 'How do I pay using UPI or Cash on Delivery (COD)?',
          a: 'At checkout, you can pay via direct UPI transfer (Google Pay, PhonePe, Paytm, BHIM) by scanning our dynamic store QR code and confirming with your 12-digit UTR reference number. We also offer Cash on Delivery (COD) for eligible pincodes across India with a nominal ₹15 courier handling fee.',
        },
        {
          q: 'Do your stickers peel off cleanly without sticky glue residue?',
          a: 'Yes. We use premium removable vinyl adhesive. You can safely peel and reposition your stickers on MacBook lids, plastic or metal water bottles, phone cases, and glass surfaces with zero sticky glue residue or paper tearing.',
        },
        {
          q: 'What is the minimum order requirement and why?',
          a: 'Pixwora has a ₹99 minimum order total at checkout. This ensures every shipment can be packed in protective, reinforced bend-proof mailers with moisture-sealed sleeves and dispatched via reliable tracked courier partners without compromising packaging quality.',
        },
        {
          q: 'What is the Mystery Sticker Pack?',
          a: 'The Mystery Pack includes 6 stickers for ₹129: 5 guaranteed designs from your selected theme (Anime, Marvel, Gaming, Cars & Bikes, Cute, Devotion, Sports, or Movies) plus 1 surprise bonus sticker hand-picked by our studio team.',
        },
        {
          q: 'Can I personalize Secret Message stickers?',
          a: 'Yes! Every Secret Message sticker includes a wax-sealed kraft envelope card. You can write your own custom message during checkout or in our builder to surprise a friend, or opt for our studio-curated surprise quote.',
        },
        {
          q: 'How does the "Build Your Wall" poster collage kit work?',
          a: 'Our Build Your Wall tool lets you visually arrange custom room collages mixing A5, A4, and A3 prints on an interactive canvas. You can combine our curated catalog designs with your own uploaded photos, preview real-world wall spacing, and order the entire set in one click.',
        },
        {
          q: 'How can I contact Pixwora customer support?',
          a: 'You can reach our Hyderabad studio team directly via WhatsApp or phone at +91 7981793020 and +91 8019345200, or email us anytime at pixworastore@gmail.com. We typically respond within a few hours on business days.',
        },
      ];

      const prerenderPage = (subPath, title, desc, h1, canonicalPath, customBody = null, customSchema = null) => {
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

        if (customSchema) {
          const schemaScript = `\n    <script id="pixwora-page-ld-json" type="application/ld+json">\n${JSON.stringify(customSchema, null, 2)}\n    </script>\n`;
          if (/<script\b[^>]*id="pixwora-(?:page-)?ld-json"[^>]*>[\s\S]*?<\/script>/i.test(html)) {
            html = html.replace(/<script\b[^>]*id="pixwora-(?:page-)?ld-json"[^>]*>[\s\S]*?<\/script>/i, schemaScript.trim());
          } else {
            html = html.replace('</head>', `${schemaScript}</head>`);
          }
        }

        const rootContent = customBody
          ? `<div id="root">${customBody}</div>`
          : `
    <div id="root">
      <main style="padding: 2rem; max-width: 1200px; margin: 0 auto; font-family: sans-serif; line-height: 1.6;">
        <nav aria-label="Breadcrumbs"><a href="/">Home</a> &gt; <span>${h1}</span></nav>
        <h1>${h1}</h1>
        <p>${desc}</p>
        <nav aria-label="Explore"><a href="/shop?category=stickers">Stickers</a> | <a href="/shop?category=posters">Posters</a> | <a href="/create-your-stickers">Create Custom Stickers</a></nav>
      </main>
    </div>`;

        html = html.replace(/<div id="root">[\s\S]*?<\/div>/i, rootContent);
        fs.writeFileSync(targetFile, html, 'utf8');
      };

      // 1. FAQ Page
      const faqSchemaJson = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: storeFaqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: f.a,
          },
        })),
      };
      const faqBodyHtml = `
      <main style="padding: 2.5rem 1.5rem; max-width: 900px; margin: 0 auto; font-family: sans-serif; line-height: 1.6;">
        <nav aria-label="Breadcrumb"><a href="/">Home</a> &gt; <span>FAQ</span></nav>
        <h1 style="font-size: 2.5rem; margin-top: 1rem;">Frequently Asked Questions — Pixwora</h1>
        <p style="font-size: 1.1rem; color: #555;">Answers to common questions about our waterproof vinyl stickers, 300 GSM wall posters, custom sticker printing, UPI &amp; COD payment, and delivery across India.</p>
        <section style="margin-top: 2rem;">
          <dl>
            ${storeFaqs.map((f) => `<div style="margin-bottom: 1.75rem;"><dt style="font-weight: bold; font-size: 1.15rem; margin-bottom: 0.35rem;">${escapeXml(f.q)}</dt><dd style="margin-left: 0; color: #333;">${escapeXml(f.a)}</dd></div>`).join('\n')}
          </dl>
        </section>
        <div style="margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid #ddd;">
          <p>Have another question? Reach out to our team via WhatsApp at <a href="https://wa.me/917981793020">+91 7981793020</a> or email <a href="mailto:pixworastore@gmail.com">pixworastore@gmail.com</a>.</p>
        </div>
      </main>`;
      prerenderPage(
        'faq',
        'FAQ — Frequently Asked Questions | Pixwora Store',
        'Answers to common questions about Pixwora stickers, wall posters, waterproof materials, payment methods and shipping across India.',
        'Frequently Asked Questions',
        '/faq',
        faqBodyHtml,
        faqSchemaJson
      );

      // 2. About Page
      const aboutSchemaJson = {
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        '@id': `${BASE_URL}/about#webpage`,
        url: `${BASE_URL}/about`,
        name: 'About Pixwora — Student-Run Sticker & Wall Poster Brand in Hyderabad',
        description: 'Learn the story behind Pixwora. A student-run creative studio from Hyderabad creating original waterproof vinyl stickers and premium 300 GSM wall posters.',
        mainEntity: {
          '@type': 'Organization',
          '@id': `${BASE_URL}/#organization`,
          name: 'Pixwora',
          alternateName: ['PIXWORA', 'Pixwora Store', 'Pixwora India', 'Pixwora Stickers'],
          url: `${BASE_URL}/`,
          logo: `${BASE_URL}/logo.jpeg`,
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Hyderabad',
            addressRegion: 'Telangana',
            addressCountry: 'IN',
          },
        },
      };
      const aboutBodyHtml = `
      <main style="padding: 2.5rem 1.5rem; max-width: 900px; margin: 0 auto; font-family: sans-serif; line-height: 1.6;">
        <nav aria-label="Breadcrumb"><a href="/">Home</a> &gt; <span>About</span></nav>
        <h1 style="font-size: 2.5rem; margin-top: 1rem;">About Pixwora — Independent Sticker &amp; Poster Studio</h1>
        <p style="font-size: 1.2rem; font-weight: bold; color: #d90a1f;">Boring was never our thing.</p>
        <p>Pixwora is an independent, student-run creative brand founded in Hyderabad, Telangana, India. We started with a clear observation: everyone carries the exact same laptops, metal bottles, phone cases, and journals. Stickers and wall art are the most affordable, authentic way to claim your everyday belongings and personal spaces back.</p>
        <h2>Our Craft &amp; Quality Commitments</h2>
        <ul>
          <li><strong>100% Waterproof Vinyl:</strong> All our stickers are printed on durable vinyl with a protective matte lamination. They withstand water, rain, weather, and rough daily use without fading or peeling.</li>
          <li><strong>Residue-Free Clean Peel:</strong> Our vinyl adhesive peels away cleanly from MacBooks, hydroflasks, and phone cases with zero sticky gunk or torn paper.</li>
          <li><strong>300 GSM Archival Matte Wall Posters:</strong> Our wall posters are printed on heavyweight 300 GSM art cardstock with deep, non-reflective archival inks, available in standard A5, A4, and A3 dimensions.</li>
          <li><strong>Protective Bend-Proof Packaging:</strong> Every order is carefully packed in rigid, reinforced bend-proof mailers with moisture-sealed sleeves to guarantee damage-free transit.</li>
        </ul>
        <h2>Explore Pixwora</h2>
        <p>
          <a href="/shop?category=stickers">Shop Laptop &amp; Vinyl Stickers</a> ·
          <a href="/shop?category=posters">Shop 300 GSM Wall Posters</a> ·
          <a href="/create-your-stickers">Print Custom Stickers</a> ·
          <a href="/build-your-wall">Build a Custom Poster Wall</a>
        </p>
      </main>`;
      prerenderPage(
        'about',
        'About Pixwora — Student-Run Sticker & Wall Poster Brand in Hyderabad',
        'Learn the story behind Pixwora. A student-run brand from Hyderabad creating original waterproof vinyl stickers and premium wall posters.',
        'About Pixwora',
        '/about',
        aboutBodyHtml,
        aboutSchemaJson
      );

      // 3. Shop Landing Page
      const shopBodyHtml = `
      <main style="padding: 2.5rem 1.5rem; max-width: 1000px; margin: 0 auto; font-family: sans-serif; line-height: 1.6;">
        <nav aria-label="Breadcrumb"><a href="/">Home</a> &gt; <span>Shop</span></nav>
        <h1 style="font-size: 2.5rem; margin-top: 1rem;">Shop Original Stickers &amp; Wall Posters</h1>
        <p>Browse Pixwora full catalogue of waterproof laptop stickers, aesthetic vinyl decals, and 300 GSM room wall posters. Student-run studio from Hyderabad shipping across India.</p>
        <h2>Product Categories</h2>
        <ul>
          <li><a href="/shop?category=stickers"><strong>Vinyl Stickers:</strong> Die-cut singles, mini sheets, and themed packs. Waterproof, UV-resistant, and scratch-proof.</a></li>
          <li><a href="/shop?category=posters"><strong>Room Wall Posters:</strong> Printed on 300 GSM archival matte paper in standard A5, A4, and A3 dimensions.</a></li>
          <li><a href="/create-your-stickers"><strong>Custom Sticker Studio:</strong> Upload your own images or artwork for custom vinyl sticker printing.</a></li>
          <li><a href="/build-your-wall"><strong>Build Your Poster Wall:</strong> Design custom aesthetic room wall collage layouts.</a></li>
        </ul>
        <h2>Popular Themes &amp; Vibes</h2>
        <p>
          <a href="/shop?category=stickers&vibe=anime">Anime Stickers</a> ·
          <a href="/shop?category=stickers&vibe=gaming">Gaming Stickers</a> ·
          <a href="/shop?category=stickers&vibe=movies">Movie &amp; TV Decals</a> ·
          <a href="/shop?category=stickers&vibe=quotes">Quotes &amp; Developer Vibes</a> ·
          <a href="/shop?category=stickers&vibe=cute">Cute &amp; Aesthetic</a> ·
          <a href="/shop?category=stickers&vibe=bts">K-Pop &amp; Music</a>
        </p>
      </main>`;
      prerenderPage(
        'shop',
        'Buy Original Stickers & Wall Posters Online India | Pixwora',
        'Browse Pixwora full catalogue of waterproof laptop stickers, anime vinyl decals, and 300 GSM room wall posters in India. Student-run brand from Hyderabad.',
        'Shop Stickers & Wall Posters',
        '/shop',
        shopBodyHtml
      );

      // 4. Custom Stickers Landing Page
      const customStickersBodyHtml = `
      <main style="padding: 2.5rem 1.5rem; max-width: 900px; margin: 0 auto; font-family: sans-serif; line-height: 1.6;">
        <nav aria-label="Breadcrumb"><a href="/">Home</a> &gt; <span>Custom Stickers</span></nav>
        <h1 style="font-size: 2.5rem; margin-top: 1rem;">Custom Stickers Online India — Print Your Own Designs</h1>
        <p>Turn your own photos, digital artwork, company logos, or memes into premium waterproof die-cut vinyl stickers with Pixwora.</p>
        <h2>How It Works</h2>
        <ol>
          <li><strong>Upload Artwork:</strong> Upload your high-resolution PNG, JPG, or WebP image.</li>
          <li><strong>Choose Shape &amp; Crop:</strong> Select precision contour die-cut, circle, square, or custom shape.</li>
          <li><strong>Pick Size &amp; Finish:</strong> Standard 5cm × 5cm (₹20), 6cm × 6cm (₹25), or any custom dimension in centimeters with instant pricing.</li>
          <li><strong>Studio Inspection:</strong> Our Hyderabad print studio inspects your file for print clarity before production on waterproof vinyl.</li>
        </ol>
        <p><a href="/create-your-stickers" style="display: inline-block; padding: 0.75rem 1.5rem; background: #d90a1f; color: #fff; text-decoration: none; border-radius: 9999px; font-weight: bold;">Launch Custom Sticker Studio</a></p>
      </main>`;
      prerenderPage(
        'create-your-stickers',
        'Custom Stickers Online India — Print Your Own Vinyl Stickers | Pixwora',
        'Upload your artwork and print custom waterproof vinyl stickers with live 3D preview, custom shapes, sizes and matte or glossy finishes from Pixwora Hyderabad.',
        'Custom Sticker Printing Online India',
        '/create-your-stickers',
        customStickersBodyHtml
      );

      // 5. Build Your Wall Page
      const buildWallBodyHtml = `
      <main style="padding: 2.5rem 1.5rem; max-width: 900px; margin: 0 auto; font-family: sans-serif; line-height: 1.6;">
        <nav aria-label="Breadcrumb"><a href="/">Home</a> &gt; <span>Build Your Wall</span></nav>
        <h1 style="font-size: 2.5rem; margin-top: 1rem;">Build Your Own Wall Collage Kit — Aesthetic Room Posters</h1>
        <p>Design a custom gallery wall collage for your bedroom, study space, or hostel room. Mix curated anime, cinematic, and motivational art prints with your own personal photos in A5, A4, and A3 formats.</p>
        <h2>Specifications</h2>
        <ul>
          <li><strong>Paper Stock:</strong> 300 GSM heavyweight archival matte cardstock.</li>
          <li><strong>Dimensions:</strong> A5 (14.8 × 21 cm), A4 (21 × 29.7 cm), A3 (29.7 × 42 cm).</li>
          <li><strong>Finish:</strong> Non-glare, smooth matte surface with archival fade-resistant ink reproduction.</li>
        </ul>
        <p><a href="/build-your-wall" style="display: inline-block; padding: 0.75rem 1.5rem; background: #d90a1f; color: #fff; text-decoration: none; border-radius: 9999px; font-weight: bold;">Open Wall Collage Builder</a></p>
      </main>`;
      prerenderPage(
        'build-your-wall',
        'Build Your Own Wall Collage Kit India — Custom Room Poster Packs | Pixwora',
        'Design and arrange your aesthetic wall collage with Pixwora. Mix anime art, movie prints and your own photos in A5, A4 and A3 sizes with live layout preview.',
        'Build Your Room Wall Collage',
        '/build-your-wall',
        buildWallBodyHtml
      );

      // 6. Contact Page
      const contactBodyHtml = `
      <main style="padding: 2.5rem 1.5rem; max-width: 800px; margin: 0 auto; font-family: sans-serif; line-height: 1.6;">
        <nav aria-label="Breadcrumb"><a href="/">Home</a> &gt; <span>Contact</span></nav>
        <h1 style="font-size: 2.5rem; margin-top: 1rem;">Contact Pixwora Studio</h1>
        <p>We are a student-run creative studio based in Hyderabad, Telangana, India. Have a question about an order, custom printing, or collaboration? Reach out anytime:</p>
        <ul>
          <li><strong>WhatsApp / Phone:</strong> <a href="https://wa.me/917981793020">+91 7981793020</a> / <a href="tel:+918019345200">+91 8019345200</a></li>
          <li><strong>Email:</strong> <a href="mailto:pixworastore@gmail.com">pixworastore@gmail.com</a></li>
          <li><strong>Instagram:</strong> <a href="https://www.instagram.com/pixwora.store/?hl=en" target="_blank" rel="noreferrer">@pixwora.store</a></li>
          <li><strong>Studio Location:</strong> Hyderabad, Telangana, India</li>
        </ul>
      </main>`;
      prerenderPage(
        'contact',
        'Contact Us | Pixwora Hyderabad',
        'Get in touch with Pixwora for custom orders, bulk queries, or feedback. WhatsApp, email and Instagram support available.',
        'Contact Pixwora',
        '/contact',
        contactBodyHtml
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
