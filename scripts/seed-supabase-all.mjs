import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const supabaseUrl = 'https://iarclkcnxpbbxxpfwamd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhcmNsa2NueHBiYnh4cGZ3YW1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1ODM4NjIsImV4cCI6MjEwOTE1OTg2Mn0.AAY78nsRR2VwTjlPPawnTYX7vghcx2mkSdgOeSc7tNA';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Authenticating as Store Administrator...');
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'stickitup@gmail.com',
  password: 'Iloveyou3000',
});

if (authError || !authData.session) {
  console.error('Login failed:', authError);
  process.exit(1);
}

console.log('Authenticated! Reading products-catalogue.json...');
const products = JSON.parse(fs.readFileSync('public/products-catalogue.json', 'utf8'));
console.log(`Total products to sync: ${products.length}`);

const batchSize = 100;
let syncedCount = 0;

for (let i = 0; i < products.length; i += batchSize) {
  const slice = products.slice(i, i + batchSize);

  const productRows = slice.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    price: Number(p.price) || 0,
    active: p.active ?? true,
    status: p.status ?? 'PUBLISHED',
    productType: p.productType ?? 'single',
    category: p.category ?? 'stickers',
    featured: p.featured ?? false,
    isNew: p.isNew ?? false,
    displayOrder: p.displayOrder ?? 0,
    packQuantity: p.packQuantity ?? null,
    dimensions: p.dimensions ?? null,
    material: p.material ?? null,
    finish: p.finish ?? null,
    note: p.note ?? null,
    rarity: p.rarity ?? null,
    seriesId: p.seriesId ?? null,
    metadata: p.metadata ?? null,
  }));

  const { error: pErr } = await supabase.from('Product').upsert(productRows, { onConflict: 'id' });
  if (pErr) {
    console.error(`Error syncing products batch ${i}:`, pErr.message);
  }

  const inventoryRows = slice.map((p) => ({
    productId: p.id,
    quantity: p.inventory?.quantity ?? 100,
  }));

  const { error: invErr } = await supabase.from('Inventory').upsert(inventoryRows, { onConflict: 'productId' });
  if (invErr) {
    console.error(`Error syncing inventory batch ${i}:`, invErr.message);
  }

  const categoryRows = [];
  const imageRows = [];
  const variantRows = [];

  for (const p of slice) {
    if (p.categories?.length) {
      for (const c of p.categories) {
        categoryRows.push({ productId: p.id, categoryId: c.categoryId });
      }
    }
    if (p.images?.length) {
      for (const img of p.images) {
        imageRows.push({
          productId: p.id,
          url: img.url,
          alt: img.alt ?? '',
          position: img.position ?? 0,
          isPrimary: img.isPrimary ?? false,
        });
      }
    }
    if (p.variants?.length) {
      for (const v of p.variants) {
        variantRows.push({
          productId: p.id,
          id: v.id,
          label: v.label,
          price: Number(v.price) || 0,
        });
      }
    }
  }

  if (categoryRows.length) {
    await supabase.from('ProductCategory').upsert(categoryRows, { onConflict: 'productId,categoryId' });
  }

  if (variantRows.length) {
    await supabase.from('ProductVariant').upsert(variantRows, { onConflict: 'productId,id' });
  }

  syncedCount += slice.length;
  process.stdout.write(`\rProgress: ${syncedCount}/${products.length} products synced.`);
}

console.log('\nAll products, inventory, categories, and variants synced to Supabase successfully!');
