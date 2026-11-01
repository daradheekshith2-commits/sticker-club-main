import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');

test('all category art images referenced by CategoryDoors exist in public/category-art', () => {
  const cards = ['stickers', 'posters', 'custom'];
  const widths = [640, 1024];

  for (const card of cards) {
    for (const width of widths) {
      const relPath = `public/category-art/${card}-${width}.webp`;
      const absPath = resolve(root, relPath);
      assert.ok(
        existsSync(absPath),
        `Missing category art file: ${relPath}. Run "npm run art:build" to generate it.`
      );
    }
  }
});

