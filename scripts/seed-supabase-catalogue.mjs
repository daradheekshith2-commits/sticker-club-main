import fs from 'node:fs';

const raw = JSON.parse(fs.readFileSync('public/products-catalogue.json', 'utf8'));

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

const batchSize = 100;
const batches = [];

for (let i = 0; i < raw.length; i += batchSize) {
  const slice = raw.slice(i, i + batchSize);
  const pValues = [];
  const invValues = [];
  const catValues = [];
  const imgValues = [];
  const varValues = [];

  for (const p of slice) {
    pValues.push(`(${escapeSql(p.id)}, ${escapeSql(p.slug)}, ${escapeSql(p.name)}, ${escapeSql(p.description)}, ${Number(p.price) || 0}, ${escapeSql(p.active ?? true)}, ${escapeSql(p.status ?? 'PUBLISHED')}, ${escapeSql(p.productType ?? 'single')}, ${escapeSql(p.category ?? 'stickers')}, ${escapeSql(p.featured ?? false)}, ${escapeSql(p.isNew ?? false)}, ${p.displayOrder ?? 0}, ${escapeSql(p.packQuantity)}, ${escapeSql(p.dimensions)}, ${escapeSql(p.material)}, ${escapeSql(p.finish)}, ${escapeSql(p.note)}, ${escapeSql(p.rarity)}, ${escapeSql(p.seriesId)}, ${escapeSql(p.metadata)})`);

    if (p.inventory) {
      invValues.push(`(${escapeSql(p.id)}, ${p.inventory.quantity ?? 100})`);
    } else {
      invValues.push(`(${escapeSql(p.id)}, 100)`);
    }

    if (p.categories?.length) {
      for (const c of p.categories) {
        catValues.push(`(${escapeSql(p.id)}, ${escapeSql(c.categoryId)})`);
      }
    }

    if (p.images?.length) {
      for (const img of p.images) {
        imgValues.push(`(${escapeSql(p.id)}, ${escapeSql(img.url)}, ${escapeSql(img.alt ?? '')}, ${img.position ?? 0}, ${escapeSql(img.isPrimary ?? false)})`);
      }
    }

    if (p.variants?.length) {
      for (const v of p.variants) {
        varValues.push(`(${escapeSql(p.id)}, ${escapeSql(v.id)}, ${escapeSql(v.label)}, ${Number(v.price) || 0})`);
      }
    }
  }

  let sql = `INSERT INTO public."Product" (id, slug, name, description, price, active, status, "productType", category, featured, "isNew", "displayOrder", "packQuantity", dimensions, material, finish, note, rarity, "seriesId", metadata)\nVALUES\n  ${pValues.join(',\n  ')}\nON CONFLICT (id) DO UPDATE SET\n  price = EXCLUDED.price,\n  active = EXCLUDED.active,\n  status = EXCLUDED.status;\n\n`;

  if (invValues.length) {
    sql += `INSERT INTO public."Inventory" ("productId", quantity)\nVALUES\n  ${invValues.join(',\n  ')}\nON CONFLICT ("productId") DO UPDATE SET quantity = EXCLUDED.quantity;\n\n`;
  }

  if (catValues.length) {
    sql += `INSERT INTO public."ProductCategory" ("productId", "categoryId")\nVALUES\n  ${catValues.join(',\n  ')}\nON CONFLICT ("productId", "categoryId") DO NOTHING;\n\n`;
  }

  if (imgValues.length) {
    sql += `INSERT INTO public."ProductImage" ("productId", url, alt, position, "isPrimary")\nVALUES\n  ${imgValues.join(',\n  ')}\nON CONFLICT DO NOTHING;\n\n`;
  }

  if (varValues.length) {
    sql += `INSERT INTO public."ProductVariant" ("productId", id, label, price)\nVALUES\n  ${varValues.join(',\n  ')}\nON CONFLICT ("productId", id) DO NOTHING;\n\n`;
  }

  batches.push(sql);
}

fs.rmSync('scripts/seed-batches', { recursive: true, force: true });
fs.mkdirSync('scripts/seed-batches', { recursive: true });
batches.forEach((b, idx) => {
  fs.writeFileSync(`scripts/seed-batches/batch_${idx + 1}.sql`, b, 'utf8');
});

console.log(`Generated ${batches.length} batch files for ${raw.length} products.`);
