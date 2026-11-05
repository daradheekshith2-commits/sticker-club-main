import { memo, useState } from 'react';
import { LuArrowRight, LuMinus, LuPlus } from 'react-icons/lu';
import type { Product } from '../../types/product';
import { Link } from '../../router/router';
import { useCart } from '../../context/CartContext';
import { productTypeLabels } from '../../data/collections';
import { formatPrice } from '../../utils/format';
import { getPackQuantity, isPurchasable } from '../../utils/catalogue';
import { keyOf, MAX_QUANTITY_PER_ITEM, type ProductCartItem } from '../../utils/cart';
import { ProductImage, viewsFor } from '../art/ProductArt';
import { RarityBadge } from '../collectible/RarityBadge';
import { rankBlock } from '../../utils/popularity';

/**
 * Plain-language "what you get" line, e.g. "Sticker sheet · 8 stickers".
 * Only uses counts we can derive from the catalogue — no invented specs.
 */
export function describeContents(product: Product): string {
  const type = productTypeLabels[product.productType].singular;
  const qty = getPackQuantity(product);
  if (!qty) return product.productType === 'single' ? `${type} · 1 design` : type;
  const unit = product.category === 'posters' ? 'print' : 'sticker';
  return `${type} · ${qty} ${unit}${qty === 1 ? '' : 's'}`;
}

/** Product tile used on the homepage, shop and related-products rows. */
export const ProductCard = memo(function ProductCard({ product, headingLevel = 'h3' }: { product: Product; headingLevel?: 'h2' | 'h3' }) {
  const { addItem, items, setQuantity, removeItem } = useCart();
  const [isHovered, setIsHovered] = useState(false);
  const purchasable = isPurchasable(product);
  const hasSizes = Boolean(product.variants?.length);
  const isTheme = product.variantLabel === 'Theme';
  const Heading = headingLevel;
  const url = `/product/${product.slug}`;
  // Second picture shown on hover (desktop only): a real photo #2, or the "in use" drawing.
  const hasHover = (product.images?.length ?? 0) > 1 || (!product.images?.length && viewsFor(product).includes('context'));

  const matchingItems = items.filter(
    (i) => (i.kind === undefined || i.kind === 'product') && i.productId === product.id
  ) as ProductCartItem[];

  const inCartItem = matchingItems.length === 1 ? matchingItems[0] : undefined;
  const inCartQty = inCartItem ? inCartItem.quantity : 0;

  const actionBase =
    'relative z-10 inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border-2 border-ink px-3.5 text-sm font-bold transition-colors';
  const isPoster = product.category === 'posters' || product.productType === 'poster';

  return (
    <article
      className="group relative flex h-full flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onFocus={() => setIsHovered(true)}
    >
      <Link
        to={url}
        className={`relative block ${isPoster ? 'aspect-[1/1.414]' : 'aspect-square'} overflow-hidden rounded-[var(--radius-card)] border border-mint/15 bg-paper-deep shadow-[0_8px_20px_rgba(0,0,0,0.3)] transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-[0_16px_32px_rgba(0,0,0,0.5),0_0_20px_rgba(255,16,38,0.15)] group-hover:border-mint/40`}
        tabIndex={-1}
        aria-hidden
      >
        <ProductImage product={product} className="size-full object-cover object-center" />
        {hasHover && isHovered && (
          // Only mounted and downloaded on actual desktop hover/focus, saving bandwidth on initial page loads
          <span className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            {product.images && product.images.length > 1 ? (
              <ProductImage product={product} index={1} className="size-full object-cover object-center" />
            ) : (
              <ProductImage product={product} view="context" className="size-full object-cover object-center" />
            )}
          </span>
        )}
        {/* At most one badge, so the artwork stays the focus. */}
        {!purchasable ? (
          <span className="absolute top-3 left-3 rounded-full border-2 border-ink bg-white px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase">
            Coming later
          </span>
        ) : product.isNew ? (
          <span className="absolute top-3 left-3 rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold tracking-wide text-paper uppercase">New</span>
        ) : null}
        {/* Rarity only shows for the special tiers, so most cards stay clean. */}
        {(product.rarity === 'rare' || product.rarity === 'limited') && <RarityBadge rarity={product.rarity} className="absolute top-3 right-3" />}
      </Link>

      <div className="flex flex-1 flex-col pt-3.5">
        <p className="text-[11px] font-bold tracking-[0.08em] text-ink-soft uppercase">{describeContents(product)}</p>
        <Heading className="mt-1 font-display text-[1.05rem] leading-snug font-bold sm:text-lg">
          {/* The ::after stretches this link over the whole card, so the card is clickable with one link. */}
          <Link to={url} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {product.name}
          </Link>
        </Heading>
        {hasSizes && isTheme && <p className="mt-1 text-xs font-bold text-ink-soft">{product.variants!.length} themes to choose from</p>}
        {hasSizes && !isTheme && (
          <ul className="mt-1.5 flex flex-wrap gap-1" aria-label="Available sizes">
            {product.variants!.map((v) => (
              <li key={v.id} className="rounded border border-ink/20 px-1.5 text-[11px] font-bold">
                {v.label}
              </li>
            ))}
          </ul>
        )}

        {/* Price and action share a row pinned to the bottom, so cards line up in the grid. */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <p className="font-display text-lg font-extrabold tabular-nums">
            {hasSizes && !isTheme && <span className="text-xs font-bold text-ink-soft">From </span>}
            {formatPrice(product.price)}
          </p>
          {purchasable &&
            (hasSizes ? (
              inCartItem && inCartQty > 0 ? (
                <div
                  role="group"
                  aria-label={`Quantity of ${product.name}`}
                  className="relative z-10 inline-flex h-10 shrink-0 items-center rounded-full border border-mint/25 bg-[#08241E] px-1 text-ink shadow-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const cartKey = keyOf(inCartItem);
                      if (inCartQty <= 1) {
                        removeItem(cartKey);
                      } else {
                        setQuantity(cartKey, inCartQty - 1);
                      }
                    }}
                    className="grid size-8 place-items-center rounded-full text-ink hover:bg-paper-deep hover:text-mint transition-colors"
                    aria-label={inCartQty === 1 ? `Remove ${product.name} from cart` : `Decrease quantity of ${product.name}`}
                  >
                    <LuMinus aria-hidden className="size-3.5" />
                  </button>
                  <span aria-live="polite" className="w-6 text-center text-sm font-bold tabular-nums text-ink">
                    {inCartQty}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setQuantity(keyOf(inCartItem), Math.min(MAX_QUANTITY_PER_ITEM, inCartQty + 1));
                    }}
                    disabled={inCartQty >= MAX_QUANTITY_PER_ITEM}
                    className="grid size-8 place-items-center rounded-full text-ink hover:bg-paper-deep hover:text-mint transition-colors disabled:opacity-30"
                    aria-label={`Increase quantity of ${product.name}`}
                  >
                    <LuPlus aria-hidden className="size-3.5" />
                  </button>
                </div>
              ) : matchingItems.length > 1 ? (
                <Link to={url} className={`${actionBase} bg-white hover:bg-ink hover:text-paper`} aria-label={`View chosen sizes for ${product.name}`}>
                  {isTheme ? 'Themes' : 'Sizes'} ({matchingItems.reduce((acc, cur) => acc + cur.quantity, 0)}) <LuArrowRight aria-hidden className="size-4" />
                </Link>
              ) : (
                <Link to={url} className={`${actionBase} bg-white hover:bg-ink hover:text-paper`} aria-label={`Choose a ${isTheme ? 'theme' : 'size'} for ${product.name}`}>
                  {isTheme ? 'Theme' : 'Size'} <LuArrowRight aria-hidden className="size-4" />
                </Link>
              )
            ) : inCartQty > 0 && inCartItem ? (
              <div
                role="group"
                aria-label={`Quantity of ${product.name}`}
                className="relative z-10 inline-flex h-10 shrink-0 items-center rounded-full border border-mint/25 bg-[#08241E] px-1 text-ink shadow-sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const cartKey = keyOf(inCartItem);
                    if (inCartQty <= 1) {
                      removeItem(cartKey);
                    } else {
                      setQuantity(cartKey, inCartQty - 1);
                    }
                  }}
                  className="grid size-8 place-items-center rounded-full text-ink hover:bg-paper-deep hover:text-mint transition-colors"
                  aria-label={inCartQty === 1 ? `Remove ${product.name} from cart` : `Decrease quantity of ${product.name}`}
                >
                  <LuMinus aria-hidden className="size-3.5" />
                </button>
                <span aria-live="polite" className="w-6 text-center text-sm font-bold tabular-nums text-ink">
                  {inCartQty}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setQuantity(keyOf(inCartItem), Math.min(MAX_QUANTITY_PER_ITEM, inCartQty + 1));
                  }}
                  disabled={inCartQty >= MAX_QUANTITY_PER_ITEM}
                  className="grid size-8 place-items-center rounded-full text-ink hover:bg-paper-deep hover:text-mint transition-colors disabled:opacity-30"
                  aria-label={`Increase quantity of ${product.name}`}
                >
                  <LuPlus aria-hidden className="size-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  addItem(product.id, 1);
                }}
                className={`${actionBase} bg-lime hover:bg-ink hover:text-lime`}
                aria-label={`Add ${product.name} to cart`}
              >
                <LuPlus aria-hidden className="size-4" /> Add
              </button>
            ))}
        </div>
      </div>
    </article>
  );
});

/**
 * Responsive product grid.
 * - 'wide' (default): up to 4 columns, for full-width rows like the homepage.
 * - 'beside-filters': up to 3 columns, for the shop page where a sidebar takes space.
 */
export function ProductGrid({
  products,
  headingLevel,
  layout = 'wide',
}: {
  products: Product[];
  headingLevel?: 'h2' | 'h3';
  layout?: 'wide' | 'beside-filters';
}) {
  const rankedProducts = rankBlock(products);
  const cols = layout === 'wide' ? 'lg:grid-cols-4' : 'md:grid-cols-3 xl:grid-cols-4';
  return (
    <ul className={`grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 ${cols}`}>
      {rankedProducts.map((p) => (
        <li key={p.id}>
          <ProductCard product={p} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}
