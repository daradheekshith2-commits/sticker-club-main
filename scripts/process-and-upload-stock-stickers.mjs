import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

// Configuration
const MAPPINGS = [
  // From temp_stock_zip
  { srcDir: 'public/temp_stock_zip/Anime', targetDir: 'public/Stickers/Anime', catId: 'anime', tags: ['anime', 'japanese', 'manga', 'character', 'sticker'] },
  { srcDir: 'public/temp_stock_zip/Cars', targetDir: 'public/Stickers/Cars', catId: 'quotes', tags: ['cars', 'automotive', 'racing', 'supercar', 'sticker'] },
  { srcDir: 'public/temp_stock_zip/Devotional', targetDir: 'public/Stickers/Devotion', catId: 'devotion', tags: ['devotion', 'spiritual', 'sacred', 'deity', 'sticker'] },
  { srcDir: 'public/temp_stock_zip/Sports', targetDir: 'public/Stickers/Sports', catId: 'sports', tags: ['sports', 'athlete', 'champion', 'sticker'] },
  { srcDir: 'public/temp_stock_zip/Movies', targetDir: 'public/Stickers/Movies', catId: 'movies', tags: ['movies', 'cinema', 'film', 'blockbuster', 'sticker'] },
  { srcDir: 'public/temp_stock_zip/BTS', targetDir: 'public/Stickers/BTS', catId: 'music', tags: ['bts', 'kpop', 'music', 'k-pop', 'sticker'] },
  { srcDir: 'public/temp_stock_zip/Games', targetDir: 'public/Stickers/Games', catId: 'gaming', tags: ['gaming', 'videogames', 'gamer', 'playstation', 'sticker'] },
  { srcDir: 'public/temp_stock_zip/GTA', targetDir: 'public/Stickers/Games', catId: 'gaming', tags: ['gaming', 'gta', 'rockstar', 'videogames', 'sticker'] },
  { srcDir: 'public/temp_stock_zip/Gen Z Quotes', targetDir: 'public/Stickers/Quotes', catId: 'motivation', tags: ['gen-z', 'quotes', 'motivation', 'typography', 'sticker'] },

  // From new mall
  { srcDir: 'public/new mall/Anime', targetDir: 'public/Stickers/Anime', catId: 'anime', tags: ['anime', 'japanese', 'manga', 'character', 'sticker'] },
  { srcDir: 'public/new mall/BTS', targetDir: 'public/Stickers/BTS', catId: 'music', tags: ['bts', 'kpop', 'music', 'k-pop', 'sticker'] },
  { srcDir: 'public/new mall/Cars', targetDir: 'public/Stickers/Cars', catId: 'quotes', tags: ['cars', 'automotive', 'racing', 'supercar', 'sticker'] },
  { srcDir: 'public/new mall/Cute', targetDir: 'public/Stickers/Cute', catId: 'cute', tags: ['cute', 'aesthetic', 'kawaii', 'pastel', 'sticker'] },
  { srcDir: 'public/new mall/Devotional', targetDir: 'public/Stickers/Devotion', catId: 'devotion', tags: ['devotion', 'spiritual', 'sacred', 'deity', 'sticker'] },
  { srcDir: 'public/new mall/Football', targetDir: 'public/Stickers/Sports', catId: 'sports', tags: ['sports', 'football', 'athlete', 'champion', 'sticker'] },
  { srcDir: 'public/new mall/Games', targetDir: 'public/Stickers/Games', catId: 'gaming', tags: ['gaming', 'videogames', 'gamer', 'playstation', 'sticker'] },
  { srcDir: 'public/new mall/Spider-Man', targetDir: 'public/Stickers/Marvel', catId: 'marvel', tags: ['marvel', 'spiderman', 'superhero', 'comic', 'sticker'] },
];

function formatTitle(filename) {
  const base = path.basename(filename, path.extname(filename));
  // Replace hyphens, underscores with spaces
  let name = base.replace(/[-_]+/g, ' ').trim();
  // Capitalize words nicely
  name = name
    .split(' ')
    .filter(Boolean)
    .map((word) => {
      const upper = word.toUpperCase();
      if (['GTA', 'PS5', 'BOB', 'BTS', 'GOAT', 'BMW', 'BASF', 'IDGAF', 'TFI', 'VI', 'M6'].includes(upper)) {
        return upper;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
  return name;
}

function normalizeKey(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function run() {
  console.log('--- STARTING STOCK STICKER PIPELINE ---');

  // Load existing catalogue
  const cataloguePath = path.resolve('public/products-catalogue.json');
  const catalogue = JSON.parse(fs.readFileSync(cataloguePath, 'utf8'));
  console.log(`Loaded existing catalogue with ${catalogue.length} products.`);

  const existingIds = new Set(catalogue.map((p) => p.id));
  const existingSlugs = new Set(catalogue.map((p) => p.slug));
  const existingNames = new Set(catalogue.map((p) => normalizeKey(p.name)));

  // Scan existing files in target folders
  const processedFiles = new Set();
  const createdProducts = [];
  const filesToConvert = [];

  for (const map of MAPPINGS) {
    const src = path.resolve(map.srcDir);
    const dest = path.resolve(map.targetDir);

    if (!fs.existsSync(src)) {
      continue;
    }

    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const files = fs.readdirSync(src).filter((f) => !f.startsWith('.') && /\.(png|webp|jpg|jpeg)$/i.test(f));
    console.log(`Processing ${map.srcDir} -> ${map.targetDir}: found ${files.length} files.`);

    for (const file of files) {
      const norm = normalizeKey(path.basename(file, path.extname(file)));
      if (processedFiles.has(norm)) {
        // Skip duplicate across folders/zip
        continue;
      }
      processedFiles.add(norm);

      const srcFile = path.join(src, file);
      const targetPng = path.join(dest, file);
      const targetWebpName = `${path.basename(file, path.extname(file))}.webp`;
      const targetWebp = path.join(dest, targetWebpName);

      // Copy PNG if not already at target
      if (!fs.existsSync(targetPng) || fs.statSync(targetPng).size === 0) {
        fs.copyFileSync(srcFile, targetPng);
      }

      filesToConvert.push({ src: targetPng, dest: targetWebp });

      // Build product object
      const title = formatTitle(file);
      const baseSlug = 'stk-' + norm;
      let slug = baseSlug;
      let counter = 1;
      while (existingSlugs.has(slug)) {
        slug = `${baseSlug}-${counter++}`;
      }
      existingSlugs.add(slug);

      let id = slug;
      if (existingIds.has(id)) {
        id = `${slug}-${crypto.randomBytes(3).toString('hex')}`;
      }
      existingIds.add(id);

      const relFolder = map.targetDir.replace(/^public\//, '');
      const imageUrl = `/${relFolder}/${targetWebpName}`;
      const now = new Date().toISOString();

      const product = {
        id,
        slug,
        name: title,
        description: `Original die-cut vinyl sticker: ${title}. Printed on waterproof matte vinyl with precision die-cut edge.`,
        shortDescription: `Die-cut vinyl sticker: ${title}.`,
        price: '20',
        active: true,
        status: 'PUBLISHED',
        productType: 'single',
        category: 'stickers',
        featured: false,
        isNew: true,
        displayOrder: 500 + createdProducts.length,
        packQuantity: null,
        dimensions: '6cm x 6cm',
        material: 'Waterproof Vinyl',
        finish: 'Matte Laminated',
        note: null,
        rarity: 'common',
        seriesId: 'S04',
        metadata: null,
        createdAt: now,
        updatedAt: now,
        images: [
          {
            id: `img-${id}`,
            productId: id,
            url: imageUrl,
            alt: `${title} Sticker`,
            position: 0,
            isPrimary: true,
          },
        ],
        inventory: {
          productId: id,
          quantity: 100,
        },
        categories: [
          { productId: id, categoryId: 'stickers' },
          { productId: id, categoryId: map.catId },
        ],
        variants: [],
        collections: [
          { collectionId: 'stickers' },
          { collectionId: map.catId },
        ],
        tags: map.tags.map((t) => ({ tag: t })),
      };

      createdProducts.push(product);
    }
  }

  console.log(`\nCollected ${createdProducts.length} unique new stock stickers.`);
  console.log(`Converting images to optimized WebP (${filesToConvert.length} files)...`);

  // Optimize images with sharp in batches
  const batchSize = 25;
  for (let i = 0; i < filesToConvert.length; i += batchSize) {
    const chunk = filesToConvert.slice(i, i + batchSize);
    await Promise.all(
      chunk.map(async ({ src, dest }) => {
        try {
          if (!fs.existsSync(dest) || fs.statSync(dest).size === 0) {
            await sharp(src)
              .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
              .webp({ quality: 85, effort: 4 })
              .toFile(dest);
          }
        } catch (err) {
          console.error(`Failed to convert ${src}:`, err.message);
        }
      })
    );
    if ((i + batchSize) % 100 === 0 || i + batchSize >= filesToConvert.length) {
      console.log(`Converted ${Math.min(i + batchSize, filesToConvert.length)} / ${filesToConvert.length} images.`);
    }
  }

  // Update catalogue
  const updatedCatalogue = [...catalogue, ...createdProducts];
  fs.writeFileSync(cataloguePath, JSON.stringify(updatedCatalogue, null, 2), 'utf8');
  console.log(`Updated ${cataloguePath}: now has ${updatedCatalogue.length} products (added ${createdProducts.length}).`);

  // Save sql insert files into scripts/seed-batches/
  const sqlDir = path.resolve('scripts/seed-batches');
  if (!fs.existsSync(sqlDir)) fs.mkdirSync(sqlDir, { recursive: true });

  // Generate SQL files in chunks of 150 products for Supabase
  const sqlChunkSize = 150;
  let batchIndex = 0;

  for (let i = 0; i < createdProducts.length; i += sqlChunkSize) {
    const chunk = createdProducts.slice(i, i + sqlChunkSize);
    batchIndex++;
    const sqlFile = path.join(sqlDir, `batch-${String(batchIndex).padStart(2, '0')}.sql`);

    const sqlLines = [];
    sqlLines.push('-- Batch ' + batchIndex);
    sqlLines.push('INSERT INTO public."Product" (id, slug, name, description, price, active, status, "productType", category, featured, "isNew", "displayOrder", "dimensions", material, finish, rarity, "seriesId", "createdAt", "updatedAt") VALUES');

    const productValues = chunk.map((p) => {
      const esc = (s) => (s ? `'${s.replace(/'/g, "''")}'` : 'NULL');
      return `(${esc(p.id)}, ${esc(p.slug)}, ${esc(p.name)}, ${esc(p.description)}, ${p.price}, ${p.active ? 'true' : 'false'}, ${esc(p.status)}, ${esc(p.productType)}, ${esc(p.category)}, ${p.featured ? 'true' : 'false'}, ${p.isNew ? 'true' : 'false'}, ${p.displayOrder}, ${esc(p.dimensions)}, ${esc(p.material)}, ${esc(p.finish)}, ${esc(p.rarity)}, ${esc(p.seriesId)}, NOW(), NOW())`;
    });
    sqlLines.push(productValues.join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n');

    // Inventory
    sqlLines.push('INSERT INTO public."Inventory" ("productId", quantity) VALUES');
    const invValues = chunk.map((p) => `('${p.id}', 100)`);
    sqlLines.push(invValues.join(',\n') + '\nON CONFLICT ("productId") DO NOTHING;\n');

    // ProductCategory
    sqlLines.push('INSERT INTO public."ProductCategory" ("productId", "categoryId") VALUES');
    const catValues = [];
    chunk.forEach((p) => {
      p.categories.forEach((c) => {
        catValues.push(`('${p.id}', '${c.categoryId}')`);
      });
    });
    sqlLines.push(catValues.join(',\n') + '\nON CONFLICT ("productId", "categoryId") DO NOTHING;\n');

    // ProductImage
    sqlLines.push('INSERT INTO public."ProductImage" (id, "productId", url, alt, position, "isPrimary") VALUES');
    const imgValues = [];
    chunk.forEach((p) => {
      p.images.forEach((img) => {
        const esc = (s) => (s ? `'${s.replace(/'/g, "''")}'` : 'NULL');
        imgValues.push(`(${esc(img.id)}, ${esc(p.id)}, ${esc(img.url)}, ${esc(img.alt)}, ${img.position}, ${img.isPrimary ? 'true' : 'false'})`);
      });
    });
    sqlLines.push(imgValues.join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n');

    fs.writeFileSync(sqlFile, sqlLines.join('\n'), 'utf8');
  }

  console.log(`Generated ${batchIndex} SQL migration batches in ${sqlDir}.`);
  console.log('--- STOCK STICKER PIPELINE COMPLETE ---');
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
