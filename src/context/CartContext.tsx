/**
 * CART STATE
 * One cart shared by every page. Components call `useCart()` to read items or
 * add/remove them. The cart is saved to localStorage so a refresh keeps it.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import {
  CART_STORAGE_KEY,
  cartReducer,
  findVariant,
  isValidSelection,
  newCustomId,
  stickerKey,
  parseStoredCart,
  serializeCart,
  summariseCart,
  wallKey,
  packKey,
  itemObjectUrls,
  type CartItem,
  type CartSummary,
} from '../utils/cart';
import { getProductById as getStaticProductById, isPurchasable as isStaticPurchasable } from '../utils/catalogue';
import { useCatalogue } from './CatalogueContext';
import type { Product } from '../types/product';
import { objectUrls } from '../utils/objectUrls';
import type { CustomWallConfig } from '../types/wall';
import type { CustomStickerConfig } from '../utils/customSticker';
import { isValidPackConfig, packFingerprint, packLabel, type CustomPackConfig } from '../utils/customPack';
import { packEligibleProducts } from '../utils/collectibles';
import { recordCartSelection } from '../utils/popularity';

interface CartContextValue extends CartSummary {
  items: CartItem[];
  /** variantId is required for products with sizes, e.g. addItem('pst-002', 1, 'a4'). secretNote is optional custom message. */
  addItem: (productId: string, quantity?: number, variantId?: string, secretNote?: string) => void;
  /** Adds a configured custom wall as its own line; returns the line's key. */
  addCustomWall: (wall: CustomWallConfig, quantity?: number) => string;
  /** Adds a configured custom sticker (quantity = number of stickers); returns the line's key. */
  addCustomSticker: (sticker: CustomStickerConfig, quantity: number) => string;
  /** Adds a Build Your Own Pack (the same pack twice = one line with a higher quantity); returns the line's key. */
  addCustomPack: (pack: CustomPackConfig, quantity?: number) => string;
  /** `key` is a cart line's key (CartLine.key). */
  setQuantity: (key: string, quantity: number) => void;
  updateVariant: (key: string, newVariantId: string) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  /** Short message read out by screen readers, e.g. "Chai First added to cart". */
  announcement: string;
}

const CartContext = createContext<CartContextValue | null>(null);

/** Can this saved pack still be bought? (designs and options may have changed since it was saved) */
const eligibleIds = new Set(packEligibleProducts().map((p) => p.id));
const canAddPack = (pack: CustomPackConfig) => isValidPackConfig(pack, eligibleIds);

function loadCart(): CartItem[] {
  try {
    return parseStoredCart(window.localStorage.getItem(CART_STORAGE_KEY), () => true, canAddPack);
  } catch {
    return []; // storage can be blocked (private mode, strict settings)
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { getProductById: getCatProduct, isPurchasable: isCatPurchasable } = useCatalogue();

  // The third argument runs loadCart once, on first render only.
  const [items, dispatch] = useReducer(cartReducer, undefined, loadCart);
  const [isOpen, setIsOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const findProduct = useCallback(
    (id: string): Product | undefined => getCatProduct(id) ?? getStaticProductById(id),
    [getCatProduct]
  );

  const checkPurchasable = useCallback(
    (p: Product): boolean => (isCatPurchasable ? isCatPurchasable(p) : isStaticPurchasable(p)),
    [isCatPurchasable]
  );

  const canAddProduct = useCallback(
    (productId: string, variantId?: string): boolean => {
      const p = findProduct(productId);
      return Boolean(p && checkPurchasable(p) && isValidSelection(p, variantId));
    },
    [findProduct, checkPurchasable]
  );

  // Save whenever the cart changes.
  useEffect(() => {
    try {
      // Only product lines are saved; custom walls hold temporary photo links that can't survive a refresh.
      window.localStorage.setItem(CART_STORAGE_KEY, serializeCart(items));
    } catch {
      /* ignore: the cart still works for this visit */
    }
  }, [items]);

  // Keep several open tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== CART_STORAGE_KEY) return;
      dispatch({ type: 'replaceProducts', items: parseStoredCart(e.newValue, () => true, canAddPack) });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addItem = useCallback((productId: string, quantity = 1, variantId?: string, secretNote?: string) => {
    if (!canAddProduct(productId, variantId)) return; // coming-soon product or missing/invalid size
    recordCartSelection(productId);
    dispatch({ type: 'add', productId, variantId, secretNote, quantity });
    const product = findProduct(productId);
    const size = product ? findVariant(product, variantId)?.label : undefined;
    setAnnouncement(`${product?.name ?? 'Item'}${size ? ` (${size})` : ''} added to cart`);
    setIsOpen(true);
  }, [canAddProduct, findProduct]);

  // The cart is one "holder" of any uploaded photo used by a wall in it, so the
  // photo stays available after the builder lets go, and is freed when the wall leaves the cart.
  const heldUrls = useRef<Set<string>>(new Set());
  useEffect(() => {
    const now = new Set(items.flatMap(itemObjectUrls));
    for (const url of now) if (!heldUrls.current.has(url)) objectUrls.retain(url);
    for (const url of heldUrls.current) if (!now.has(url)) objectUrls.release(url);
    heldUrls.current = now;
  }, [items]);

  // Take hold of uploaded photos right away, before the configurator lets go of them.
  const holdNow = (urls: string[]) => {
    for (const url of urls) {
      if (!heldUrls.current.has(url)) {
        objectUrls.retain(url);
        heldUrls.current.add(url);
      }
    }
  };

  const addCustomSticker = useCallback((sticker: CustomStickerConfig, quantity: number) => {
    const id = newCustomId('sticker');
    holdNow(sticker.image.source === 'upload' ? [sticker.image.objectUrl] : []);
    dispatch({ type: 'addSticker', item: { kind: 'custom-sticker', id, quantity, sticker } });
    setAnnouncement(`${sticker.label} added to cart`);
    return stickerKey(id);
  }, []);

  const addCustomWall = useCallback((wall: CustomWallConfig, quantity = 1) => {
    const id = newCustomId('wall');
    holdNow(wall.slots.flatMap((s) => (s.fill.source === 'upload' ? [s.fill.objectUrl] : [])));
    dispatch({ type: 'addWall', item: { kind: 'custom-wall', id, quantity, wall } });
    setAnnouncement(`Custom ${wall.layoutName.toLowerCase()} added to cart`);
    return wallKey(id);
  }, []);

  const addCustomPack = useCallback((pack: CustomPackConfig, quantity = 1) => {
    if (!canAddPack(pack)) return '';
    dispatch({ type: 'addPack', pack, quantity });
    setAnnouncement(`${packLabel(pack)} added to cart`);
    return packKey(packFingerprint(pack));
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    dispatch({ type: 'setQuantity', key, quantity });
  }, []);

  const updateVariant = useCallback((key: string, newVariantId: string) => {
    dispatch({ type: 'updateVariant', key, newVariantId });
  }, []);

  const removeItem = useCallback((key: string) => {
    dispatch({ type: 'remove', key });
    setAnnouncement('Item removed from cart');
  }, []);

  const clearCart = useCallback(() => dispatch({ type: 'clear' }), []);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const summary = useMemo(() => summariseCart(items, findProduct), [items, findProduct]);

  const value = useMemo<CartContextValue>(
    () => ({ items, ...summary, addItem, addCustomWall, addCustomSticker, addCustomPack, setQuantity, updateVariant, removeItem, clearCart, isOpen, openCart, closeCart, announcement }),
    [items, summary, addItem, addCustomWall, addCustomSticker, addCustomPack, setQuantity, updateVariant, removeItem, clearCart, isOpen, openCart, closeCart, announcement],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
