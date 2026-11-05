import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getInitialState, wallReducer } from './useWallBuilder';
import type { PosterCropEdit, SlotFill } from '../types/wall';

test('useWallBuilder: setFill updates only the target sheet', () => {
  let s = getInitialState('compact'); // 5 slots
  const carFill: SlotFill = { source: 'catalogue', productId: 'pst-car-001' };
  const bikeFill: SlotFill = { source: 'catalogue', productId: 'pst-bike-002' };

  s = wallReducer(s, { type: 'setFill', index: 3, fill: carFill });
  assert.equal(s.presetFills[3]?.source, 'catalogue');
  assert.equal((s.presetFills[3] as any).productId, 'pst-car-001');

  // Other sheets remain empty
  assert.equal(s.presetFills[0], null);
  assert.equal(s.presetFills[1], null);
  assert.equal(s.presetFills[2], null);
  assert.equal(s.presetFills[4], null);

  // Fill another sheet
  s = wallReducer(s, { type: 'setFill', index: 1, fill: bikeFill });
  assert.equal((s.presetFills[1] as any).productId, 'pst-bike-002');
  assert.equal((s.presetFills[3] as any).productId, 'pst-car-001'); // Sheet 4 still car
});

test('useWallBuilder: setEdit stores independent crop and transform on selected sheet', () => {
  let s = getInitialState('compact');
  const catFill: SlotFill = { source: 'catalogue', productId: 'pst-001' };
  s = wallReducer(s, { type: 'setFill', index: 3, fill: catFill });

  const edit: PosterCropEdit = {
    crop: { x: 20, y: 30 },
    zoom: 2,
    rotation: 90,
    aspectRatio: 1 / 1.414,
    aspectMode: 'sheet',
    mode: 'contain',
    croppedArea: { x: 10, y: 10, width: 80, height: 80 },
  };

  s = wallReducer(s, { type: 'setEdit', index: 3, edit });
  const sheet4 = s.presetFills[3];
  assert.ok(sheet4);
  assert.equal(sheet4.edit?.zoom, 2);
  assert.equal(sheet4.edit?.rotation, 90);
  assert.equal(sheet4.edit?.mode, 'contain');
  assert.equal(sheet4.fit?.mode, 'contain');

  // Other sheets unaffected
  assert.equal(s.presetFills[0], null);
});

test('useWallBuilder: custom mode sheet addition, independent fills, and duplication', () => {
  let s = getInitialState('custom');
  assert.equal(s.customSlots.length, 0);

  // Add sheet 1 (A4 portrait)
  s = wallReducer(s, { type: 'addCustomSheet', size: 'a4', orientation: 'portrait' });
  assert.equal(s.customSlots.length, 1);
  const slot1 = s.customSlots[0];

  // Add sheet 2 (A3 landscape)
  s = wallReducer(s, { type: 'addCustomSheet', size: 'a3', orientation: 'landscape' });
  assert.equal(s.customSlots.length, 2);
  const slot2 = s.customSlots[1];

  // Fill sheet 1
  const photoFill: SlotFill = {
    source: 'upload',
    objectUrl: 'blob:mock-1234',
    fileName: 'vacation.jpg',
    width: 2000,
    height: 3000,
    fit: { mode: 'cover', focusX: 50, focusY: 50 },
  };
  s = wallReducer(s, { type: 'setFill', index: 0, fill: photoFill });

  // Apply crop to sheet 1
  s = wallReducer(s, {
    type: 'setEdit',
    index: 0,
    edit: {
      crop: { x: 5, y: 5 },
      zoom: 1.4,
      rotation: 0,
      mode: 'cover',
    },
  });

  // Sheet 1 has fill, Sheet 2 is still empty
  assert.ok(s.customFills[slot1.id]);
  assert.equal(s.customFills[slot1.id]?.edit?.zoom, 1.4);
  assert.equal(s.customFills[slot2.id], undefined);

  // Duplicate Sheet 1
  s = wallReducer(s, { type: 'duplicateCustomSheet', index: 0 });
  assert.equal(s.customSlots.length, 3);
  const slot3 = s.customSlots[2];

  // Duplicate has independent clone of fill and edit
  assert.ok(s.customFills[slot3.id]);
  assert.equal(s.customFills[slot3.id]?.source, 'upload');
  assert.equal(s.customFills[slot3.id]?.edit?.zoom, 1.4);

  // Modify duplicate's edit - original must remain unchanged!
  s = wallReducer(s, {
    type: 'setEdit',
    index: 2,
    edit: {
      crop: { x: 50, y: 50 },
      zoom: 3.0,
      rotation: 180,
      mode: 'contain',
    },
  });

  assert.equal(s.customFills[slot3.id]?.edit?.zoom, 3.0);
  assert.equal(s.customFills[slot3.id]?.edit?.rotation, 180);
  assert.equal(s.customFills[slot1.id]?.edit?.zoom, 1.4); // Original intact!
  assert.equal(s.customFills[slot1.id]?.edit?.rotation, 0); // Original intact!

  // Remove sheet 2 - sheets 1 and 3 remain intact!
  s = wallReducer(s, { type: 'removeCustomSheet', index: 1 });
  assert.equal(s.customSlots.length, 2);
  assert.ok(s.customFills[slot1.id]);
  assert.ok(s.customFills[slot3.id]);
});

test('useWallBuilder: changing size and toggling orientation preserves image fill', () => {
  let s = getInitialState('custom');
  s = wallReducer(s, { type: 'addCustomSheet', size: 'a5', orientation: 'portrait' });
  const slot = s.customSlots[0];

  const fill: SlotFill = { source: 'catalogue', productId: 'pst-poster-x' };
  s = wallReducer(s, { type: 'setFill', index: 0, fill });

  // Change size A5 -> A3
  s = wallReducer(s, { type: 'changeCustomSheetSize', index: 0, newSize: 'a3' });
  assert.equal(s.customSlots[0].size, 'a3');
  assert.equal((s.customFills[slot.id] as any)?.productId, 'pst-poster-x');

  // Toggle orientation portrait -> landscape
  s = wallReducer(s, { type: 'toggleCustomSheetOrientation', index: 0 });
  assert.equal(s.customSlots[0].orientation, 'landscape');
  assert.equal((s.customFills[slot.id] as any)?.productId, 'pst-poster-x');
});
