#!/usr/bin/env node
/**
 * Builds src/data/heroStickers.generated.ts from the images in public/hero-stickers/.
 *
 *   node scripts/generate-hero-sticker-manifest.mjs      (also runs before `npm run dev` / `npm run build`)
 *
 * Why a script: Vite serves files in public/ as-is and the browser can't list a
 * folder, so the homepage needs a list of real filenames. This script reads each
 * file's header (no dependencies) to get its true width/height and whether it has
 * transparency, skips anything unsupported or unreadable, and reports the result.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const folder = path.join(root, 'public', 'hero-stickers');
const outFile = path.join(root, 'src', 'data', 'heroStickers.generated.ts');
const LARGE_FILE_BYTES = 1.5 * 1024 * 1024;

// ---------- Reading image headers ----------

function readPng(b) {
  if (b.length < 33 || b.readUInt32BE(0) !== 0x89504e47) return null;
  const width = b.readUInt32BE(16);
  const height = b.readUInt32BE(20);
  const colorType = b[25];
  // Alpha channel (types 4, 6) or a tRNS transparency chunk.
  let transparent = colorType === 4 || colorType === 6;
  for (let i = 8; !transparent && i + 8 <= b.length; ) {
    const len = b.readUInt32BE(i);
    const type = b.toString('ascii', i + 4, i + 8);
    if (type === 'tRNS') transparent = true;
    if (type === 'IDAT' || type === 'IEND') break;
    i += 12 + len;
  }
  return { width, height, transparent, format: 'png' };
}

function readJpeg(b) {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    const len = b.readUInt16BE(i + 2);
    // SOF0–SOF15, except DHT (C4), JPG (C8) and DAC (CC)
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7), transparent: false, format: 'jpeg' };
    }
    i += 2 + len;
  }
  return null;
}

function readWebp(b) {
  if (b.length < 30 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = b.toString('ascii', 12, 16);
  if (chunk === 'VP8X') {
    return {
      transparent: (b[20] & 0x10) !== 0,
      width: 1 + b.readUIntLE(24, 3),
      height: 1 + b.readUIntLE(27, 3),
      format: 'webp',
    };
  }
  if (chunk === 'VP8L') {
    const bits = b.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff), transparent: ((bits >> 28) & 1) === 1, format: 'webp' };
  }
  if (chunk === 'VP8 ') {
    return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff, transparent: false, format: 'webp' };
  }
  return null;
}

function readAvif(b) {
  if (b.length < 16 || b.toString('ascii', 4, 8) !== 'ftyp') return null;
  const brand = b.toString('ascii', 8, 12);
  if (brand !== 'avif' && brand !== 'avis' && !b.toString('ascii', 8, 64).includes('avif')) return null;
  const at = b.indexOf('ispe');
  if (at < 0 || at + 16 > b.length) return null;
  const width = b.readUInt32BE(at + 8);
  const height = b.readUInt32BE(at + 12);
  const transparent = b.includes('auxiliary:alpha') || b.includes('auxl');
  return { width, height, transparent, format: 'avif' };
}

/** SVGs are only accepted when they contain no scripts, event handlers or external references. */
function readSvg(b) {
  const text = b.toString('utf8');
  if (!/<svg[\s>]/i.test(text)) return null;
  if (/<script|\son[a-z]+\s*=|<foreignObject|(?:xlink:)?href\s*=\s*["']\s*(?:https?:|\/\/|data:text)/i.test(text)) return { unsafe: true };
  const vb = text.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  const w = text.match(/<svg[^>]*\swidth\s*=\s*["']([\d.]+)/i);
  const h = text.match(/<svg[^>]*\sheight\s*=\s*["']([\d.]+)/i);
  const width = Math.round(Number(vb?.[1] ?? w?.[1] ?? 0));
  const height = Math.round(Number(vb?.[2] ?? h?.[1] ?? 0));
  if (!width || !height) return null;
  return { width, height, transparent: true, format: 'svg' };
}

const readers = { '.png': readPng, '.jpg': readJpeg, '.jpeg': readJpeg, '.webp': readWebp, '.avif': readAvif, '.svg': readSvg };

// ---------- Helpers ----------

/** "IMG_2041-final copy.png" → a readable label; camera-style names become a generic label. */
function labelFor(file) {
  const base = file.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!base || /^(img|dsc|pxl|screenshot|image)\s?\d+/i.test(base) || /^\d+$/.test(base)) return 'Sticker artwork';
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function keyFor(file, used) {
  let key = file.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sticker';
  let n = 2;
  const original = key;
  while (used.has(key)) key = `${original}-${n++}`;
  used.add(key);
  return key;
}

const naturalSort = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

// ---------- Main ----------

const found = fs.existsSync(folder) ? fs.readdirSync(folder, { withFileTypes: true }).filter((d) => d.isFile()).map((d) => d.name) : null;
const files = (found ?? []).filter((f) => !f.startsWith('.')).sort(naturalSort);
const entries = [];
const skipped = [];
const large = [];
const usedKeys = new Set();

for (const file of files) {
  const ext = path.extname(file).toLowerCase();
  const reader = readers[ext];
  if (!reader) {
    skipped.push(`${file} (unsupported type)`);
    continue;
  }
  const full = path.join(folder, file);
  let info = null;
  try {
    info = reader(fs.readFileSync(full));
  } catch {
    info = null;
  }
  if (info?.unsafe) {
    skipped.push(`${file} (SVG contains scripts or external references)`);
    continue;
  }
  if (!info || !info.width || !info.height) {
    skipped.push(`${file} (not a readable ${ext.slice(1).toUpperCase()} image)`);
    continue;
  }
  const size = fs.statSync(full).size;
  if (size > LARGE_FILE_BYTES) large.push(`${file} (${(size / 1024 / 1024).toFixed(1)} MB)`);
  entries.push({
    key: keyFor(file, usedKeys),
    src: `${process.env.GITHUB_PAGES === 'true' ? '/sticker-club/' : '/'}hero-stickers/${encodeURIComponent(file)}`,
    alt: labelFor(file),
    width: info.width,
    height: info.height,
    transparent: info.transparent,
    format: info.format,
  });
}

const banner = `/**
 * AUTO-GENERATED by scripts/generate-hero-sticker-manifest.mjs — do not edit by hand.
 * Source folder: public/hero-stickers/ (${entries.length} usable image${entries.length === 1 ? '' : 's'} of ${files.length} file${files.length === 1 ? '' : 's'} found).
 * Re-run \`npm run hero:manifest\` after adding or removing images (it also runs before dev and build).
 */
import type { HeroStickerFile } from './heroStickers';

export const heroStickerFiles: HeroStickerFile[] = ${JSON.stringify(entries, null, 2)};
`;
fs.mkdirSync(path.dirname(outFile), { recursive: true });
const previous = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';
if (previous !== banner) fs.writeFileSync(outFile, banner);

// ---------- Report ----------
if (found === null) {
  console.log(`[hero stickers] Folder not found: ${path.relative(root, folder)} — the homepage will use its fallback artwork.`);
} else {
  console.log(`[hero stickers] ${entries.length} of ${files.length} file(s) in ${path.relative(root, folder)} added to the homepage mosaic.`);
}
if (skipped.length) console.log(`[hero stickers] Skipped ${skipped.length}:\n  - ${skipped.join('\n  - ')}`);
if (large.length) console.log(`[hero stickers] Consider compressing these large files (they slow the homepage):\n  - ${large.join('\n  - ')}`);
