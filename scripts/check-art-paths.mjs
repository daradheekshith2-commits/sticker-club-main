/**
 * check-art-paths.mjs
 *
 * Build-time check: ensures every image path referenced by CategoryDoors
 * exists in public/. Fails (exit 1) if any file is missing so the CI build
 * catches broken references before they reach the browser.
 *
 * Called automatically by the `prebuild` hook in package.json.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

// Keep this list in sync with the srcSet values in CategoryDoors.
const REQUIRED = [
  'public/category-art/stickers-640.webp',
  'public/category-art/stickers-1024.webp',
  'public/category-art/posters-640.webp',
  'public/category-art/posters-1024.webp',
  'public/category-art/custom-640.webp',
  'public/category-art/custom-1024.webp',
];

let missing = false;
for (const rel of REQUIRED) {
  const abs = resolve(root, rel);
  if (!existsSync(abs)) {
    console.error(`❌  Missing required asset: ${rel}`);
    console.error(`    Run 'npm run art:build' to generate it.`);
    missing = true;
  }
}

if (!missing) {
  console.log('✅  All category-art assets present.');
} else {
  process.exit(1);
}

