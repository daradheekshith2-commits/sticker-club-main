import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const acronyms = new Set([
  'BMW', 'GTR', 'GT-R', 'AMG', 'RS', 'SS', 'M2', 'M3', 'M4', 'M5', 'M8',
  'M1000RR', 'S1000RR', 'F900R', 'R1', 'R6', 'R15', 'MT', 'KTM', 'RC390',
  'H2R', 'ZX10R', 'GT3', 'GT2', 'W16', 'V8', 'V10', 'V12', 'JDM', '4X4', 'SUV',
  'RRR', 'KGF', 'DJ', 'NTR', 'ANR', 'PSPK', 'MB', 'RC', 'AA', 'TFI', 'B&W',
  'IPL', 'FIFA', 'CR7', 'VK18', 'MSD', 'F1', 'RCB', 'CSK', 'MI', 'SRH',
  'DBZ', 'JJK', 'AOT', 'USA', 'UK'
]);

function formatTitle(raw) {
  const slug = raw.replace(/\.(jpe?g|png|webp)$/i, '');
  return slug
    .split(/[-_]+/)
    .map(w => {
      const u = w.toUpperCase();
      if (acronyms.has(u)) return u;
      if (/^\d+$/.test(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

// Respected categories for each folder
const folderCategoryMap = {
  'Anime': ['anime', 'posters'],
  'Asthetic': ['cute', 'posters'],
  'Bikes': ['quotes', 'posters'],
  'Cars': ['quotes', 'posters'],
  'Vechiles': ['quotes', 'posters'],
  'Music': ['music', 'posters'],
  'Sports': ['sports', 'motivation', 'posters'],
  'TFI': ['movies', 'posters'],
  'Devotion': ['devotion', 'motivation', 'posters'],
};

async function main() {
  const baseDir = path.resolve('..', 'public', 'Poster');
  const destBackend = path.resolve('uploads', 'products');
  const destRoot = path.resolve('..', 'uploads', 'products');

  fs.mkdirSync(destBackend, { recursive: true });
  fs.mkdirSync(destRoot, { recursive: true });

  console.log('Ensuring categories "devotion" and "sports" exist in DB...');
  await prisma.category.upsert({
    where: { id: 'devotion' },
    update: {},
    create: {
      id: 'devotion',
      name: 'Devotion',
      blurb: 'Spiritual art, divine serenity and sacred deities.',
      color: '#FFB347',
      motif: 'sparkle',
      featured: false,
      displayOrder: 14,
    }
  });

  await prisma.category.upsert({
    where: { id: 'sports' },
    update: {},
    create: {
      id: 'sports',
      name: 'Sports',
      blurb: 'Athletic icons, championship spirit and legendary sports moments.',
      color: '#47A8FF',
      motif: 'bolt',
      featured: false,
      displayOrder: 15,
    }
  });

  // Get all existing slugs to prevent collisions
  const existingSlugs = new Set((await prisma.product.findMany({ select: { slug: true } })).map(x => x.slug));
  const existingIds = new Set((await prisma.product.findMany({ select: { id: true } })).map(x => x.id));

  const folders = fs.readdirSync(baseDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  console.log(`Discovered poster folders: ${folders.join(', ')}`);

  let totalFilesCopied = 0;
  let totalProductsCreated = 0;
  let totalProductsUpdated = 0;

  for (const folder of folders) {
    const categoryIds = folderCategoryMap[folder] || ['posters'];
    const folderPath = path.join(baseDir, folder);
    const files = fs.readdirSync(folderPath).filter(f => /\.(jpe?g|png|webp)$/i.test(f));

    console.log(`\nProcessing folder: ${folder} (${files.length} posters) -> Categories: ${categoryIds.join(', ')}`);

    for (const file of files) {
      const srcPath = path.join(folderPath, file);
      const destFileBackend = path.join(destBackend, file);
      const destFileRoot = path.join(destRoot, file);

      if (!fs.existsSync(destFileBackend)) {
        fs.copyFileSync(srcPath, destFileBackend);
        totalFilesCopied++;
      }
      if (!fs.existsSync(destFileRoot)) {
        fs.copyFileSync(srcPath, destFileRoot);
      }

      const baseSlug = file.replace(/\.(jpe?g|png|webp)$/i, '').toLowerCase();
      let slug = baseSlug;
      if (existingSlugs.has(slug)) {
        slug = `${baseSlug}-poster`;
      }
      existingSlugs.add(slug);

      let productId = `pst-${baseSlug}`;
      if (existingIds.has(productId)) {
        productId = `pst-${slug}`;
      }
      existingIds.add(productId);

      const title = formatTitle(file);
      const name = `${title} Poster`;
      const description = `High-grade archival matte art poster print featuring ${title}. Available in A5 (₹90), A4 (₹120), and A3 (₹150). Printed on 300 GSM premium cardstock, perfect for framing, bedroom walls and creative desks.`;
      const imageUrl = `/api/uploads/products/${file}`;

      const existing = await prisma.product.findFirst({
        where: {
          OR: [
            { id: productId },
            { slug: slug },
          ]
        },
        include: { variants: true, images: true, inventory: true, categories: true }
      });

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            name,
            description,
            price: 90.00,
            active: true,
            status: 'PUBLISHED',
            category: 'posters',
            productType: 'poster',
          }
        });

        // Ensure variants exist: A5: 90, A4: 120, A3: 150
        await prisma.productVariant.deleteMany({ where: { productId: existing.id } });
        await prisma.productVariant.createMany({
          data: [
            { productId: existing.id, id: 'a5', label: 'A5', price: 90.00 },
            { productId: existing.id, id: 'a4', label: 'A4', price: 120.00 },
            { productId: existing.id, id: 'a3', label: 'A3', price: 150.00 },
          ]
        });

        // Ensure category mappings
        for (const cId of categoryIds) {
          const has = existing.categories.some(c => c.categoryId === cId);
          if (!has) {
            await prisma.productCategory.create({
              data: { productId: existing.id, categoryId: cId }
            }).catch(() => {});
          }
        }

        totalProductsUpdated++;
      } else {
        await prisma.product.create({
          data: {
            id: productId,
            slug,
            name,
            description,
            price: 90.00,
            active: true,
            status: 'PUBLISHED',
            category: 'posters',
            productType: 'poster',
            displayOrder: 200,
            rarity: 'common',
            seriesId: 'S01',
            inventory: {
              create: { quantity: 100 }
            },
            variants: {
              create: [
                { id: 'a5', label: 'A5', price: 90.00 },
                { id: 'a4', label: 'A4', price: 120.00 },
                { id: 'a3', label: 'A3', price: 150.00 },
              ]
            },
            images: {
              create: [
                {
                  url: imageUrl,
                  alt: `${title} Art Poster`,
                  position: 0,
                  isPrimary: true,
                }
              ]
            },
            categories: {
              create: categoryIds.map(cId => ({ categoryId: cId }))
            }
          }
        });

        totalProductsCreated++;
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`POSTER INGESTION COMPLETE SUMMARY:`);
  console.log(`- Files copied: ${totalFilesCopied}`);
  console.log(`- Posters created: ${totalProductsCreated}`);
  console.log(`- Posters updated: ${totalProductsUpdated}`);
  console.log(`========================================`);
}

main()
  .catch(err => {
    console.error('Fatal error ingesting posters:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

