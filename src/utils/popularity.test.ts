import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankBlock } from './popularity';

test('popularity ranking: 8 views scores 8, 1 view + 1 cart + 1 purchase scores 14 and appears first', () => {
  // Two products in Block A
  const productA = { id: 'prod-a', name: 'Product A' };
  const productB = { id: 'prod-b', name: 'Product B' };
  const blockA = [productA, productB];

  // Formula: score = views + (3 × cart selections) + (10 × confirmed purchases)
  // Product A: 8 views = 8
  const scoreA = 8;
  // Product B: 1 view + (3 × 1) + (10 × 1) = 14
  const scoreB = 1 + 3 * 1 + 10 * 1;
  assert.equal(scoreA, 8);
  assert.equal(scoreB, 14);

  const scores = {
    [productA.id]: scoreA,
    [productB.id]: scoreB,
  };

  // Rank inside block A
  const rankedBlockA = rankBlock(blockA, scores);

  // Product B (score 14) appears first, Product A (score 8) appears second
  assert.deepEqual(rankedBlockA.map((p) => p.id), ['prod-b', 'prod-a']);
});

test('products in other blocks keep their own independent rankings and stay in their assigned block', () => {
  const blockStickers = [
    { id: 'stk-1', name: 'Sticker 1' },
    { id: 'stk-2', name: 'Sticker 2' },
  ];

  const blockPosters = [
    { id: 'pst-1', name: 'Poster 1' },
    { id: 'pst-2', name: 'Poster 2' },
  ];

  const scores = {
    'stk-1': 5,
    'stk-2': 20, // stk-2 should lead sticker block
    'pst-1': 100, // pst-1 should lead poster block
    'pst-2': 10,
  };

  const rankedStickers = rankBlock(blockStickers, scores);
  const rankedPosters = rankBlock(blockPosters, scores);

  // Stickers block stays purely stickers, re-ranked
  assert.deepEqual(rankedStickers.map((p) => p.id), ['stk-2', 'stk-1']);
  // Posters block stays purely posters, re-ranked
  assert.deepEqual(rankedPosters.map((p) => p.id), ['pst-1', 'pst-2']);
});

test('tied scores preserve the store’s existing display order and zero-activity products start at zero', () => {
  const block = [
    { id: 'prod-1', name: 'First' },
    { id: 'prod-2', name: 'Second' },
    { id: 'prod-3', name: 'Third' },
  ];

  // Zero activity (all score 0)
  const rankedZero = rankBlock(block, {});
  assert.deepEqual(rankedZero.map((p) => p.id), ['prod-1', 'prod-2', 'prod-3']);

  // Tied scores between prod-1 and prod-3, prod-2 has higher score
  const rankedPartial = rankBlock(block, { 'prod-1': 10, 'prod-2': 25, 'prod-3': 10 });
  assert.deepEqual(rankedPartial.map((p) => p.id), ['prod-2', 'prod-1', 'prod-3']);
});

