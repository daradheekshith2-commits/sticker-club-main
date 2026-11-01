import type { Product, Variant } from '../types/product';
import type { CustomWallConfig } from '../types/wall';
import { getLayout, type WallLayout } from '../data/wallLayouts';
import { wallPrice } from './customWall';
import { customStickerUnitPrice, type CustomStickerConfig } from './customSticker';
import { packFingerprint, packPrice, type CustomPackConfig } from './customPack';

/**
 * CART LOGIC (no React here — just data in, data out)
 *
 * The cart holds two kinds of line:
 *
 * 1. PRODUCT lines — a product ID, the chosen size (variant) and a quantity.
 *    Names and prices are always looked up from the catalogue, so a price
 *    change in products.ts can never leave a stale price in someone's cart.
 *    An A4 and an A3 of the same poster are separate lines.
 *
 * 2. CUSTOM WALL lines — a configured "Build your own wall" layout with an
 *    image in every position. Their price is recalculated from the layout and
 *    the current poster size prices.
 *
 * 3. CUSTOM STICKER lines — one customer image with size, finish and shape.
 *    Price is recalculated from src/data/customStickerOptions.ts.
 *
 * 4. CUSTOM PACK lines — a Build Your Own Pack: theme, size, the chosen
 *    design ids and finish. Price is recalculated from src/data/packBuilder.ts.
 *
 * Product and pack lines are saved to localStorage (they're just ids). Wall
 * and custom-sticker lines are NOT: uploaded photos only exist in this browser
 * tab, so those lines leave the cart on refresh (the UI says so).
 */

export const MAX_QUANTITY_PER_ITEM = 20;
// v2: lines include variantId. Old v1 carts are simply ignored.
export const CART_STORAGE_KEY = 'sticker-club.cart.v2';

export interface ProductCartItem {
  kind?: 'product';
  productId: string;
  /** Required for products that have variants (e.g. poster sizes). */
  variantId?: string;
  quantity: number;
}

export interface CustomWallCartItem {
  kind: 'custom-wall';
  /** Unique per configuration, e.g. 'wall-lq2x9a-4f7k'. */
  id: string;
  quantity: number;
  wall: CustomWallConfig;
}

export interface CustomStickerCartItem {
  kind: 'custom-sticker';
  /** Unique per configuration. */
  id: string;
  /** Number of stickers. */
  quantity: number;
  sticker: CustomStickerConfig;
}

export interface CustomPackCartItem {
  kind: 'custom-pack';
  /** Derived from the configuration, so the same pack added twice becomes one line. */
  id: string;
  /** Number of packs. */
  quantity: number;
  pack: CustomPackConfig;
}

/** Lines that hold temporary images and can't survive a refresh. */
export type CustomCartItem = CustomWallCartItem | CustomStickerCartItem;
/** Lines that are saved to localStorage. */
export type StoredCartItem = ProductCartItem | CustomPackCartItem;
export type CartItem = ProductCartItem | CustomCartItem | CustomPackCartItem;

export const isWallItem = (i: CartItem): i is CustomWallCartItem => i.kind === 'custom-wall';
export const isStickerItem = (i: CartItem): i is CustomStickerCartItem => i.kind === 'custom-sticker';
export const isPackItem = (i: CartItem): i is CustomPackCartItem => i.kind === 'custom-pack';
/** True for ordinary catalogue products (the only lines without a `kind`, or kind 'product'). */
export const isProductItem = (i: CartItem): i is ProductCartItem => i.kind === undefined || i.kind === 'product';
/** True for lines holding temporary images (walls, custom stickers). */
export const isCustomItem = (i: CartItem): i is CustomCartItem => isWallItem(i) || isStickerItem(i);

/** The unique key of a product line, e.g. 'pst-001::a4' or 'stk-001::'. */
export function lineKey(productId: string, variantId?: string): string {
  return `${productId}::${variantId ?? ''}`;
}

/** The unique key of a custom wall line. */
export const wallKey = (id: string) => `wall::${id}`;
/** The unique key of a custom sticker line. */
export const stickerKey = (id: string) => `sticker::${id}`;

/** The unique key of a custom pack line. */
export const packKey = (id: string) => `pack::${id}`;

export const keyOf = (i: CartItem) =>
  isWallItem(i) ? wallKey(i.id) : isStickerItem(i) ? stickerKey(i.id) : isPackItem(i) ? packKey(i.id) : lineKey(i.productId, i.variantId);

/** A new, practically unique id for a custom configuration, e.g. 'wall-lq2x9a-4f7k'. */
export function newCustomId(prefix: 'wall' | 'sticker'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
export const newWallId = () => newCustomId('wall');

export type CartAction =
  | { type: 'add'; productId: string; variantId?: string; quantity: number }
  | { type: 'addWall'; item: CustomWallCartItem }
  | { type: 'addSticker'; item: CustomStickerCartItem }
  /** Adds a pack; an identical pack already in the cart gets its quantity increased. */
  | { type: 'addPack'; pack: CustomPackConfig; quantity: number }
  | { type: 'setQuantity'; key: string; quantity: number }
  | { type: 'remove'; key: string }
  /** Replace the SAVED lines (products and packs, e.g. from another tab); temporary custom lines are kept. */
  | { type: 'replaceProducts'; items: StoredCartItem[] }
  | { type: 'clear' };

/** Keeps a quantity a whole number between 1 and the max. */
export function clampQuantity(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_QUANTITY_PER_ITEM, Math.max(1, Math.floor(n)));
}

/** The reducer: given the current cart and an action, return the NEW cart. */
export function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'add': {
      const key = lineKey(action.productId, action.variantId);
      if (state.some((i) => keyOf(i) === key)) {
        return state.map((i) => (keyOf(i) === key ? { ...i, quantity: clampQuantity(i.quantity + action.quantity) } : i));
      }
      const item: ProductCartItem = { productId: action.productId, quantity: clampQuantity(action.quantity) };
      if (action.variantId) item.variantId = action.variantId;
      return [...state, item];
    }
    case 'addWall':
      if (state.some((i) => keyOf(i) === wallKey(action.item.id))) return state;
      return [...state, { ...action.item, quantity: clampQuantity(action.item.quantity) }];
    case 'addSticker':
      if (state.some((i) => keyOf(i) === stickerKey(action.item.id))) return state;
      return [...state, { ...action.item, quantity: clampQuantity(action.item.quantity) }];
    case 'addPack': {
      const id = packFingerprint(action.pack);
      const key = packKey(id);
      if (state.some((i) => keyOf(i) === key)) {
        return state.map((i) => (keyOf(i) === key ? { ...i, quantity: clampQuantity(i.quantity + action.quantity) } : i));
      }
      return [...state, { kind: 'custom-pack', id, quantity: clampQuantity(action.quantity), pack: action.pack }];
    }
    case 'setQuantity':
      if (action.quantity < 1) return state.filter((i) => keyOf(i) !== action.key);
      return state.map((i) => (keyOf(i) === action.key ? { ...i, quantity: clampQuantity(action.quantity) } : i));
    case 'remove':
      return state.filter((i) => keyOf(i) !== action.key);
    case 'replaceProducts':
      return [...action.items, ...state.filter(isCustomItem)];
    case 'clear':
      return [];
    default:
      return state;
  }
}

/** Finds the chosen variant, or undefined for products without variants. */
export function findVariant(product: Product, variantId?: string): Variant | undefined {
  return product.variants?.find((v) => v.id === variantId);
}

/** True when this product/variant combination can exist in a cart. */
export function isValidSelection(product: Product, variantId?: string): boolean {
  if (product.variants?.length) return Boolean(findVariant(product, variantId));
  return variantId === undefined;
}

/** Unit price for a product + variant. */
export function unitPrice(product: Product, variantId?: string): number {
  return findVariant(product, variantId)?.price ?? product.price;
}

export interface ProductCartLine {
  type: 'product';
  key: string;
  product: Product;
  variant?: Variant;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface WallCartLine {
  type: 'custom-wall';
  key: string;
  id: string;
  wall: CustomWallConfig;
  layout: WallLayout;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface StickerCartLine {
  type: 'custom-sticker';
  key: string;
  id: string;
  sticker: CustomStickerConfig;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface PackCartLine {
  type: 'custom-pack';
  key: string;
  id: string;
  pack: CustomPackConfig;
  /** The chosen products, in pick order. */
  designs: Product[];
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export type CartLine = ProductCartLine | WallCartLine | StickerCartLine | PackCartLine;

export interface CartSummary {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
}

/** Joins cart items with catalogue/layout data and works out every total. */
export function summariseCart(items: CartItem[], findProduct: (id: string) => Product | undefined): CartSummary {
  const lines: CartLine[] = [];
  for (const item of items) {
    if (isWallItem(item)) {
      const layout = getLayout(item.wall.layoutId);
      if (!layout || layout.slots.length !== item.wall.slots.length) continue; // layout changed or removed
      const price = wallPrice(layout);
      lines.push({ type: 'custom-wall', key: keyOf(item), id: item.id, wall: item.wall, layout, unitPrice: price, quantity: item.quantity, lineTotal: price * item.quantity });
      continue;
    }
    if (isStickerItem(item)) {
      const price = customStickerUnitPrice(item.sticker.sizeId, item.sticker.finishId);
      if (price === null) continue; // size or finish no longer offered
      lines.push({ type: 'custom-sticker', key: keyOf(item), id: item.id, sticker: item.sticker, unitPrice: price, quantity: item.quantity, lineTotal: price * item.quantity });
      continue;
    }
    if (isPackItem(item)) {
      const designs = item.pack.designIds.map(findProduct);
      const price = packPrice(item.pack.size, item.pack.finishId);
      if (price === null || designs.some((p) => !p) || designs.length !== item.pack.size) continue; // option or design removed
      lines.push({ type: 'custom-pack', key: keyOf(item), id: item.id, pack: item.pack, designs: designs as Product[], unitPrice: price, quantity: item.quantity, lineTotal: price * item.quantity });
      continue;
    }
    const product = findProduct(item.productId);
    if (!product || !isValidSelection(product, item.variantId)) continue; // removed product or size
    const price = unitPrice(product, item.variantId);
    lines.push({
      type: 'product',
      key: keyOf(item),
      product,
      variant: findVariant(product, item.variantId),
      unitPrice: price,
      quantity: item.quantity,
      lineTotal: price * item.quantity,
    });
  }
  return {
    lines,
    itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
    subtotal: lines.reduce((sum, l) => sum + l.lineTotal, 0),
  };
}

/** What gets saved to localStorage: product and pack lines (see note at the top). */
export function serializeCart(items: CartItem[]): string {
  return JSON.stringify(
    items
      .filter((i): i is StoredCartItem => !isCustomItem(i))
      .map((i) =>
        isPackItem(i)
          ? { kind: 'custom-pack', id: i.id, quantity: i.quantity, pack: i.pack }
          : i.variantId
            ? { productId: i.productId, variantId: i.variantId, quantity: i.quantity }
            : { productId: i.productId, quantity: i.quantity },
      ),
  );
}

/** Temporary blob: URLs (uploaded photos) used by a custom cart line. */
export function itemObjectUrls(item: CartItem): string[] {
  if (isWallItem(item)) return item.wall.slots.flatMap((s) => (s.fill.source === 'upload' ? [s.fill.objectUrl] : []));
  if (isStickerItem(item)) return item.sticker.image.source === 'upload' ? [item.sticker.image.objectUrl] : [];
  return [];
}

/**
 * Safely reads a cart saved in localStorage. Anything malformed, unknown,
 * not purchasable or with an invalid size is dropped instead of crashing.
 * Custom walls are never in storage, so any found there are ignored.
 */
export function parseStoredCart(
  raw: string | null,
  isValid: (productId: string, variantId?: string) => boolean,
  isValidPack: (pack: CustomPackConfig) => boolean = () => false,
): StoredCartItem[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];

  const merged = new Map<string, ProductCartItem>();
  const packs = new Map<string, CustomPackCartItem>();
  for (const entry of data) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { productId, variantId, quantity, kind, pack } = entry as Record<string, unknown>;
    if (kind === 'custom-pack') {
      if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity < 1) continue;
      if (!isPackShaped(pack) || !isValidPack(pack)) continue;
      const id = packFingerprint(pack); // never trust a stored id
      const prev = packs.get(id);
      packs.set(id, { kind: 'custom-pack', id, pack, quantity: clampQuantity((prev?.quantity ?? 0) + quantity) });
      continue;
    }
    if (kind !== undefined && kind !== 'product') continue;
    if (typeof productId !== 'string') continue;
    if (variantId !== undefined && typeof variantId !== 'string') continue;
    if (!isValid(productId, variantId)) continue;
    if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity < 1) continue;
    const key = lineKey(productId, variantId);
    const prev = merged.get(key);
    const item: ProductCartItem = { productId, quantity: (prev?.quantity ?? 0) + quantity };
    if (variantId) item.variantId = variantId;
    merged.set(key, item);
  }
  return [...[...merged.values()].map((i) => ({ ...i, quantity: clampQuantity(i.quantity) })), ...packs.values()];
}

/** Checks the basic shape of a stored pack before deeper validation. */
function isPackShaped(x: unknown): x is CustomPackConfig {
  if (typeof x !== 'object' || x === null) return false;
  const c = x as Record<string, unknown>;
  return (
    typeof c.seriesId === 'string' &&
    (c.size === 5 || c.size === 10) &&
    Array.isArray(c.designIds) &&
    c.designIds.every((d) => typeof d === 'string') &&
    typeof c.finishId === 'string' &&
    typeof c.surprise === 'object' &&
    c.surprise !== null
  );
}
