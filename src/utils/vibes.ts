import { products as allProducts } from '../data/products';
import type { CollectionId, Product } from '../types/product';
import { isPurchasable } from './catalogue';
import { pluralise } from './format';

/** How many orderable stickers and posters a collection really has (from the catalogue). */
export function vibeCounts(id: CollectionId, list: Product[] = allProducts) {
  const inVibe = list.filter((p) => p.collections.includes(id) && isPurchasable(p));
  return {
    stickers: inVibe.filter((p) => p.category === 'stickers').length,
    posters: inVibe.filter((p) => p.category === 'posters').length,
  };
}

/** "4 stickers · 1 poster" — correct singular/plural, zero parts left out. */
export function vibeCountLabel({ stickers, posters }: { stickers: number; posters: number }): string {
  const parts = [stickers ? pluralise(stickers, 'sticker') : null, posters ? pluralise(posters, 'poster') : null].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'New designs coming soon';
}
