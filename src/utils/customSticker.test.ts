import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CUSTOM_STICKER_MAX_QTY, customStickerFinishes, customStickerSizes } from '../data/customStickerOptions';
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
  sizeId: 'medium',
  finishId: 'standard',
  shape: 'rounded',
  quantity: 5,
  rightsConfirmed: true,
  ...over,
});

test('options data is sane and provisional', () => {
  assert.deepEqual(customStickerSizes.map((s) => s.label), ['Small', 'Medium', 'Large']);
  for (const s of customStickerSizes) assert.ok(Number.isInteger(s.unitPrice) && s.unitPrice > 0);
  // No size is presented with unconfirmed physical dimensions.
  assert.ok(customStickerSizes.every((s) => s.dimensions === null));
  assert.ok(customStickerFinishes.some((f) => f.surcharge === 0), 'a no-extra-cost finish exists');
});

test('price = (size price + finish surcharge) × quantity', () => {
  const medium = customStickerSizes.find((s) => s.id === 'medium')!.unitPrice;
  const gloss = customStickerFinishes.find((f) => f.id === 'gloss')!.surcharge;
  assert.equal(customStickerUnitPrice('medium', 'gloss'), medium + gloss);
  assert.equal(customStickerTotal('medium', 'gloss', 4), 4 * (medium + gloss));
  assert.equal(customStickerUnitPrice('huge', 'standard'), null);
  assert.equal(customStickerTotal('medium', 'standard', 0), null);
  assert.equal(customStickerLabel('large', 'standard'), 'Custom sticker · Large · Standard');
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
  const config = toStickerConfig(draft({ sizeId: 'small' }));
  assert.equal(config.label, 'Custom sticker · Small · Standard');
  assert.equal(config.unitPriceAtAdd, customStickerUnitPrice('small', 'standard'));
  assert.throws(() => toStickerConfig(draft({ rightsConfirmed: false })));
});
