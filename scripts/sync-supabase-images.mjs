import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const SUPABASE_URL = 'https://iarclkcnxpbbxxpfwamd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_WoCLL6yGouN7AtxgjRgqHg_VzBi89Ab';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function syncImages() {
  console.log('1. Signing in as store admin...');
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'stickitup@gmail.com',
    password: 'Iloveyou3000',
  });

  if (authErr || !auth.session) {
    console.error('Admin authentication failed:', authErr);
    process.exit(1);
  }
  console.log('Authenticated as admin:', auth.user.id);

  console.log('2. Loading public/products-catalogue.json...');
  const products = JSON.parse(fs.readFileSync('public/products-catalogue.json', 'utf8'));

  const allImages = [];
  for (const p of products) {
    if (p.images && p.images.length) {
      for (const img of p.images) {
        if (!img.url) continue;
        allImages.push({
          productId: p.id,
          url: img.url,
          alt: img.alt || p.name,
          position: img.position ?? 0,
          isPrimary: img.isPrimary ?? false,
        });
      }
    }
  }

  console.log(`Extracted ${allImages.length} images from ${products.length} products.`);

  const batchSize = 150;
  let synced = 0;

  for (let i = 0; i < allImages.length; i += batchSize) {
    const batch = allImages.slice(i, i + batchSize);
    const { error } = await supabase
      .from('ProductImage')
      .upsert(batch, { onConflict: 'productId,url' });

    if (error) {
      console.error(`Error syncing batch at offset ${i}:`, error.message);
    } else {
      synced += batch.length;
      process.stdout.write(`\rSynced ${synced} / ${allImages.length} images...`);
    }
  }

  console.log('\n3. Image sync completed!');

  // Verify count
  const { count } = await supabase.from('ProductImage').select('*', { count: 'exact', head: true });
  console.log(`Total ProductImage records in Supabase Cloud: ${count}`);
}

syncImages().catch(err => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
