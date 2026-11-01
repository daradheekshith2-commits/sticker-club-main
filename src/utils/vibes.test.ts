import { test } from 'node:test';
import assert from 'node:assert/strict';
import { products } from '../data/products';
import { collections, getCollection, resolveCollectionId } from '../data/collections';
import { filtersFromParams } from './catalogue';
import { vibeCountLabel, vibeCounts } from './vibes';

test('count labels use correct singular and plural', () => {
  assert.equal(vibeCountLabel({ stickers: 1, posters: 1 }), '1 sticker · 1 poster');
  assert.equal(vibeCountLabel({ stickers: 12, posters: 2 }), '12 stickers · 2 posters');
  assert.equal(vibeCountLabel({ stickers: 4, posters: 0 }), '4 stickers');
  assert.equal(vibeCountLabel({ stickers: 0, posters: 0 }), 'New designs coming soon');
});

test('counts come from the catalogue', () => {
  const c = vibeCounts('anime');
  const expected = products.filter((p) => p.collections.includes('anime') && p.status === 'demo');
  assert.equal(c.stickers + c.posters, expected.length);
  assert.ok(c.stickers > 0 && c.posters > 0);
});

test('the four renamed collections and their order on the homepage', () => {
  const featured = collections.filter((c) => c.featured).map((c) => [c.id, c.name, c.color]);
  assert.deepEqual(featured, [
    ['anime', 'Anime', '#FFD447'],
    ['movies', 'Movies', '#8FD3FF'],
    ['quotes', 'Cars & Bikes', '#FF5B2E'],
    ['marvel', 'Marvel', '#D4FF3A'],
    ['cute', 'Cute & Aesthetic', '#FFB3D1'],
  ]);
});

test('Cute & Aesthetic is unchanged', () => {
  const cute = getCollection('cute')!;
  assert.deepEqual(
    { name: cute.name, blurb: cute.blurb, color: cute.color, motif: cute.motif, featured: cute.featured },
    { name: 'Cute & Aesthetic', blurb: 'Soft colours, sleepy clouds, small joys.', color: '#FFB3D1', motif: 'cloud', featured: true },
  );
  // Same products as before this change (ids recorded from the catalogue at the time).
  assert.deepEqual(
    products.filter((p) => p.collections.includes('cute')).map((p) => p.id).sort(),
    ['duo-001', 'duo-003', 'mys-001', 'pst-003', 'pst-010', 'sec-004', 'sec-006', 'sht-003', 'stk-005', 'stk-007', 'stk-019', 'stk-020'].sort(),
  );
});

test('old collection links keep working through aliases', () => {
  assert.equal(resolveCollectionId('campus'), 'anime');
  assert.equal(resolveCollectionId('tech'), 'movies');
  assert.equal(resolveCollectionId('desi'), 'quotes');
  assert.equal(resolveCollectionId('auto'), 'marvel');
  assert.equal(resolveCollectionId('cute'), 'cute');
  assert.equal(resolveCollectionId('nope'), undefined);
  assert.deepEqual(filtersFromParams(new URLSearchParams('vibe=campus,anime,auto')).collections, ['anime', 'marvel']);
  assert.equal(getCollection('desi')?.name, 'Cars & Bikes');
});

test('renamed collections hold only on-theme products', () => {
  const tagged = (id: string) => products.filter((p) => p.collections.includes(id as never));
  for (const id of ['anime', 'movies', 'quotes', 'marvel']) assert.ok(tagged(id).length >= 3, `${id} needs designs`);
  assert.ok(tagged('anime').every((p) => p.tags.includes('anime')));
  assert.ok(tagged('movies').every((p) => p.tags.includes('movies')));
  assert.ok(tagged('quotes').every((p) => /car|bike|auto|motor|racing|helmet|flag/i.test(p.tags.join(' ') + ' ' + p.description)), 'Cars & Bikes contains unrelated products');
  // Note and disclaimer removed per user request for live Marvel merchandise catalog
  // The old themes don't linger on unrelated products.
  for (const p of products) assert.ok(p.collections.every((c) => getCollection(c)?.id === c), `${p.id} has an old collection id`);
});
