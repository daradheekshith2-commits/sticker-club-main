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
  'DBZ', 'JJK', 'AOT', 'USA', 'UK', 'AM', 'BTS', 'PUBG', 'UNO', 'GTA'
]);

function formatTitle(raw) {
  const slug = raw.replace(/\.png$/i, '');
  return slug
    .split(/[-_]+/)
    .map(w => {
      const u = w.toUpperCase();
      if (acronyms.has(u)) return u;
      if (/^\d+$/.test(w)) return '#' + w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

// Map each folder in public/Stickers to primary collections and category
const folderCategoryMap = {
  'Anime': {
    categoryIds: ['anime', 'stickers'],
    desc: (name) => `Premium waterproof die-cut anime vinyl sticker featuring ${name}. Perfect for laptops, bottles, notebooks, and phone cases.`
  },
  'Bikes': {
    categoryIds: ['quotes', 'stickers'],
    desc: (name) => `High-octane die-cut motorcycle vinyl sticker featuring ${name}. Waterproof, scratch-resistant, perfect for bikes, helmets, and laptops.`
  },
  'Cars': {
    categoryIds: ['quotes', 'stickers'],
    desc: (name) => `High-octane die-cut car vinyl sticker featuring ${name}. Waterproof, scratch-resistant, perfect for cars, laptops, and gear.`
  },
  'Devotion': {
    categoryIds: ['devotion', 'motivation', 'stickers'],
    desc: (name) => `Divine spiritual die-cut vinyl sticker featuring ${name}. Printed on premium waterproof die-cut vinyl, perfect for cars, laptops, pooja areas, and phones.`
  },
  'Music': {
    categoryIds: ['music', 'stickers'],
    desc: (name) => `Die-cut music tribute vinyl sticker featuring ${name}. Waterproof and durable for instruments, laptops, and cases.`
  },
  'Sports': {
    categoryIds: ['sports', 'motivation', 'stickers'],
    desc: (name) => `High-energy sports die-cut vinyl sticker featuring ${name}. Waterproof and durable for bottles, gym gear, laptops, and helmets.`
  },
  'TFI': {
    categoryIds: ['movies', 'stickers'],
    desc: (name) => `Cinematic die-cut vinyl sticker celebrating ${name}. High-gloss waterproof finish for laptops, phones, and journals.`
  }
};

async function main() {
  const baseDir = path.resolve('..', 'public', 'Stickers');
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

  const folders = fs.readdirSync(baseDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  console.log(`Discovered sticker folders: ${folders.join(', ')}`);

  let copied = 0;
  let inserted = 0;
  let updated = 0;

  for (const folder of folders) {
    const config = folderCategoryMap[folder];
    if (!config) {
      console.warn(`No mapping for folder: ${folder}`);
      continue;
    }

    const folderPath = path.join(baseDir, folder);
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.png'));

    console.log(`\nProcessing ${folder} (${files.length} stickers)`);

    for (const file of files) {
      const srcPath = path.join(folderPath, file);
      const destPathB = path.join(destBackend, file);
      const destPathR = path.join(destRoot, file);

      // Copy file to uploads if missing or needs update
      if (!fs.existsSync(destPathB)) {
        fs.copyFileSync(srcPath, destPathB);
        copied++;
      }
      if (!fs.existsSync(destPathR)) {
        fs.copyFileSync(srcPath, destPathR);
      }

      const baseSlug = file.replace(/\.png$/i, '');
      const name = formatTitle(file);
      const description = config.desc(name);
      const imageUrl = `/api/uploads/products/${file}`;

      // Check if product exists by baseSlug
      const existing = await prisma.product.findUnique({
        where: { slug: baseSlug },
        include: { categories: true }
      });

      if (existing) {
        if (existing.category === 'stickers') {
          // It's already a sticker: update details and ensure categories
          await prisma.product.update({
            where: { id: existing.id },
            data: {
              name,
              description,
              active: true,
              status: 'PUBLISHED',
              price: 20.00,
            }
          });

          // Ensure categories
          for (const catId of config.categoryIds) {
            await prisma.productCategory.upsert({
              where: { productId_categoryId: { productId: existing.id, categoryId: catId } },
              create: { productId: existing.id, categoryId: catId },
              update: {}
            });
          }

          // Ensure primary image
          const existingImg = await prisma.productImage.findFirst({
            where: { productId: existing.id, isPrimary: true }
          });
          if (existingImg) {
            await prisma.productImage.update({
              where: { id: existingImg.id },
              data: { url: imageUrl, alt: name }
            });
          } else {
            await prisma.productImage.create({
              data: {
                productId: existing.id,
                url: imageUrl,
                alt: name,
                position: 0,
                isPrimary: true
              }
            });
          }

          updated++;
        } else {
          // Existing product is a poster! Use a distinct sticker slug
          const stickerSlug = `${baseSlug}-sticker`;
          const stickerId = `stk-${baseSlug}`.toLowerCase();

          // Check if sticker already created by stickerSlug or stickerId
          const existingSticker = await prisma.product.findFirst({
            where: { OR: [{ slug: stickerSlug }, { id: stickerId }] }
          });

          if (existingSticker) {
            await prisma.product.update({
              where: { id: existingSticker.id },
              data: {
                name,
                description,
                active: true,
                status: 'PUBLISHED',
                price: 20.00,
              }
            });

            for (const catId of config.categoryIds) {
              await prisma.productCategory.upsert({
                where: { productId_categoryId: { productId: existingSticker.id, categoryId: catId } },
                create: { productId: existingSticker.id, categoryId: catId },
                update: {}
              });
            }
            updated++;
          } else {
            await prisma.product.create({
              data: {
                id: stickerId,
                slug: stickerSlug,
                name,
                description,
                price: 20.00,
                active: true,
                status: 'PUBLISHED',
                productType: 'single',
                category: 'stickers',
                displayOrder: 150,
                rarity: 'common',
                seriesId: 'S01',
                inventory: {
                  create: { quantity: 100 }
                },
                images: {
                  create: [{
                    url: imageUrl,
                    alt: name,
                    position: 0,
                    isPrimary: true
                  }]
                },
                categories: {
                  create: config.categoryIds.map(categoryId => ({ categoryId }))
                }
              }
            });
            inserted++;
          }
        }
      } else {
        // Completely new sticker
        const stickerId = `stk-${baseSlug}`.toLowerCase();
        await prisma.product.create({
          data: {
            id: stickerId,
            slug: baseSlug,
            name,
            description,
            price: 20.00,
            active: true,
            status: 'PUBLISHED',
            productType: 'single',
            category: 'stickers',
            displayOrder: 150,
            rarity: 'common',
            seriesId: 'S01',
            inventory: {
              create: { quantity: 100 }
            },
            images: {
              create: [{
                url: imageUrl,
                alt: name,
                position: 0,
                isPrimary: true
              }]
            },
            categories: {
              create: config.categoryIds.map(categoryId => ({ categoryId }))
            }
          }
        });
        inserted++;
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`Ingestion Complete!`);
  console.log(`Copied files: ${copied}`);
  console.log(`Inserted stickers: ${inserted}`);
  console.log(`Updated stickers: ${updated}`);
  console.log(`Total processed: ${inserted + updated}`);
  console.log(`========================================`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

