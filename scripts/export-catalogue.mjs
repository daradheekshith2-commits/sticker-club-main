import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.resolve(rootDir, 'public');

function scanPublicFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(scanPublicFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

async function exportCatalogue() {
  const productsOutPath = path.join(publicDir, 'products-catalogue.json');
  const categoriesOutPath = path.join(publicDir, 'categories-catalogue.json');

  console.log('📦 Starting catalogue export for production static fallback...');

  // 1. Build filename map from public directory
  const allPublicFiles = scanPublicFiles(publicDir);
  const fileMap = new Map();
  for (const file of allPublicFiles) {
    const rel = '/' + path.relative(publicDir, file).replace(/\\/g, '/');
    const fn = path.basename(file).toLowerCase();
    fileMap.set(fn, rel);
  }
  console.log(`🔍 Indexed ${fileMap.size} static public assets.`);

  // 2. Fetch products and categories from running backend
  let products = [];
  let categories = [];
  try {
    const prodRes = await fetch('http://localhost:5000/api/products');
    if (!prodRes.ok) throw new Error(`HTTP ${prodRes.status}`);
    products = await prodRes.json();

    const catRes = await fetch('http://localhost:5000/api/categories').catch(() => null);
    if (catRes && catRes.ok) {
      categories = await catRes.json();
    }
  } catch (err) {
    console.warn('⚠️ Could not connect to backend on port 5000:', err.message);
    if (fs.existsSync(productsOutPath)) {
      console.log('ℹ️ Using existing pre-generated products-catalogue.json in public/.');
      return;
    }
    console.error('❌ No pre-existing products-catalogue.json found to fall back on.');
    process.exit(1);
  }

  console.log(`Fetched ${products.length} products and ${categories.length} categories.`);

  // 3. Remap image URLs to static public URLs
  let remappedCount = 0;
  const processedProducts = products.map((prod) => {
    const images = (prod.images || []).map((img) => {
      const fn = path.basename(img.url).toLowerCase();
      const mapped = fileMap.get(fn);
      if (mapped) {
        remappedCount++;
        return {
          ...img,
          url: mapped,
        };
      }
      return {
        ...img,
        url: img.url.replace(/\\/g, '/'),
      };
    });

    return {
      ...prod,
      images,
      active: prod.active !== false && prod.status === 'PUBLISHED',
      status: 'PUBLISHED',
    };
  });

  console.log(`🖼️ Remapped ${remappedCount} image URLs to static public paths.`);

  // 4. Write output files
  fs.writeFileSync(productsOutPath, JSON.stringify(processedProducts, null, 2), 'utf-8');
  console.log(`✅ Saved ${processedProducts.length} products to ${productsOutPath}`);

  fs.writeFileSync(categoriesOutPath, JSON.stringify(categories, null, 2), 'utf-8');
  console.log(`✅ Saved ${categories.length} categories to ${categoriesOutPath}`);
}

exportCatalogue().catch((err) => {
  console.error('Fatal export error:', err);
  process.exit(1);
});
