import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { products } from '../../src/data/products.js';
import { collections } from '../../src/data/collections.js';
import { dropProposals } from '../../src/data/drops.js';
import { passportConfig } from '../../src/config/passport.js';

const db = new PrismaClient();

const allCategories = [
  { id: 'stickers', name: 'Stickers', blurb: 'Original die-cut stickers for laptops, phones and water bottles.', color: '#A8F0DC', motif: 'sparkle', featured: true, displayOrder: 0 },
  { id: 'posters', name: 'Posters', blurb: 'High-quality art prints and gallery wall layouts.', color: '#8FD3FF', motif: 'clapper', featured: true, displayOrder: 1 },
  ...collections.map((c, idx) => ({
    id: c.id,
    name: c.name,
    blurb: c.blurb,
    color: c.color,
    motif: c.motif,
    featured: c.featured,
    displayOrder: idx + 2,
  })),
  { id: 'duos', name: 'Matching Duos', blurb: 'Two original sticker designs made to go together. Keep both or share one.', color: '#A8F0DC', motif: 'pixelHeart', featured: true, displayOrder: 12 },
  { id: 'secret', name: 'Secret Messages', blurb: 'Pick a message sticker and discover the personal note sealed inside.', color: '#D90A1F', motif: 'envelope', featured: true, displayOrder: 13 },
];

async function seedCatalogue() {
  for (const cat of allCategories) {
    await db.category.upsert({
      where: { id: cat.id },
      create: {
        id: cat.id,
        name: cat.name,
        blurb: cat.blurb,
        color: cat.color,
        motif: cat.motif,
        featured: cat.featured,
        displayOrder: cat.displayOrder,
        archived: false,
      },
      update: {
        name: cat.name,
        blurb: cat.blurb,
        color: cat.color,
        motif: cat.motif,
        featured: cat.featured,
        displayOrder: cat.displayOrder,
      },
    });
  }

  let created = 0;
  for (const product of products) {
    const isDuo = product.productType === 'duo' || Boolean(product.duo);
    const isSecret = product.productType === 'secret' || Boolean(product.messageCardId);

    const categoryIds = new Set<string>([product.category, ...product.collections]);
    if (isDuo) categoryIds.add('duos');
    if (isSecret) categoryIds.add('secret');

    const metadata = {
      duo: product.duo,
      messageCardId: product.messageCardId,
      messageCardCount: product.messageCardCount,
      mystery: product.mystery,
      wallLayoutId: product.wallLayoutId,
      art: product.art,
      tags: product.tags,
      note: product.note,
    };

    const existing = await db.product.findUnique({ where: { id: product.id } });
    if (!existing) {
      await db.product.create({
        data: {
          id: product.id,
          slug: product.slug,
          name: product.name,
          description: product.description,
          price: product.price.toFixed(2),
          active: product.status === 'demo',
          status: product.status === 'demo' ? 'PUBLISHED' : 'HIDDEN',
          productType: product.productType,
          category: product.category,
          featured: product.featured,
          isNew: product.isNew,
          displayOrder: product.displayOrder,
          packQuantity: product.packQuantity,
          dimensions: product.dimensions,
          material: product.material,
          finish: product.finish,
          note: product.note,
          rarity: product.rarity,
          seriesId: product.seriesId,
          metadata,
          categories: {
            create: Array.from(categoryIds).map((categoryId) => ({ categoryId })),
          },
          inventory: {
            create: { quantity: 100 },
          },
        },
      });
      created++;
    } else {
      // Enrich existing product record with metadata, productType, category, etc.
      await db.product.update({
        where: { id: product.id },
        data: {
          productType: product.productType,
          category: product.category,
          featured: product.featured,
          isNew: product.isNew,
          displayOrder: product.displayOrder,
          packQuantity: product.packQuantity,
          dimensions: product.dimensions,
          material: product.material,
          finish: product.finish,
          note: product.note,
          rarity: product.rarity,
          seriesId: product.seriesId,
          metadata,
        },
      });

      // Ensure category assignments without duplication
      for (const catId of categoryIds) {
        await db.productCategory.upsert({
          where: { productId_categoryId: { productId: product.id, categoryId: catId } },
          create: { productId: product.id, categoryId: catId },
          update: {},
        });
      }

      // Ensure inventory exists
      const inv = await db.inventory.findUnique({ where: { productId: product.id } });
      if (!inv) {
        await db.inventory.create({ data: { productId: product.id, quantity: 100 } });
      }
    }

    if (product.variants?.length) {
      await db.productVariant.createMany({
        data: product.variants.map((variant) => ({
          productId: product.id,
          id: variant.id,
          label: variant.label,
          price: variant.price.toFixed(2),
        })),
        skipDuplicates: true,
      });
    }

    if (product.images?.length) {
      for (let i = 0; i < product.images.length; i++) {
        const img = product.images[i];
        const existingImg = await db.productImage.findFirst({
          where: { productId: product.id, url: img.src },
        });
        if (!existingImg) {
          await db.productImage.create({
            data: {
              productId: product.id,
              url: img.src,
              alt: img.alt || product.name,
              position: i,
              isPrimary: i === 0,
            },
          });
        }
      }
    }
  }

  console.log(`Catalogue seed: ${created} new products, ${products.length} frontend products inspected.`);
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log('Admin bootstrap skipped: set ADMIN_EMAIL and ADMIN_PASSWORD locally if needed.');
    return;
  }
  if (password.length < 12) throw Error('Admin password must contain at least 12 characters.');
  if (await db.user.findUnique({ where: { email } })) {
    console.log('Admin bootstrap skipped: account already exists; no privileges were changed.');
    return;
  }
  await db.user.create({
    data: {
      email,
      name: 'Store Administrator',
      passwordHash: await bcrypt.hash(password, 12),
      role: 'ADMIN',
    },
  });
  console.log('Bootstrap admin created; remove admin credentials from your environment.');
}

async function seedPassportAndVoting() {
  // 1. Passport rules
  await db.passportRule.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      stampsGoal: passportConfig.stampsGoal,
      stampRule: passportConfig.stampRule,
      rewardDescription: passportConfig.rewardDescription,
      rewardValueCap: passportConfig.rewardValueCap ? passportConfig.rewardValueCap.toFixed(2) : null,
      seriesGoal: passportConfig.seriesGoal,
    },
    update: {},
  });

  // 2. Drop proposals and directions
  for (let i = 0; i < dropProposals.length; i++) {
    const p = dropProposals[i];
    await db.dropProposal.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        theme: p.theme,
        pitch: p.pitch,
        motif: p.motif,
        color: p.color,
        status: 'OPEN',
        resultsPublic: false,
        displayOrder: i,
        directions: {
          create: p.directions.map((d) => ({
            id: d.id,
            name: d.name,
            description: d.description,
          })),
        },
      },
      update: {
        theme: p.theme,
        pitch: p.pitch,
        motif: p.motif,
        color: p.color,
      },
    });
  }

  console.log('Passport and Voting seeded.');
}

async function main() {
  await seedCatalogue();
  await seedAdmin();
  await seedPassportAndVoting();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
