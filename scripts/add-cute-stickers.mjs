import fs from 'node:fs';
import path from 'node:path';

const publicCuteDir = path.resolve('public/cute');
const cataloguePath = path.resolve('public/products-catalogue.json');

const files = fs.readdirSync(publicCuteDir).filter((f) => f.endsWith('.webp')).sort();
console.log(`Found ${files.length} cute sticker files.`);

const rawCatalogue = fs.readFileSync(cataloguePath, 'utf8');
const catalogue = JSON.parse(rawCatalogue);

const newCuteProducts = files.map((file, idx) => {
  const cleanName = file
    .replace(/^\d+\s*-\s*/, '')
    .replace(/\.webp$/i, '')
    .replace(/\s*-\s*Second Copy$/i, ' (Alt)')
    .trim();

  const slug = 'cute-' + cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const id = `stk-cute-${String(idx + 1).padStart(3, '0')}`;
  const now = new Date().toISOString();

  return {
    id,
    slug,
    name: cleanName,
    description: `Original Cute & Aesthetic vinyl sticker: ${cleanName}. Printed on waterproof matte vinyl with precision die-cut edge.`,
    shortDescription: `Cute & Aesthetic die-cut sticker: ${cleanName}.`,
    price: '20',
    active: true,
    status: 'PUBLISHED',
    productType: 'single',
    category: 'stickers',
    featured: idx < 6,
    isNew: true,
    displayOrder: 200 + idx,
    packQuantity: null,
    dimensions: '6cm x 6cm',
    material: 'Waterproof Vinyl',
    finish: 'Matte Laminated',
    note: null,
    rarity: 'common',
    seriesId: 'S03',
    metadata: null,
    createdAt: now,
    updatedAt: now,
    images: [
      {
        url: `/cute/${file}`,
        alt: `${cleanName} - Cute & Aesthetic Sticker`,
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
      { productId: id, categoryId: 'cute' },
    ],
    variants: [],
    collections: [
      { collectionId: 'stickers' },
      { collectionId: 'cute' },
    ],
    tags: [
      { tag: 'cute' },
      { tag: 'aesthetic' },
      { tag: 'sticker' },
      { tag: 'vinyl' },
    ],
  };
});

// Remove any existing cute sticker products with these IDs/slugs first
const existingIds = new Set(newCuteProducts.map((p) => p.id));
const existingSlugs = new Set(newCuteProducts.map((p) => p.slug));

const filteredCatalogue = catalogue.filter((p) => !existingIds.has(p.id) && !existingSlugs.has(p.slug));
const updatedCatalogue = [...filteredCatalogue, ...newCuteProducts];

fs.writeFileSync(cataloguePath, JSON.stringify(updatedCatalogue, null, 2), 'utf8');
console.log(`Updated ${cataloguePath}: now has ${updatedCatalogue.length} products.`);

// Also sync with backend database if Prisma is available
try {
  const { PrismaClient } = await import('../backend/node_modules/@prisma/client/index.js');
  const prisma = new PrismaClient();
  console.log('Syncing cute products into Postgres DB...');

  // Ensure 'cute' category exists
  await prisma.category.upsert({
    where: { id: 'cute' },
    update: { name: 'Cute & Aesthetic', featured: true },
    create: {
      id: 'cute',
      name: 'Cute & Aesthetic',
      blurb: 'Soft colours, sleepy clouds, small joys.',
      color: '#FFB3D1',
      motif: 'cloud',
      featured: true,
      displayOrder: 5,
    },
  });

  for (const p of newCuteProducts) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: 20,
        active: true,
        status: 'PUBLISHED',
        productType: 'single',
        category: 'stickers',
        featured: p.featured,
        isNew: true,
        displayOrder: p.displayOrder,
      },
      create: {
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        price: 20,
        active: true,
        status: 'PUBLISHED',
        productType: 'single',
        category: 'stickers',
        featured: p.featured,
        isNew: true,
        displayOrder: p.displayOrder,
      },
    });

    // Images
    await prisma.productImage.deleteMany({ where: { productId: p.id } });
    await prisma.productImage.create({
      data: {
        productId: p.id,
        url: p.images[0].url,
        alt: p.images[0].alt,
        position: 0,
      },
    });

    // Categories
    await prisma.productCategory.deleteMany({ where: { productId: p.id } });
    await prisma.productCategory.createMany({
      data: [
        { productId: p.id, categoryId: 'stickers' },
        { productId: p.id, categoryId: 'cute' },
      ],
      skipDuplicates: true,
    });

    // Inventory
    await prisma.inventory.upsert({
      where: { productId: p.id },
      update: { quantity: 100 },
      create: { productId: p.id, quantity: 100 },
    });
  }

  console.log(`Successfully synced all ${newCuteProducts.length} cute products into the Postgres database!`);
  await prisma.$disconnect();
} catch (dbErr) {
  console.warn('Postgres DB sync warning (static files updated successfully):', dbErr.message);
}

