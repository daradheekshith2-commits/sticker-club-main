import fs from 'node:fs';

const cat = JSON.parse(fs.readFileSync('public/products-catalogue.json', 'utf8'));
const cute = cat.filter((p) => p.id.startsWith('stk-cute-0'));

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

let sql = '';

for (const p of cute) {
  const price = Number(p.price) || 20;
  sql += `INSERT INTO "Product" ("id", "slug", "name", "description", "price", "active", "status", "productType", "category", "featured", "isNew", "displayOrder", "packQuantity", "dimensions", "material", "finish", "note", "rarity", "seriesId", "metadata", "createdAt", "updatedAt") VALUES (${escapeSql(p.id)}, ${escapeSql(p.slug)}, ${escapeSql(p.name)}, ${escapeSql(p.description)}, ${price}, ${Boolean(p.active)}, ${escapeSql(p.status || 'PUBLISHED')}, ${escapeSql(p.productType || 'single')}, ${escapeSql(p.category || 'stickers')}, ${Boolean(p.featured)}, ${Boolean(p.isNew)}, ${Number(p.displayOrder) || 200}, NULL, ${escapeSql(p.dimensions || '6cm x 6cm')}, ${escapeSql(p.material || 'Waterproof Vinyl')}, ${escapeSql(p.finish || 'Matte Laminated')}, NULL, ${escapeSql(p.rarity || 'common')}, ${escapeSql(p.seriesId || 'S03')}, NULL, NOW(), NOW()) ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "slug" = EXCLUDED."slug", "description" = EXCLUDED."description", "price" = EXCLUDED."price", "active" = EXCLUDED."active", "status" = EXCLUDED."status", "productType" = EXCLUDED."productType", "category" = EXCLUDED."category", "featured" = EXCLUDED."featured", "isNew" = EXCLUDED."isNew", "displayOrder" = EXCLUDED."displayOrder", "updatedAt" = NOW();\n`;

  if (p.images && p.images.length > 0) {
    for (let i = 0; i < p.images.length; i++) {
      const img = p.images[i];
      const imgId = 'img-' + p.id + (i > 0 ? '-' + i : '');
      sql += `INSERT INTO "ProductImage" ("id", "productId", "url", "alt", "position", "isPrimary") VALUES (${escapeSql(imgId)}, ${escapeSql(p.id)}, ${escapeSql(img.url)}, ${escapeSql(img.alt || p.name)}, ${Number(img.position) || i}, ${Boolean(img.isPrimary !== false)}) ON CONFLICT ("id") DO UPDATE SET "url" = EXCLUDED."url", "alt" = EXCLUDED."alt";\n`;
    }
  }

  sql += `INSERT INTO "ProductCategory" ("productId", "categoryId") VALUES (${escapeSql(p.id)}, 'stickers'), (${escapeSql(p.id)}, 'cute') ON CONFLICT ("productId", "categoryId") DO NOTHING;\n`;
  sql += `INSERT INTO "Inventory" ("productId", "quantity") VALUES (${escapeSql(p.id)}, ${Number(p.inventory?.quantity) || 100}) ON CONFLICT ("productId") DO UPDATE SET "quantity" = EXCLUDED."quantity";\n`;
}

fs.writeFileSync('scripts/insert-cute-stickers.sql', sql, 'utf8');
console.log(`Generated scripts/insert-cute-stickers.sql for ${cute.length} cute products (${sql.length} chars).`);

