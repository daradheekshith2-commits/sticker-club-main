/**
 * build-category-art.mjs
 *
 * Converts the three category art JPEGs (which have an opaque #F7F7F7 background)
 * into WebP files with a transparent background, ready to sit on the coloured
 * category cards without a grey halo.
 *
 * Algorithm:
 *   1. Decode the JPEG into raw RGBA pixels.
 *   2. Flood-fill from every edge pixel whose colour is within `BG_TOLERANCE`
 *      of the reference background colour (#F7F7F7). "Connected to the border"
 *      means the fill cannot leak through solid content into interior white areas
 *      (e.g. white text or die-cut outlines on stickers).
 *   3. Set the alpha of every filled pixel to 0.
 *   4. Apply a 1-pixel Gaussian feather to the alpha channel so the edge is
 *      anti-aliased and does not show a jagged border on retina screens.
 *   5. Encode as WebP (quality 82, alpha preserved) at two widths: 640 px and
 *      1024 px (height scaled proportionally, object-contain style).
 *
 * Run: node scripts/build-category-art.mjs
 * Or:  npm run art:build
 *
 * Idempotent — if an output is newer than its source it is skipped (use --force
 * to rebuild everything).
 */

import sharp from 'sharp';
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(__dir, '..');

const SOURCES = [
  { name: 'stickers', src: 'art-source/category-art/stickers.jpeg', quality: 'normal' },
  { name: 'posters',  src: 'art-source/category-art/posters.jpeg',  quality: 'soft' },   // ⚠ low-res source; see FLAG
  { name: 'custom',  src: 'art-source/category-art/custom.jpeg',   quality: 'normal' },
];

const WIDTHS   = [640, 1024];
const QUALITY  = 82;            // WebP quality
const OUT_DIR  = 'public/category-art';

// Background colour to remove (the flat #F7F7F7 fill in each JPEG).
const BG_R = 0xF7, BG_G = 0xF7, BG_B = 0xF7;
// Maximum colour distance from BG to be considered background.
// Lower = tighter = keeps more of the image. 25 handles JPEG compression artifacts.
const BG_TOLERANCE = 25;

const force = process.argv.includes('--force');

function colourDistance(r, g, b) {
  const dr = r - BG_R, dg = g - BG_G, db = b - BG_B;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Flood-fill connected background pixels starting from every border pixel.
 * Returns a Uint8Array mask where 1 = background, 0 = foreground.
 *
 * @param {Uint8Array} data  - Raw RGBA pixel buffer
 * @param {number}     w     - Image width in pixels
 * @param {number}     h     - Image height in pixels
 */
function floodFillMask(data, w, h) {
  const mask  = new Uint8Array(w * h);   // 0 = keep, 1 = remove
  const queue = [];

  const pixel = (x, y) => (y * w + x) * 4;
  const isBg  = (x, y) => {
    const p = pixel(x, y);
    return colourDistance(data[p], data[p + 1], data[p + 2]) <= BG_TOLERANCE;
  };
  const enqueue = (x, y) => {
    const idx = y * w + x;
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    if (mask[idx]) return;            // already visited
    if (!isBg(x, y))   return;       // not background colour
    mask[idx] = 1;
    queue.push(x, y);
  };

  // Seed from all four edges.
  for (let x = 0; x < w; x++) { enqueue(x, 0); enqueue(x, h - 1); }
  for (let y = 0; y < h; y++) { enqueue(0, y); enqueue(w - 1, y); }

  // BFS through connected background pixels.
  let i = 0;
  while (i < queue.length) {
    const x = queue[i++], y = queue[i++];
    enqueue(x - 1, y); enqueue(x + 1, y);
    enqueue(x, y - 1); enqueue(x, y + 1);
  }

  return mask;
}

/**
 * Feather the alpha by blending each border pixel with its neighbours.
 * This gives a 1-pixel anti-aliased edge instead of a hard cutout.
 *
 * @param {Uint8Array} data  - Raw RGBA pixel buffer (mutated in place)
 * @param {Uint8Array} mask  - 1 = was removed background
 * @param {number}     w
 * @param {number}     h
 */
function featherEdge(data, mask, w, h) {
  // For each foreground pixel adjacent to at least one background pixel,
  // reduce alpha proportionally so the transition is smooth.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (mask[idx]) continue;           // already transparent
      const p = idx * 4;

      // Count how many of the 8 neighbours are background.
      let bgNeighbours = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          if (mask[ny * w + nx]) bgNeighbours++;
        }
      }

      if (bgNeighbours > 0) {
        // Reduce alpha by up to 60% for corner pixels (1 bg neighbour) and
        // up to 100% for pixels fully surrounded by background (8 bg neighbours).
        const fraction = bgNeighbours / 8;
        data[p + 3] = Math.round(data[p + 3] * (1 - fraction * 0.85));
      }
    }
  }
}

async function processImage({ name, src, quality }) {
  const srcPath = resolve(root, src);
  if (!existsSync(srcPath)) {
    console.error(`❌  Source not found: ${srcPath}`);
    process.exitCode = 1;
    return;
  }

  // Ensure output directory exists.
  const outDir = resolve(root, OUT_DIR);
  mkdirSync(outDir, { recursive: true });

  const srcMtime = statSync(srcPath).mtimeMs;

  for (const width of WIDTHS) {
    const outName = `${name}-${width}.webp`;
    const outPath = resolve(outDir, outName);

    if (!force && existsSync(outPath) && statSync(outPath).mtimeMs > srcMtime) {
      console.log(`⏭  ${outName} is up-to-date (use --force to rebuild)`);
      continue;
    }

    console.log(`🔨  Building ${outName} from ${src}…`);

    // Step 1: Resize to target width, decode to raw RGBA.
    const { data, info } = await sharp(srcPath)
      .resize({ width, withoutEnlargement: true })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width: w, height: h } = info;
    const rawData = new Uint8Array(data.buffer);

    // Step 2: Flood-fill background mask from image edges.
    const mask = floodFillMask(rawData, w, h);

    // Step 3: Zero out the alpha of background pixels.
    for (let i = 0; i < w * h; i++) {
      if (mask[i]) rawData[i * 4 + 3] = 0;
    }

    // Step 4: Feather the edge.
    featherEdge(rawData, mask, w, h);

    // Step 5: Encode as WebP.
    const webpBuf = await sharp(Buffer.from(rawData), {
      raw: { width: w, height: h, channels: 4 },
    })
      .webp({ quality: QUALITY, effort: 4, alphaQuality: 95 })
      .toBuffer();

    writeFileSync(outPath, webpBuf);

    const sizeKB = (webpBuf.length / 1024).toFixed(1);
    const removedPct = ((mask.reduce((s, v) => s + v, 0) / (w * h)) * 100).toFixed(1);
    console.log(`✅  ${outName}  ${w}×${h}  ${sizeKB} KB  (${removedPct}% pixels removed)`);

    if (quality === 'soft') {
      console.log(`⚠️   ${name}: source image is low-resolution (${srcPath}).`);
      console.log(`     Please supply a higher-resolution original for a sharper result.`);
    }
  }
}

async function verifyPaths() {
  // Emit a machine-readable check for the CI path-check script.
  const allOk = WIDTHS.flatMap(w =>
    SOURCES.map(({ name }) => {
      const p = resolve(root, OUT_DIR, `${name}-${w}.webp`);
      return existsSync(p);
    })
  ).every(Boolean);

  if (!allOk) {
    console.error('❌  Some output WebP files are missing. Run `npm run art:build` first.');
    process.exitCode = 1;
  }
}

(async () => {
  console.log('=== build-category-art ===');
  for (const source of SOURCES) {
    await processImage(source);
  }
  await verifyPaths();
  console.log('=== done ===');
})();

