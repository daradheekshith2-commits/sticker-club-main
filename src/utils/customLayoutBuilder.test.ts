import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getLayout } from '../data/wallLayouts';
import { wallPrice } from './customWall';
import {
  autoArrangeSlots,
  calculateCustomSlotsPrice,
  checkOverlap,
  createCustomSlot,
  createCustomWallLayout,
  customSlotsBreakdown,
  getOverlappingSlotIds,
  getSlotDimensions,
} from './customLayoutBuilder';

test('real paper dimensions: A5, A4, A3', () => {
  assert.deepEqual(getSlotDimensions('a5', 'portrait'), { w: 14.8, h: 21 });
  assert.deepEqual(getSlotDimensions('a5', 'landscape'), { w: 21, h: 14.8 });
  assert.deepEqual(getSlotDimensions('a4', 'portrait'), { w: 21, h: 29.7 });
  assert.deepEqual(getSlotDimensions('a4', 'landscape'), { w: 29.7, h: 21 });
  assert.deepEqual(getSlotDimensions('a3', 'portrait'), { w: 29.7, h: 42 });
  assert.deepEqual(getSlotDimensions('a3', 'landscape'), { w: 42, h: 29.7 });
});

test('pricing: A5 = ₹90, A4 = ₹120, A3 = ₹150 and example 3 A5 + 2 A4 + 1 A3 = ₹660', () => {
  const slots = [
    createCustomSlot('a5', 0, 0),
    createCustomSlot('a5', 20, 0),
    createCustomSlot('a5', 40, 0),
    createCustomSlot('a4', 0, 30),
    createCustomSlot('a4', 30, 30),
    createCustomSlot('a3', 60, 0),
  ];

  const total = calculateCustomSlotsPrice(slots);
  assert.equal(total, 660, '3 A5 (270) + 2 A4 (240) + 1 A3 (150) must equal 660');

  const breakdown = customSlotsBreakdown(slots);
  assert.deepEqual(breakdown, [
    { size: 'a3', label: 'A3', count: 1, unit: 150, total: 150 },
    { size: 'a4', label: 'A4', count: 2, unit: 120, total: 240 },
    { size: 'a5', label: 'A5', count: 3, unit: 90, total: 270 },
  ]);
});

test('existing presets recalculated prices match requirements', () => {
  const compact = getLayout('compact')!;
  assert.equal(wallPrice(compact), 510, 'Compact: 1 A3 + 4 A5 = 510');

  const classic = getLayout('classic')!;
  assert.equal(wallPrice(classic), 840, 'Classic: 1 A3 + 2 A4 + 5 A5 = 840');

  const studio = getLayout('studio')!;
  assert.equal(wallPrice(studio), 1020, 'Studio: 4 A4 + 6 A5 = 1020');

  const large = getLayout('large')!;
  assert.equal(wallPrice(large), 1530, 'Large: 1 A3 + 4 A4 + 10 A5 = 1530');
});

test('overlap detection flags intersecting sheets and ignores non-intersecting sheets', () => {
  const a = createCustomSlot('a4', 10, 10, 'portrait', 1, 's1');
  const b = createCustomSlot('a4', 15, 15, 'portrait', 2, 's2'); // overlaps a
  const c = createCustomSlot('a4', 50, 50, 'portrait', 3, 's3'); // far away, no overlap

  assert.ok(checkOverlap(a, b));
  assert.ok(checkOverlap(b, a));
  assert.ok(!checkOverlap(a, c));
  assert.ok(!checkOverlap(b, c));

  const overlaps = getOverlappingSlotIds([a, b, c]);
  assert.equal(overlaps.has('s1'), true);
  assert.equal(overlaps.has('s2'), true);
  assert.equal(overlaps.has('s3'), false);
});

test('auto-arrange resolves overlaps and packs sheets neatly', () => {
  // Initially overlapping sheets
  const s1 = createCustomSlot('a3', 10, 10, 'portrait', 1, 's1');
  const s2 = createCustomSlot('a4', 10, 10, 'portrait', 2, 's2');
  const s3 = createCustomSlot('a5', 10, 10, 'portrait', 3, 's3');

  assert.ok(getOverlappingSlotIds([s1, s2, s3]).size > 0);

  const arranged = autoArrangeSlots([s1, s2, s3], 130);
  assert.equal(arranged.length, 3);
  const arrangedOverlaps = getOverlappingSlotIds(arranged);
  assert.equal(arrangedOverlaps.size, 0, 'Auto-arranged slots must not overlap');
});

test('createCustomWallLayout produces a valid WallLayout', () => {
  const slots = [
    createCustomSlot('a4', 10, 10, 'portrait', 1, 's1'),
    createCustomSlot('a5', 35, 10, 'landscape', 2, 's2'),
  ];
  const layout = createCustomWallLayout(slots);
  assert.equal(layout.id, 'custom');
  assert.equal(layout.isCustom, true);
  assert.equal(layout.slots.length, 2);
  assert.equal(wallPrice(layout), 120 + 90);
});
