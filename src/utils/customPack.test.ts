import { test } from 'node:test';
import assert from 'node:assert/strict';
import { packFinishes, packSizes } from '../data/packBuilder';
import { packEligibleProducts } from './collectibles';
import { canAddDesign, defaultFinishId, packFingerprint, packLabel, packPrice, packProblem, toPackConfig, type PackDraft } from './customPack';
import { cartReducer, isPackItem, parseStoredCart, serializeCart, summariseCart, type CartItem } from './cart';
import { getProductById } from './catalogue';

const eligible = packEligibleProducts();
const ids = new Set(eligible.map((p) => p.id));
const pick = (n: number) => eligible.slice(0, n).map((p) => p.id);
const draft = (over: Partial<PackDraft> = {}): PackDraft => ({ seriesId: 'S01', size: 5, designIds: pick(5), finishId: defaultFinishId(), ...over });

test('enough eligible designs exist for the largest pack', () => {
  assert.ok(eligible.length >= Math.max(...packSizes.map((s) => s.count)));
  assert.ok(eligible.every((p) => p.productType === 'single' && (p.rarity === 'common' || p.rarity === 'uncommon')));
});

test('price comes from the pack size config, plus any finish surcharge', () => {
  const five = packSizes.find((s) => s.count === 5)!;
  const ten = packSizes.find((s) => s.count === 10)!;
  assert.equal(packPrice(5, 'standard'), five.price);
  assert.equal(packPrice(10, 'standard'), ten.price);
  assert.equal(packPrice(7, 'standard'), null, 'unknown size');
  // an unavailable finish can't be priced (or bought)
  const unavailable = packFinishes.find((f) => !f.available);
  if (unavailable) assert.equal(packPrice(5, unavailable.id), null);
});

test('a 5-pack needs exactly 5 designs and a 10-pack exactly 10', () => {
  assert.equal(packProblem(draft(), ids), null);
  assert.match(packProblem(draft({ designIds: pick(4) }), ids)!, /Choose 1 more design /);
  assert.match(packProblem(draft({ designIds: pick(6) }), ids)!, /Remove 1 design /);
  assert.equal(packProblem(draft({ size: 10, designIds: pick(10) }), ids), null);
  assert.match(packProblem(draft({ size: 10, designIds: pick(9) }), ids)!, /exactly 10/);
  assert.match(packProblem(draft({ size: 10, designIds: pick(11) }), ids)!, /Remove 1 design/);
  assert.throws(() => toPackConfig(draft({ designIds: pick(4) }), ids));
  assert.throws(() => toPackConfig(draft({ designIds: pick(6) }), ids));
});

test('theme, duplicates, ineligible designs and unavailable finishes are rejected', () => {
  assert.match(packProblem(draft({ seriesId: null }), ids)!, /theme/);
  assert.match(packProblem(draft({ seriesId: 'S99' }), ids)!, /theme/);
  const [a, b, c, d] = pick(4);
  assert.match(packProblem(draft({ designIds: [a, b, c, d, a] }), ids)!, /only be picked once/);
  assert.match(packProblem(draft({ designIds: [...pick(4), 'rar-001'] }), ids)!, /isn’t available/, 'rare designs are not pack-eligible');
  assert.match(packProblem(draft({ finishId: 'gloss' }), ids)!, /isn’t available yet/);
  assert.match(packProblem(draft({ finishId: 'nope' }), ids)!, /finish/);
});

test('canAddDesign stops at the pack size', () => {
  assert.ok(canAddDesign(draft({ designIds: pick(4) })));
  assert.ok(!canAddDesign(draft()));
});

test('config keeps theme, size, designs, finish and the surprise', () => {
  const config = toPackConfig(draft(), ids);
  assert.deepEqual(config.designIds, pick(5));
  assert.equal(config.seriesId, 'S01');
  assert.equal(config.surprise.count, 1);
  assert.equal(packLabel(config), 'Custom pack · 5 + 1 · Campus Classics');
  // the fingerprint ignores pick order, so the same pack is one cart line
  assert.equal(packFingerprint(config), packFingerprint({ ...config, designIds: [...config.designIds].reverse() }));
});

test('cart: packs merge, price from config, saved and restored safely', () => {
  const config = toPackConfig(draft(), ids);
  let cart: CartItem[] = cartReducer([], { type: 'add', productId: 'stk-001', quantity: 1 });
  cart = cartReducer(cart, { type: 'addPack', pack: config, quantity: 1 });
  cart = cartReducer(cart, { type: 'addPack', pack: { ...config, designIds: [...config.designIds].reverse() }, quantity: 1 });
  assert.equal(cart.filter(isPackItem).length, 1);
  assert.equal(cart.find(isPackItem)!.quantity, 2);

  const summary = summariseCart(cart, (id) => getProductById(id));
  const line = summary.lines.find((l) => l.type === 'custom-pack');
  if (!line || line.type !== 'custom-pack') throw new Error('expected a custom-pack line');
  assert.equal(line.unitPrice, packPrice(5, 'standard'));
  assert.equal(line.lineTotal, 2 * packPrice(5, 'standard')!);
  assert.equal(line.designs.length, 5);
  assert.equal(summary.subtotal, 20 + line.lineTotal);

  // Packs are only ids, so they're saved; a tampered or outdated pack is dropped on load.
  const restored = parseStoredCart(serializeCart(cart), () => true, (p) => toPackConfigSafe(p));
  assert.equal(restored.filter((i) => 'kind' in i && i.kind === 'custom-pack').length, 1);
  const tampered = JSON.stringify([{ kind: 'custom-pack', id: 'x', quantity: 1, pack: { ...config, designIds: pick(4) } }]);
  assert.deepEqual(parseStoredCart(tampered, () => true, (p) => toPackConfigSafe(p)), []);
  const junk = JSON.stringify([{ kind: 'custom-pack', quantity: 1, pack: { size: 'five' } }]);
  assert.deepEqual(parseStoredCart(junk, () => true, () => true), []);
});

function toPackConfigSafe(p: Parameters<typeof packFingerprint>[0]): boolean {
  return packProblem({ seriesId: p.seriesId, size: p.size, designIds: p.designIds, finishId: p.finishId }, ids) === null;
}
