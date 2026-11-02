import { products as allProducts } from '../data/products';
import { getCollection, productTypeLabels, resolveCollectionId } from '../data/collections';
import { getRarity, getSeries } from '../data/rarity';
import type { Category, CollectionId, Product, ProductType } from '../types/product';

/**
 * CATALOGUE HELPERS
 * Pure functions (same input → same output, no side effects) for looking up,
 * filtering and sorting products. Keeping them out of components makes them
 * easy to test — see catalogue.test.ts.
 */

export type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'name';
export type PriceBand = 'under-50' | '50-100' | 'over-100';

export const sortOptions: { value: SortKey; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name: A–Z' },
];

export const priceBands: { value: PriceBand; label: string; min: number; max: number }[] = [
  { value: 'under-50', label: 'Under ₹50', min: 0, max: 49 },
  { value: '50-100', label: '₹50 – ₹100', min: 50, max: 100 },
  { value: 'over-100', label: 'Over ₹100', min: 101, max: Infinity },
];

export interface CatalogueFilters {
  query: string;
  category: Category | null;
  types: ProductType[];
  collections: CollectionId[];
  price: PriceBand | null;
  /** Size labels, e.g. ['A4']. Only products offered in that size match. */
  sizes: string[];
  sort: SortKey;
}

export const emptyFilters: CatalogueFilters = {
  query: '',
  category: null,
  types: [],
  collections: [],
  price: null,
  sizes: [],
  sort: 'featured',
};

export function getProductBySlug(slug: string, list: Product[] = allProducts): Product | undefined {
  return list.find((p) => p.slug === slug);
}

export function getProductById(id: string, list: Product[] = allProducts): Product | undefined {
  return list.find((p) => p.id === id);
}

export function isPurchasable(product: Product): boolean {
  if (product.active === false) return false;
  return product.status === 'demo' || product.status === ('PUBLISHED' as any);
}

/** How many items are inside a sheet/pack — worked out from the artwork when possible. */
export function getPackQuantity(product: Product): number | undefined {
  if (product.packQuantity !== undefined) return product.packQuantity;
  const art = product.art;
  if (art.kind === 'sheet' || art.kind === 'pack') return art.designs.length;
  if (art.kind === 'poster-set') return art.posters.length;
  if (art.kind === 'duo') return 2;
  if (art.kind === 'secret') return 1;
  if (art.kind === 'secret-pack') return art.designs.length;
  return undefined;
}

/** The list of design names inside a sheet or pack (empty for singles). */
export function getContents(product: Product): string[] {
  const art = product.art;
  if (art.kind === 'sheet' || art.kind === 'pack') return art.designs.map((x) => x.name);
  if (art.kind === 'poster-set') return art.posters.map((x) => x.title.replace('\n', ' '));
  if (art.kind === 'duo' && product.duo) return [`${product.duo.partA} sticker`, `${product.duo.partB} sticker`];
  if (art.kind === 'secret') return [`${art.design.name} sticker`, '1 sealed message card'];
  if (art.kind === 'secret-pack') return [...art.designs.map((x) => `${x.name} sticker`), `${art.designs.length} sealed message cards`];
  return [];
}

/** Text a search query is matched against. */
function searchableText(p: Product): string {
  const collectionNames = p.collections.map((c) => getCollection(c)?.name ?? '');
  return [
    p.name,
    p.shortDescription,
    p.description,
    productTypeLabels[p.productType].singular,
    ...p.tags,
    ...collectionNames,
    ...getContents(p),
    ...(p.variants ?? []).map((v) => v.label),
    getRarity(p.rarity)?.label ?? '',
    getSeries(p.seriesId)?.name ?? '',
  ]
    .join(' ')
    .toLowerCase();
}

export function matchesFilters(p: Product, f: CatalogueFilters): boolean {
  if (f.category && p.category !== f.category) return false;
  if (f.types.length && !f.types.includes(p.productType)) return false;
  if (f.collections.length && !p.collections.some((c) => f.collections.includes(c))) return false;
  if (f.price) {
    const band = priceBands.find((b) => b.value === f.price);
    if (band && (p.price < band.min || p.price > band.max)) return false;
  }
  if (f.sizes.length && ((p.variantLabel ?? 'Size') !== 'Size' || !p.variants?.some((v) => f.sizes.includes(v.label)))) return false;
  const q = f.query.trim().toLowerCase();
  if (q) {
    // Every word typed must appear somewhere: "chai sheet" finds the campus sheet.
    const text = searchableText(p);
    if (!q.split(/\s+/).every((word) => text.includes(word))) return false;
  }
  return true;
}

export function sortProducts(list: Product[], sort: SortKey): Product[] {
  const copy = [...list]; // never mutate the original array
  switch (sort) {
    case 'price-asc':
      return copy.sort((a, b) => a.price - b.price || a.displayOrder - b.displayOrder);
    case 'price-desc':
      return copy.sort((a, b) => b.price - a.price || a.displayOrder - b.displayOrder);
    case 'name':
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case 'featured':
    default:
      // Featured first, then purchasable before coming-soon, then display order.
      return copy.sort(
        (a, b) =>
          Number(b.featured) - Number(a.featured) ||
          Number(isPurchasable(b)) - Number(isPurchasable(a)) ||
          a.displayOrder - b.displayOrder,
      );
  }
}

export function filterAndSort(f: CatalogueFilters, list: Product[] = allProducts): Product[] {
  return sortProducts(
    list.filter((p) => matchesFilters(p, f)),
    f.sort,
  );
}

/**
 * Category-aware Smart Recommendations ("You might also like").
 * Strictly enforces category separation (stickers only recommend stickers; posters only recommend posters).
 * Prioritizes:
 * 1. Same product type and same collection/series (weight: 100)
 * 2. Same product type and matching theme/tags (weight: 50)
 * 3. Same product type and same category (weight: 25)
 * 4. Other active products of the same category fallback (weight: 10)
 */
export function getRelatedProducts(product: Product, limit = 4, list: Product[] = allProducts): Product[] {
  const prodColls = product.collections || [];
  const prodTags = product.tags || [];
  return list
    .filter((p) => p && p.id !== product.id && p.category === product.category && isPurchasable(p))
    .map((p) => {
      let score = 0;
      const sameType = p.productType === product.productType;
      const sameSeries = product.seriesId && p.seriesId === product.seriesId;
      const pColls = p.collections || [];
      const sharedColls = pColls.filter((c) => prodColls.includes(c)).length;

      // Tier 1: Same product type and same collection or series
      if (sameType && (sameSeries || sharedColls > 0)) {
        score += 100 + (sharedColls * 10);
      } else if (sharedColls > 0) {
        score += 60 + (sharedColls * 10);
      }

      // Tier 2: Same product type and matching tags
      const pTags = p.tags || [];
      const sharedTags = pTags.filter((t) => prodTags.includes(t)).length;
      if (sameType && sharedTags > 0) {
        score += 50 + (sharedTags * 5);
      } else if (sharedTags > 0) {
        score += 30 + (sharedTags * 5);
      }

      // Tier 3: Same product type
      if (sameType) {
        score += 25;
      }

      // Tier 4: Fallback baseline
      score += 10;

      return { p, score };
    })
    .sort((a, b) => b.score - a.score || a.p.displayOrder - b.p.displayOrder || a.p.name.localeCompare(b.p.name))
    .slice(0, limit)
    .map((x) => x.p);
}

/** Lowest price for a format — used for "from ₹15" labels so they never go stale. */
export function getStartingPrice(type: ProductType, list: Product[] = allProducts): number | undefined {
  const prices = list.filter((p) => p.productType === type && isPurchasable(p)).map((p) => p.price);
  return prices.length ? Math.min(...prices) : undefined;
}

/** Every size label used in the catalogue, in the order first seen (A5, A4, A3). Theme options aren't sizes. */
export function allSizes(list: Product[] = allProducts): string[] {
  return [...new Set(list.filter((p) => (p.variantLabel ?? 'Size') === 'Size').flatMap((p) => (p.variants ?? []).map((v) => v.label)))];
}

/**
 * How many products an option would show, given all the OTHER active filters.
 * E.g. with "Tech" selected, the count next to "Posters" = tech posters.
 */
export function facetCount(f: CatalogueFilters, change: Partial<CatalogueFilters>, list: Product[] = allProducts): number {
  return list.filter((p) => matchesFilters(p, { ...f, ...change })).length;
}

// ---------- URL <-> filters ----------
// Filters live in the URL (e.g. /shop?type=sheet&vibe=tech) so links can be
// shared and the back button works.

const validTypes = Object.keys(productTypeLabels) as ProductType[];
const validSorts = sortOptions.map((s) => s.value);

export function filtersFromParams(params: URLSearchParams): CatalogueFilters {
  const list = (key: string) =>
    (params.get(key) ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  const category = params.get('category');
  const price = params.get('price');
  const sort = params.get('sort');
  return {
    query: params.get('q') ?? '',
    category: category === 'stickers' || category === 'posters' ? category : null,
    types: list('type').filter((t): t is ProductType => validTypes.includes(t as ProductType)),
    // Old ids (e.g. 'campus') resolve to the collection that replaced them.
    collections: [...new Set(list('vibe').map(resolveCollectionId).filter((c): c is CollectionId => Boolean(c)))],
    price: priceBands.some((b) => b.value === price) ? (price as PriceBand) : null,
    sizes: list('size').filter((x) => allSizes(allProducts).includes(x)),
    sort: validSorts.includes(sort as SortKey) ? (sort as SortKey) : 'featured',
  };
}

export function paramsFromFilters(f: Partial<CatalogueFilters>): URLSearchParams {
  const p = new URLSearchParams();
  if (f.query && f.query.trim()) p.set('q', f.query.trim());
  if (f.category) p.set('category', f.category);
  if (f.types && f.types.length) p.set('type', f.types.join(','));
  if (f.collections && f.collections.length) p.set('vibe', f.collections.join(','));
  if (f.price) p.set('price', f.price);
  if (f.sizes && f.sizes.length) p.set('size', f.sizes.join(','));
  if (f.sort && f.sort !== 'featured') p.set('sort', f.sort);
  return p;
}

export function shopUrl(partial: Partial<CatalogueFilters>): string {
  const qs = paramsFromFilters({ ...emptyFilters, ...partial }).toString();
  return qs ? `/shop?${qs}` : '/shop';
}
