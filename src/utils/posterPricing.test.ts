import test from 'node:test';
import assert from 'node:assert/strict';
import { posterSizes, POSTER_BASE_PRICE, POSTER_AVAILABILITY_TEXT, formatPosterDescription } from '../data/products';
import { getLayout } from '../data/wallLayouts';
import { sizePrice, wallPrice } from './customWall';
import { cartReducer, isLegacyPosterVariant, isPosterProduct, isValidSelection, summariseCart, unitPrice, type CartItem } from './cart';
import type { Product } from '../types/product';

const mockPosterProduct: Product = {
  id: 'pst-test-hero',
  slug: 'test-hero-poster',
  name: 'Test Hero Poster',
  shortDescription: 'Hero art poster',
  description: 'High-grade archival matte art poster print featuring Test Hero. Available in A5 (₹59), A4 (₹89), and A3 (₹149). Printed on 300 GSM premium cardstock.',
  price: 90,
  variants: posterSizes,
  category: 'posters',
  productType: 'poster',
  collections: [],
  tags: ['poster'],
  featured: false,
  isNew: false,
  displayOrder: 1,
  status: 'demo',
  art: { kind: 'poster', backdrop: '#000', poster: { title: 'TEST', bg: '#fff', fg: '#000', accent: '#red', motif: 'animeFace', pattern: 'grid' } },
};

test('1. Canonical poster size definitions and "From" price', () => {
  assert.equal(posterSizes.length, 3);
  
  const a5 = posterSizes.find((s) => s.id === 'a5');
  assert.ok(a5, 'A5 variant exists');
  assert.equal(a5.price, 90, 'A5 must be ₹90');
  assert.equal(a5.detail, '14.8 × 21 cm');

  const a4 = posterSizes.find((s) => s.id === 'a4');
  assert.ok(a4, 'A4 variant exists');
  assert.equal(a4.price, 120, 'A4 must be ₹120');
  assert.equal(a4.detail, '21 × 29.7 cm');

  const a3 = posterSizes.find((s) => s.id === 'a3');
  assert.ok(a3, 'A3 variant exists');
  assert.equal(a3.price, 150, 'A3 must be ₹150');
  assert.equal(a3.detail, '29.7 × 42 cm');

  assert.equal(POSTER_BASE_PRICE, 90, 'Lowest / From price must be ₹90');
  assert.equal(Math.min(...posterSizes.map((s) => s.price)), 90);
});

test('2. Single poster unit and subtotal calculations', () => {
  assert.equal(unitPrice(mockPosterProduct, 'a5'), 90);
  assert.equal(unitPrice(mockPosterProduct, 'a4'), 120);
  assert.equal(unitPrice(mockPosterProduct, 'a3'), 150);

  // Default without variantId or with fallback should use base price
  assert.equal(unitPrice(mockPosterProduct), 90);

  // Line subtotals = fixed price × quantity
  assert.equal(unitPrice(mockPosterProduct, 'a5') * 3, 270, '3 A5 posters = ₹270');
  assert.equal(unitPrice(mockPosterProduct, 'a4') * 2, 240, '2 A4 posters = ₹240');
  assert.equal(unitPrice(mockPosterProduct, 'a3') * 4, 600, '4 A3 posters = ₹600');
});

test('3. Wall builder fixed per-sheet billing and layout presets', () => {
  // Individual sheet size prices
  assert.equal(sizePrice('a5'), 90, 'sizePrice(a5) = 90');
  assert.equal(sizePrice('a4'), 120, 'sizePrice(a4) = 120');
  assert.equal(sizePrice('a3'), 150, 'sizePrice(a3) = 150');

  // Expected examples from requirements:
  // - 2 A4 sheets = ₹240
  assert.equal(2 * sizePrice('a4'), 240);
  // - 3 A5 sheets = ₹270
  assert.equal(3 * sizePrice('a5'), 270);
  // - 2 A3 sheets = ₹300
  assert.equal(2 * sizePrice('a3'), 300);
  // - 2 A5 + 1 A4 + 1 A3 = 180 + 120 + 150 = ₹450
  assert.equal(2 * sizePrice('a5') + sizePrice('a4') + sizePrice('a3'), 450);

  // Presets:
  // Compact Wall: 1 A3 + 4 A5 = 150 + 360 = ₹510
  const compact = getLayout('compact')!;
  assert.equal(wallPrice(compact), 510, 'Compact Wall: 1 A3 + 4 A5 = ₹510');

  // Classic Wall: 1 A3 + 2 A4 + 5 A5 = 150 + 240 + 450 = ₹840
  const classic = getLayout('classic')!;
  assert.equal(wallPrice(classic), 840, 'Classic Wall: 1 A3 + 2 A4 + 5 A5 = ₹840');

  // Studio Wall: 4 A4 + 6 A5 = 480 + 540 = ₹1,020
  const studio = getLayout('studio')!;
  assert.equal(wallPrice(studio), 1020, 'Studio Wall: 4 A4 + 6 A5 = ₹1,020');

  // Large Wall: 1 A3 + 4 A4 + 10 A5 = 150 + 480 + 900 = ₹1,530
  const large = getLayout('large')!;
  assert.equal(wallPrice(large), 1530, 'Large Wall: 1 A3 + 4 A4 + 10 A5 = ₹1,530');
});

test('4. Poster description canonical formatting and drift prevention', () => {
  assert.equal(POSTER_AVAILABILITY_TEXT, 'Available in A5 (₹90), A4 (₹120), and A3 (₹150).');

  const oldDesc = 'High-grade archival matte art poster print featuring Zenitsu. Available in A5 (₹59), A4 (₹89), and A3 (₹149). Printed on 300 GSM premium cardstock.';
  const updatedDesc = formatPosterDescription(oldDesc);
  assert.equal(
    updatedDesc,
    'High-grade archival matte art poster print featuring Zenitsu. Available in A5 (₹90), A4 (₹120), and A3 (₹150). Printed on 300 GSM premium cardstock.'
  );

  // Idempotent: running again produces identical result
  assert.equal(formatPosterDescription(updatedDesc), updatedDesc);
});

test('5. Cart revalidation and legacy arbitrary-size handling', () => {
  assert.ok(isPosterProduct(mockPosterProduct));
  assert.ok(isLegacyPosterVariant('custom:35×50cm:451'));
  assert.ok(!isLegacyPosterVariant('a4'));

  // Valid standard selections
  assert.ok(isValidSelection(mockPosterProduct, 'a5'));
  assert.ok(isValidSelection(mockPosterProduct, 'a4'));
  assert.ok(isValidSelection(mockPosterProduct, 'a3'));

  // Legacy custom items are kept in cart (not dropped) but flagged for size selection
  assert.ok(isValidSelection(mockPosterProduct, 'custom:35×50cm:451'));

  const items: CartItem[] = [
    { productId: mockPosterProduct.id, variantId: 'a4', quantity: 2 },
    { productId: mockPosterProduct.id, variantId: 'custom:35×50cm:451', quantity: 1 },
  ];

  const summary = summariseCart(items, (id) => (id === mockPosterProduct.id ? mockPosterProduct : undefined));
  assert.equal(summary.lines.length, 2);

  const standardLine = summary.lines.find((l) => l.type === 'product' && l.variant?.id === 'a4');
  assert.ok(standardLine && standardLine.type === 'product');
  assert.equal(standardLine.unitPrice, 120);
  assert.equal(standardLine.lineTotal, 240);
  assert.equal(standardLine.requiresSizeChoice, false);

  const legacyLine = summary.lines.find((l) => l.type === 'product' && l.variant?.id.startsWith('custom:'));
  assert.ok(legacyLine && legacyLine.type === 'product');
  assert.equal(legacyLine.requiresSizeChoice, true, 'Legacy arbitrary item must require size choice');
  assert.equal(legacyLine.unitPrice, 90, 'Legacy arbitrary item revalidates to canonical base price');

  // Updating variant with updateVariant action converts legacy item to standard size
  const updatedCart = cartReducer(items, {
    type: 'updateVariant',
    key: legacyLine.key,
    newVariantId: 'a3',
  });

  const updatedSummary = summariseCart(updatedCart, (id) => (id === mockPosterProduct.id ? mockPosterProduct : undefined));
  assert.equal(updatedSummary.lines.length, 2);
  const convertedLine = updatedSummary.lines.find((l) => l.type === 'product' && l.variant?.id === 'a3');
  assert.ok(convertedLine && convertedLine.type === 'product');
  assert.equal(convertedLine.unitPrice, 150);
  assert.equal(convertedLine.requiresSizeChoice, false);
});
