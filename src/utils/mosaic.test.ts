import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fillColumn, loopSeconds, splitIntoColumns, tileAspect } from './mosaic';

test('every image is used exactly once across the columns', () => {
  const items = Array.from({ length: 116 }, (_, i) => i);
  const cols = splitIntoColumns(items, 3);
  assert.equal(cols.length, 3);
  assert.deepEqual(cols.flat().sort((a, b) => a - b), items);
  assert.deepEqual(cols.map((c) => c.length), [39, 39, 38]);
  assert.deepEqual(splitIntoColumns([], 3), [[], [], []]);
});

test('short columns repeat whole until long enough; long ones are untouched', () => {
  assert.deepEqual(fillColumn(['a', 'b', 'c'], 7), ['a', 'b', 'c', 'a', 'b', 'c', 'a', 'b', 'c']);
  assert.equal(fillColumn(Array.from({ length: 39 }, (_, i) => i), 10).length, 39);
  assert.deepEqual(fillColumn([], 10), []);
});

test('tile shapes follow the image but stay within range', () => {
  assert.equal(tileAspect(1000, 1000), 1);
  assert.equal(tileAspect(1200, 800), 1.45);
  assert.equal(tileAspect(400, 2000), 0.72);
  assert.equal(tileAspect(0, 0), 1);
});

test('loop duration scales with column length and factor', () => {
  assert.equal(loopSeconds(10, 1), 45);
  assert.ok(loopSeconds(39, 1.2) > loopSeconds(39, 1));
});
