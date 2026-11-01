import { products } from '../data/products';
import { packEligibleRarities } from '../data/packBuilder';
import { rarityTiers, series } from '../data/rarity';
import type { RarityId } from '../types/collectible';
import type { Product, StickerDesign } from '../types/product';
import { isPurchasable } from './catalogue';

/**
 * COLLECTIBLE HELPERS — pure functions over the catalogue (tested in collectibles.test.ts).
 */

/** The sticker artwork of a single-sticker product. */
export function designOf(p: Product): StickerDesign | undefined {
  if (p.art.kind === 'single' || p.art.kind === 'secret') return p.art.design;
  return undefined;
}

/**
 * Designs a mystery pack's five guaranteed stickers are drawn from:
 * the series' purchasable Common/Uncommon single stickers.
 */
export function mysteryPool(seriesId: string, list: Product[] = products): Product[] {
  return list.filter(
    (p) => p.seriesId === seriesId && p.productType === 'single' && isPurchasable(p) && (p.rarity === 'common' || p.rarity === 'uncommon'),
  );
}

/** The series id behind a mystery-pack theme variant, e.g. 's01' → 'S01'. */
export const seriesIdForVariant = (variantId: string | undefined) => series.find((s) => s.id.toLowerCase() === variantId)?.id;

/** Products a customer can put in a Build Your Own Pack. */
export function packEligibleProducts(list: Product[] = products): Product[] {
  return list.filter(
    (p) => p.productType === 'single' && isPurchasable(p) && (packEligibleRarities as readonly string[]).includes(p.rarity ?? ''),
  );
}

/** Products in a rarity tier (single stickers and duos carry rarity). */
export function productsByRarity(rarity: RarityId, list: Product[] = products): Product[] {
  return list.filter((p) => p.rarity === rarity);
}

/** Every rarity tier with its products, in tier order. */
export function rarityGroups(list: Product[] = products) {
  return rarityTiers.map((tier) => ({ tier, items: productsByRarity(tier.id, list) }));
}

/** Products in a series, any format. */
export function productsInSeries(seriesId: string, list: Product[] = products): Product[] {
  return list.filter((p) => p.seriesId === seriesId);
}

/**
 * The identifier printed on a pack. In the prototype it is always a visible
 * DEMO code; real pack numbers must come from pre-printed production stock.
 */
export function demoPackCode(seriesId: string): string {
  return `DEMO-${seriesId}-000`;
}
