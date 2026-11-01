import { test } from 'node:test';
import assert from 'node:assert/strict';
import { builderLayouts, buildLayout, getLayout, packLayouts, paperSizes, sizeSummary } from '../data/wallLayouts';
import { posterSizes, products } from '../data/products';
import {
  builderReducer,
  filledCount,
  initialBuilderState,
  isComplete,
  isLowResolution,
  packSavings,
  priceBreakdown,
  toWallConfig,
  usesOwnImages,
  wallPrice,
} from './customWall';
import type { SlotFill } from '../types/wall';

const price = (id: string) => posterSizes.find((s) => s.id === id)!.price;

test('builder presets have the advertised poster counts', () => {
  const counts = Object.fromEntries(builderLayouts.map((l) => [l.id, l.slots.length]));
  assert.deepEqual(counts, { compact: 5, classic: 8, studio: 10, large: 15 });
});

test('slots are valid: unique ids, real sizes, inside the wall, never overlapping', () => {
  for (const layout of [...builderLayouts, ...packLayouts]) {
    const ids = new Set(layout.slots.map((s) => s.id));
    assert.equal(ids.size, layout.slots.length, `${layout.id} duplicate slot ids`);
    layout.slots.forEach((s, i) => {
      assert.equal(s.number, i + 1);
      assert.equal(s.w, paperSizes[s.size].w);
      assert.equal(s.h, paperSizes[s.size].h);
      assert.ok(s.x >= -0.001 && s.y >= -0.001 && s.x + s.w <= layout.width + 0.001 && s.y + s.h <= layout.height + 0.001, `${s.id} outside wall`);
    });
    for (const a of layout.slots)
      for (const b of layout.slots) {
        if (a === b) continue;
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        assert.ok(!overlap, `${a.id} overlaps ${b.id}`);
      }
  }
});

test('buildLayout stacks and centres items', () => {
  const l = buildLayout('t', 'T', '', [[['a5', 'a5'], 'a3']]);
  assert.equal(l.slots.length, 3);
  // stack of two A5 (21 + 3 + 21 = 45) is taller than A3 (42) → A3 centred vertically
  assert.equal(l.height, 45);
  assert.equal(l.slots[2].y, 1.5);
});

test('wall price = sum of each slot size, from posterSizes', () => {
  const compact = getLayout('compact')!;
  assert.equal(wallPrice(compact), price('a3') + 4 * price('a5'));
  const classic = getLayout('classic')!;
  assert.equal(wallPrice(classic), price('a3') + 2 * price('a4') + 5 * price('a5'));
  const breakdown = priceBreakdown(classic);
  assert.equal(breakdown.reduce((s, r) => s + r.total, 0), wallPrice(classic));
  assert.equal(sizeSummary(compact), '1 × A3 · 4 × A5');
});

test('pack savings come from our own prices and the pack layout', () => {
  const trio = products.find((p) => p.id === 'pst-002')!;
  const s = packSavings(trio)!;
  assert.equal(s.singlesTotal, 3 * price('a4'));
  assert.equal(s.saving, 3 * price('a4') - trio.price);
  // every pack's layout matches the number of prints in its artwork
  for (const p of products.filter((x) => x.wallLayoutId)) {
    assert.ok(p.art.kind === 'poster-set');
    if (p.art.kind === 'poster-set') assert.equal(getLayout(p.wallLayoutId!)!.slots.length, p.art.posters.length, p.id);
  }
});

const cat = (productId: string): SlotFill => ({ source: 'catalogue', productId });
const url = (u: string): SlotFill => ({ source: 'url', url: u, fit: { mode: 'cover', focusX: 50, focusY: 50 } });

test('builder: fill, clear, select, complete', () => {
  let s = initialBuilderState('compact');
  assert.equal(s.fills.length, 5);
  assert.ok(!isComplete(s));
  s = builderReducer(s, { type: 'setFill', index: 0, fill: cat('pst-001') });
  s = builderReducer(s, { type: 'select', index: 99 });
  assert.equal(s.selected, 4, 'select is clamped');
  assert.equal(filledCount(s), 1);
  s = builderReducer(s, { type: 'clearFill', index: 0 });
  assert.equal(filledCount(s), 0);
  for (let i = 0; i < 5; i++) s = builderReducer(s, { type: 'setFill', index: i, fill: cat('pst-004') });
  assert.ok(isComplete(s));
});

test('builder: switching layouts keeps images in order and explains what changed', () => {
  let s = initialBuilderState('classic'); // 8 slots
  for (let i = 0; i < 8; i++) s = builderReducer(s, { type: 'setFill', index: i, fill: cat('pst-005') });
  s = builderReducer(s, { type: 'select', index: 7 });
  s = builderReducer(s, { type: 'chooseLayout', layoutId: 'compact' }); // 5 slots
  assert.equal(s.fills.length, 5);
  assert.ok(s.fills.every(Boolean));
  assert.equal(s.selected, 4);
  assert.match(s.notice ?? '', /3 images were removed/);
  s = builderReducer(s, { type: 'chooseLayout', layoutId: 'studio' }); // 10 slots
  assert.equal(filledCount(s), 5);
  assert.match(s.notice ?? '', /5 new empty positions/);
});

test('builder: fit only applies to the customer’s own images', () => {
  let s = initialBuilderState('compact');
  s = builderReducer(s, { type: 'setFill', index: 0, fill: cat('pst-001') });
  const before = s;
  s = builderReducer(s, { type: 'setFit', index: 0, fit: { mode: 'contain', focusX: 0, focusY: 0 } });
  assert.equal(s, before, 'catalogue fills have no fit');
  s = builderReducer(s, { type: 'setFill', index: 1, fill: url('https://example.com/a.jpg') });
  s = builderReducer(s, { type: 'setFit', index: 1, fit: { mode: 'contain', focusX: 20, focusY: 80 } });
  const f = s.fills[1];
  assert.ok(f && f.source === 'url' && f.fit.mode === 'contain' && f.fit.focusX === 20);
});

test('toWallConfig requires a complete wall and rights confirmation for own images', () => {
  let s = initialBuilderState('compact');
  assert.throws(() => toWallConfig(s, true));
  for (let i = 0; i < 4; i++) s = builderReducer(s, { type: 'setFill', index: i, fill: cat('pst-001') });
  s = builderReducer(s, { type: 'setFill', index: 4, fill: url('https://example.com/me.png') });
  assert.ok(usesOwnImages(s));
  assert.throws(() => toWallConfig(s, false), /rights/);
  const config = toWallConfig(s, true);
  assert.equal(config.slots.length, 5);
  assert.equal(config.priceAtAdd, wallPrice(getLayout('compact')!));
  assert.equal(config.slots[2].size, 'a3');
});

test('low-resolution hint uses the slot size and never guesses without dimensions', () => {
  assert.ok(isLowResolution(400, 600, 'a4'));
  assert.ok(!isLowResolution(2400, 3400, 'a3'));
  assert.ok(!isLowResolution(undefined, undefined, 'a3'));
});
