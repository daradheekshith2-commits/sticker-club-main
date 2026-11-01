import { test } from 'node:test';
import assert from 'node:assert/strict';
import { products } from '../data/products';
import {
  emptyFilters,
  facetCount,
  filterAndSort,
  filtersFromParams,
  getRelatedProducts,
  paramsFromFilters,
  getProductBySlug,
} from './catalogue';

test('catalogue data is consistent', () => {
  const ids = new Set(products.map((p) => p.id));
  const slugs = new Set(products.map((p) => p.slug));
  assert.equal(ids.size, products.length, 'product ids must be unique');
  assert.equal(slugs.size, products.length, 'slugs must be unique');
  for (const p of products) {
    assert.ok(p.price > 0, `${p.id} needs a positive price`);
    assert.ok(Number.isInteger(p.price), `${p.id} price should be whole rupees`);
  }
  for (const p of products) {
    if (!p.variants) continue;
    const ids = p.variants.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length, `${p.id} has duplicate variant ids`);
    assert.equal(p.price, Math.min(...p.variants.map((v) => v.price)), `${p.id} price must equal its cheapest size`);
  }
  // Both product lines have a real, orderable range.
  const orderable = (c: string) => products.filter((p) => p.category === c && p.status === 'demo').length;
  assert.ok(orderable('stickers') >= 10 && orderable('posters') >= 10);
});

test('size filter only returns products offered in that size', () => {
  const a3 = filterAndSort({ ...emptyFilters, sizes: ['A3'] });
  assert.ok(a3.length > 0);
  assert.ok(a3.every((p) => p.variants?.some((v) => v.label === 'A3')));
});

test('facet counts respect the other active filters', () => {
  const moviePosters = facetCount({ ...emptyFilters, collections: ['movies'] }, { category: 'posters' });
  assert.equal(moviePosters, filterAndSort({ ...emptyFilters, collections: ['movies'], category: 'posters' }).length);
  assert.ok(moviePosters > 0);
});

test('filter by type and vibe uses real data', () => {
  const sheets = filterAndSort({ ...emptyFilters, types: ['sheet'] });
  assert.ok(sheets.length > 0);
  assert.ok(sheets.every((p) => p.productType === 'sheet'));

  const anime = filterAndSort({ ...emptyFilters, collections: ['anime'] });
  assert.ok(anime.length > 0 && anime.every((p) => p.collections.includes('anime')));

  const posters = filterAndSort({ ...emptyFilters, category: 'posters' });
  assert.ok(posters.every((p) => p.category === 'posters'));
});

test('search matches names, tags and pack contents', () => {
  assert.ok(filterAndSort({ ...emptyFilters, query: 'chai' }).some((p) => p.slug === 'chai-first'));
  // "Little Bug" is only inside the Dev Mode sheet's contents
  assert.ok(filterAndSort({ ...emptyFilters, query: 'little bug' }).some((p) => p.slug === 'dev-mode-sheet'));
  assert.equal(filterAndSort({ ...emptyFilters, query: 'zzzz-nothing' }).length, 0);
});

test('price sorting is correct in both directions', () => {
  const asc = filterAndSort({ ...emptyFilters, sort: 'price-asc' }).map((p) => p.price);
  const desc = filterAndSort({ ...emptyFilters, sort: 'price-desc' }).map((p) => p.price);
  assert.deepEqual(asc, [...asc].sort((a, b) => a - b));
  assert.deepEqual(desc, [...desc].sort((a, b) => b - a));
});

test('price bands filter correctly', () => {
  const under = filterAndSort({ ...emptyFilters, price: 'under-50' });
  assert.ok(under.length > 0 && under.every((p) => p.price < 50));
  const over = filterAndSort({ ...emptyFilters, price: 'over-100' });
  assert.ok(over.every((p) => p.price > 100));
});

test('URL params round-trip and ignore junk', () => {
  const f = { ...emptyFilters, query: 'chai', types: ['sheet' as const], collections: ['movies' as const], sizes: ['A4'], sort: 'price-asc' as const };
  assert.deepEqual(filtersFromParams(paramsFromFilters(f)), f);
  const junk = filtersFromParams(new URLSearchParams('type=banana&vibe=nope&sort=weird&price=free&category=x&size=XXL'));
  assert.deepEqual(junk, emptyFilters);
});

test('related products exclude the product itself and stay in category', () => {
  const p = getProductBySlug('chai-first')!;
  const related = getRelatedProducts(p);
  assert.ok(related.length > 0);
  assert.ok(related.every((r) => r.id !== p.id && r.category === 'stickers'));
});
