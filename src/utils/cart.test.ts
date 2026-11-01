import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cartReducer, clampQuantity, isProductItem, isValidSelection, lineKey, MAX_QUANTITY_PER_ITEM, parseStoredCart, summariseCart } from './cart';
import { getProductById, isPurchasable } from './catalogue';

const valid = (id: string, variantId?: string) => {
  const p = getProductById(id);
  return Boolean(p && isPurchasable(p) && isValidSelection(p, variantId));
};
const find = (id: string) => getProductById(id);

test('adding the same product twice merges quantities', () => {
  let cart = cartReducer([], { type: 'add', productId: 'stk-001', quantity: 2 });
  cart = cartReducer(cart, { type: 'add', productId: 'stk-001', quantity: 3 });
  assert.deepEqual(cart, [{ productId: 'stk-001', quantity: 5 }]);
});

test('different sizes of one poster are separate lines', () => {
  let cart = cartReducer([], { type: 'add', productId: 'pst-001', variantId: 'a4', quantity: 1 });
  cart = cartReducer(cart, { type: 'add', productId: 'pst-001', variantId: 'a3', quantity: 2 });
  cart = cartReducer(cart, { type: 'add', productId: 'pst-001', variantId: 'a4', quantity: 1 });
  assert.equal(cart.length, 2);
  assert.equal(cart.find((i) => isProductItem(i) && i.variantId === 'a4')!.quantity, 2);
});

test('quantities are clamped between 1 and the max', () => {
  assert.equal(clampQuantity(0), 1);
  assert.equal(clampQuantity(2.7), 2);
  assert.equal(clampQuantity(999), MAX_QUANTITY_PER_ITEM);
  assert.equal(clampQuantity(Number.NaN), 1);
  const cart = cartReducer([], { type: 'add', productId: 'stk-001', quantity: 500 });
  assert.equal(cart[0].quantity, MAX_QUANTITY_PER_ITEM);
});

test('setting quantity to 0 removes the line; remove and clear work', () => {
  const start = [
    { productId: 'stk-001', quantity: 1 },
    { productId: 'pst-001', variantId: 'a4', quantity: 2 },
  ];
  assert.deepEqual(cartReducer(start, { type: 'setQuantity', key: lineKey('stk-001'), quantity: 0 }), [start[1]]);
  assert.deepEqual(cartReducer(start, { type: 'remove', key: lineKey('pst-001', 'a4') }), [start[0]]);
  assert.deepEqual(cartReducer(start, { type: 'clear' }), []);
});

test('totals are derived from catalogue prices, per size', () => {
  const sticker = find('stk-001')!;
  const poster = find('pst-001')!;
  const a4 = poster.variants!.find((v) => v.id === 'a4')!.price;
  const a3 = poster.variants!.find((v) => v.id === 'a3')!.price;
  const s = summariseCart(
    [
      { productId: 'stk-001', quantity: 3 },
      { productId: 'pst-001', variantId: 'a4', quantity: 2 },
      { productId: 'pst-001', variantId: 'a3', quantity: 1 },
      { productId: 'pst-001', variantId: 'xl-not-real', quantity: 1 }, // invalid size → ignored
      { productId: 'pst-001', quantity: 1 }, // size missing → ignored
      { productId: 'does-not-exist', quantity: 4 },
    ],
    find,
  );
  assert.equal(s.lines.length, 3);
  assert.equal(s.itemCount, 6);
  assert.equal(s.subtotal, 3 * sticker.price + 2 * a4 + a3);
  assert.notEqual(a4, a3, 'sizes should have different prices');
});

test('malformed stored carts are handled safely', () => {
  assert.deepEqual(parseStoredCart(null, valid), []);
  assert.deepEqual(parseStoredCart('not json{', valid), []);
  assert.deepEqual(parseStoredCart('{"a":1}', valid), []);
  const parsed = parseStoredCart(
    JSON.stringify([
      { productId: 'stk-001', quantity: 2 },
      { productId: 'stk-001', quantity: 1 }, // duplicate → merged
      { productId: 'pst-003', quantity: 1 }, // coming soon → dropped
      { productId: 'pst-001', quantity: 1 }, // poster without size → dropped
      { productId: 'pst-001', variantId: 'a4', quantity: 1 }, // ok
      { productId: 'stk-001', variantId: 'a4', quantity: 1 }, // sticker with a size → dropped
      { productId: 'ghost', quantity: 1 }, // unknown → dropped
      { productId: 'sht-001', quantity: -3 }, // invalid qty → dropped
      { productId: 'pck-001', quantity: 99 }, // clamped
      null,
      'junk',
    ]),
    valid,
  );
  assert.deepEqual(parsed, [
    { productId: 'stk-001', quantity: 3 },
    { productId: 'pst-001', variantId: 'a4', quantity: 1 },
    { productId: 'pck-001', quantity: MAX_QUANTITY_PER_ITEM },
  ]);
});

// ---------- Custom wall lines ----------
import { getLayout } from '../data/wallLayouts';
import { builderReducer, initialBuilderState, toWallConfig, wallPrice } from './customWall';
import { isWallItem, serializeCart, wallKey, itemObjectUrls, type CartItem } from './cart';

function compactWall(withUpload = false) {
  let s = initialBuilderState('compact');
  for (let i = 0; i < 5; i++) s = builderReducer(s, { type: 'setFill', index: i, fill: { source: 'catalogue', productId: 'pst-001' } });
  if (withUpload) {
    s = builderReducer(s, {
      type: 'setFill',
      index: 2,
      fill: { source: 'upload', objectUrl: 'blob:test/1', fileName: 'me.jpg', fit: { mode: 'cover', focusX: 50, focusY: 50 } },
    });
  }
  return toWallConfig(s, true);
}

test('custom walls are separate lines priced from their layout', () => {
  let cart: CartItem[] = cartReducer([], { type: 'add', productId: 'stk-001', quantity: 2 });
  cart = cartReducer(cart, { type: 'addWall', item: { kind: 'custom-wall', id: 'w1', quantity: 1, wall: compactWall() } });
  cart = cartReducer(cart, { type: 'addWall', item: { kind: 'custom-wall', id: 'w2', quantity: 2, wall: compactWall() } });
  cart = cartReducer(cart, { type: 'addWall', item: { kind: 'custom-wall', id: 'w2', quantity: 5, wall: compactWall() } }); // same id ignored
  const s = summariseCart(cart, find);
  const wall = wallPrice(getLayout('compact')!);
  assert.equal(s.lines.length, 3);
  assert.equal(s.itemCount, 2 + 1 + 2);
  assert.equal(s.subtotal, 2 * find('stk-001')!.price + 3 * wall);
  const line = s.lines.find((l) => l.key === wallKey('w2'))!;
  assert.ok(line.type === 'custom-wall' && line.lineTotal === 2 * wall && line.layout.slots.length === 5);
});

test('wall quantity and removal use the line key; product lines are untouched', () => {
  let cart: CartItem[] = cartReducer([], { type: 'add', productId: 'stk-001', quantity: 1 });
  cart = cartReducer(cart, { type: 'addWall', item: { kind: 'custom-wall', id: 'w1', quantity: 1, wall: compactWall() } });
  cart = cartReducer(cart, { type: 'setQuantity', key: wallKey('w1'), quantity: 4 });
  assert.equal(cart.find(isWallItem)!.quantity, 4);
  cart = cartReducer(cart, { type: 'remove', key: wallKey('w1') });
  assert.deepEqual(cart, [{ productId: 'stk-001', quantity: 1 }]);
});

test('walls are never saved to storage, and syncing products keeps walls', () => {
  let cart: CartItem[] = cartReducer([], { type: 'add', productId: 'pst-001', variantId: 'a4', quantity: 1 });
  cart = cartReducer(cart, { type: 'addWall', item: { kind: 'custom-wall', id: 'w1', quantity: 1, wall: compactWall(true) } });
  const saved = serializeCart(cart);
  assert.deepEqual(JSON.parse(saved), [{ productId: 'pst-001', variantId: 'a4', quantity: 1 }]);
  assert.deepEqual(parseStoredCart(JSON.stringify([{ kind: 'custom-wall', id: 'x', quantity: 1 }]), valid), []);
  cart = cartReducer(cart, { type: 'replaceProducts', items: [{ productId: 'stk-001', quantity: 3 }] });
  assert.equal(cart.length, 2);
  assert.ok(cart.some(isWallItem));
  assert.ok(!cart.some((i) => isProductItem(i) && i.productId === 'pst-001'));
});

test('wall lines report the temporary photo links they use', () => {
  const item: CartItem = { kind: 'custom-wall', id: 'w1', quantity: 1, wall: compactWall(true) };
  assert.deepEqual(itemObjectUrls(item), ['blob:test/1']);
  assert.deepEqual(itemObjectUrls({ productId: 'stk-001', quantity: 1 }), []);
});

// ---------- Custom sticker lines ----------
import { stickerKey, isStickerItem } from './cart';
import { customStickerUnitPrice, toStickerConfig } from './customSticker';

const stickerConfig = (sizeId = 'medium', finishId = 'standard') =>
  toStickerConfig({
    image: { source: 'upload', objectUrl: 'blob:test/s1', fileName: 'me.png', width: 1200, height: 1200 },
    sizeId,
    finishId,
    shape: 'rounded',
    quantity: 5,
    rightsConfirmed: true,
  });

test('custom stickers are their own line, priced from the options data', () => {
  let cart: CartItem[] = cartReducer([], { type: 'add', productId: 'stk-001', quantity: 1 });
  cart = cartReducer(cart, { type: 'addSticker', item: { kind: 'custom-sticker', id: 's1', quantity: 5, sticker: stickerConfig('large', 'gloss') } });
  const s = summariseCart(cart, find);
  const unit = customStickerUnitPrice('large', 'gloss')!;
  const line = s.lines.find((l) => l.key === stickerKey('s1'))!;
  assert.ok(line.type === 'custom-sticker' && line.unitPrice === unit && line.lineTotal === 5 * unit);
  assert.equal(s.subtotal, find('stk-001')!.price + 5 * unit);
  assert.equal(s.itemCount, 6);
  // quantity + removal by key
  cart = cartReducer(cart, { type: 'setQuantity', key: stickerKey('s1'), quantity: 8 });
  assert.equal(cart.find(isStickerItem)!.quantity, 8);
  cart = cartReducer(cart, { type: 'remove', key: stickerKey('s1') });
  assert.deepEqual(cart, [{ productId: 'stk-001', quantity: 1 }]);
});

test('custom stickers are not saved, keep their photo link, and survive product sync', () => {
  let cart: CartItem[] = cartReducer([], { type: 'addSticker', item: { kind: 'custom-sticker', id: 's1', quantity: 2, sticker: stickerConfig() } });
  assert.deepEqual(JSON.parse(serializeCart(cart)), []);
  assert.deepEqual(itemObjectUrls(cart[0]), ['blob:test/s1']);
  cart = cartReducer(cart, { type: 'replaceProducts', items: [{ productId: 'stk-002', quantity: 1 }] });
  assert.equal(cart.length, 2);
});
