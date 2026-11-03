import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CUSTOM_STICKER_MAX_QTY,
  calculateCustomStickerPrice,
  customStickerFinishes,
  customStickerSizes,
} from '../data/customStickerOptions';
import {
  customStickerLabel,
  customStickerTotal,
  customStickerUnitPrice,
  isValidStickerQuantity,
  stickerDraftProblem,
  toStickerConfig,
  type StickerDraft,
} from './customSticker';

const draft = (over: Partial<StickerDraft> = {}): StickerDraft => ({
  image: { source: 'url', url: 'https://example.com/a.png', width: 800, height: 800 },
  sizeId: '5cm',
  finishId: 'standard',
  shape: 'rounded',
  quantity: 5,
  rightsConfirmed: true,
  ...over,
});

test('options data has 5cmx5cm, 6cmx6cm and custom size with exact pricing', () => {
  assert.deepEqual(customStickerSizes.map((s) => s.label), ['5cm × 5cm', '6cm × 6cm', 'Custom']);
  for (const s of customStickerSizes) assert.ok(Number.isInteger(s.unitPrice) && s.unitPrice > 0);
  assert.equal(customStickerSizes.find((s) => s.id === '5cm')?.unitPrice, 20);
  assert.equal(customStickerSizes.find((s) => s.id === '6cm')?.unitPrice, 29);
  assert.ok(customStickerFinishes.some((f) => f.surcharge === 0), 'a no-extra-cost finish exists');
});

test('automated custom pricing: 1cm² = 0.8 rs formula', () => {
  assert.equal(calculateCustomStickerPrice(5, 5), 20);
  assert.equal(calculateCustomStickerPrice(6, 6), 29);
  assert.equal(calculateCustomStickerPrice(7, 7), 39);
  assert.equal(calculateCustomStickerPrice(10, 10), 80);
  assert.equal(calculateCustomStickerPrice(3, 3), 7);
});

test('price = (size price + finish surcharge) × quantity', () => {
  const size5cm = customStickerSizes.find((s) => s.id === '5cm')!.unitPrice;
  const gloss = customStickerFinishes.find((f) => f.id === 'gloss')!.surcharge;
  assert.equal(customStickerUnitPrice('5cm', 'gloss'), size5cm + gloss);
  assert.equal(customStickerTotal('5cm', 'gloss', 4), 4 * (size5cm + gloss));
  assert.equal(customStickerUnitPrice('huge', 'standard'), null);
  assert.equal(customStickerTotal('5cm', 'standard', 0), null);
  assert.equal(customStickerLabel('6cm', 'standard'), 'Custom sticker · 6cm × 6cm · Standard');
  assert.equal(
    customStickerLabel('custom', 'standard', { width: 8, height: 8 }),
    'Custom sticker · 8×8cm · Standard'
  );
});

test('quantity validation', () => {
  assert.ok(isValidStickerQuantity(1) && isValidStickerQuantity(CUSTOM_STICKER_MAX_QTY));
  for (const q of [0, -1, 2.5, CUSTOM_STICKER_MAX_QTY + 1, Number.NaN]) assert.ok(!isValidStickerQuantity(q), String(q));
});

test('a sticker needs an image, valid options and rights confirmation', () => {
  assert.match(stickerDraftProblem(draft({ image: null }))!, /image/);
  assert.match(stickerDraftProblem(draft({ sizeId: 'xl' }))!, /size/);
  assert.match(stickerDraftProblem(draft({ quantity: 99 }))!, /Quantity/);
  assert.match(stickerDraftProblem(draft({ rightsConfirmed: false }))!, /rights/);
  assert.equal(stickerDraftProblem(draft()), null);
  const config = toStickerConfig(draft({ sizeId: '5cm' }));
  assert.equal(config.label, 'Custom sticker · 5cm × 5cm · Standard');
  assert.equal(config.unitPriceAtAdd, customStickerUnitPrice('5cm', 'standard'));
  assert.throws(() => toStickerConfig(draft({ rightsConfirmed: false })));
});
