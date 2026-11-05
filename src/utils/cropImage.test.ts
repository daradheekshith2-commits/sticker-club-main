import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePrintQuality,
  getAspectValue,
  getRadianAngle,
  getSheetAspectRatio,
  rotateSize,
} from './cropImage';

test('getRadianAngle converts degrees to radians correctly', () => {
  assert.equal(getRadianAngle(0), 0);
  assert.equal(getRadianAngle(180), Math.PI);
  assert.equal(getRadianAngle(90), Math.PI / 2);
  assert.equal(getRadianAngle(360), Math.PI * 2);
});

test('rotateSize calculates rotated bounding box correctly', () => {
  // 0 deg: same size
  const unrotated = rotateSize(100, 200, 0);
  assert.equal(Math.round(unrotated.width), 100);
  assert.equal(Math.round(unrotated.height), 200);

  // 90 deg: width and height swap
  const rotated90 = rotateSize(100, 200, 90);
  assert.equal(Math.round(rotated90.width), 200);
  assert.equal(Math.round(rotated90.height), 100);

  // 180 deg: same size
  const rotated180 = rotateSize(100, 200, 180);
  assert.equal(Math.round(rotated180.width), 100);
  assert.equal(Math.round(rotated180.height), 200);
});

test('getSheetAspectRatio returns exact physical paper ratio', () => {
  // A4 portrait is 21 x 29.7 cm
  const a4p = getSheetAspectRatio('a4', 'portrait');
  assert.ok(Math.abs(a4p - 21 / 29.7) < 0.001);

  // A4 landscape is 29.7 x 21 cm
  const a4l = getSheetAspectRatio('a4', 'landscape');
  assert.ok(Math.abs(a4l - 29.7 / 21) < 0.001);

  // A3 portrait is 29.7 x 42 cm
  const a3p = getSheetAspectRatio('a3', 'portrait');
  assert.ok(Math.abs(a3p - 29.7 / 42) < 0.001);
});

test('getAspectValue provides correct presets', () => {
  assert.equal(getAspectValue('square', 'a4'), 1);
  assert.equal(getAspectValue('4:5', 'a4'), 0.8);
  assert.equal(getAspectValue('16:9', 'a4'), 16 / 9);
  assert.equal(getAspectValue('free', 'a4', 'portrait', 2.5), 2.5);
});

test('calculatePrintQuality detects high and low resolution crops', () => {
  // 3000 x 4200 image on A4 (21 x 29.7 cm = 8.27 x 11.69 inches)
  // Uncropped: ~360 DPI -> excellent
  const highRes = calculatePrintQuality(3000, 4200, { x: 0, y: 0, width: 100, height: 100 }, 'a4', 'portrait');
  assert.ok(highRes.dpi >= 300);
  assert.equal(highRes.isLowRes, false);
  assert.equal(highRes.qualityLevel, 'excellent');

  // Cropped to tiny 10% x 10% on A4 -> ~36 DPI -> low
  const tightCrop = calculatePrintQuality(3000, 4200, { x: 0, y: 0, width: 10, height: 10 }, 'a4', 'portrait');
  assert.ok(tightCrop.dpi < 100);
  assert.equal(tightCrop.isLowRes, true);
  assert.equal(tightCrop.qualityLevel, 'low');
});
