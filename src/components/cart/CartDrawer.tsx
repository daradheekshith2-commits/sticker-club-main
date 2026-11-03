import { useEffect, useRef } from 'react';
import { LuArrowRight, LuPlus, LuTrash2, LuX } from 'react-icons/lu';
import { useCart } from '../../context/CartContext';
import { useCatalogue } from '../../context/CatalogueContext';
import { Link, useNavigate } from '../../router/router';
import { products as fallbackProducts } from '../../data/products';
import { formatPrice, pluralise } from '../../utils/format';
import { getRelatedProducts, isPurchasable, shopUrl } from '../../utils/catalogue';
import { ProductImage } from '../art/ProductArt';
import type { ProductCartLine } from '../../utils/cart';
import { WallCartLine } from './WallCartLine';
import { StickerCartLine } from './StickerCartLine';
import { PackCartLine } from './PackCartLine';
import { QuantitySelector } from '../product/QuantitySelector';

/** Slide-in cart panel available from every page via the header button. */
export function CartDrawer() {
  const { isOpen, closeCart, lines, itemCount, subtotal, setQuantity, removeItem, addItem } = useCart();
  const navigate = useNavigate();
  const panel = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    document.body.style.overflow = 'hidden'; // stop the page scrolling behind

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCart();
      // Keep Tab inside the drawer while it's open.
      if (e.key === 'Tab' && panel.current) {
        const focusables = panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input');
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, [isOpen, closeCart]);

  if (!isOpen) return null;

  const { products: liveProducts } = useCatalogue();
  const availableProducts = liveProducts.length ? liveProducts : fallbackProducts;

  // One small suggestion: something related to the first item that isn't already in the cart.
  // Only suggest things that can be added in one tap (no size to choose).
  const productLines = lines.filter((l) => l.type === 'product');
  const inCart = new Set(productLines.map((l) => l.product.id));
  const oneTap = (p: (typeof fallbackProducts)[number]) => !inCart.has(p.id) && isPurchasable(p) && !p.variants;
  const suggestion = productLines.length
    ? (getRelatedProducts(productLines[0].product, 8, availableProducts).find(oneTap) ?? availableProducts.find((p) => p.featured && oneTap(p)))
    : availableProducts.find((p) => p.featured && oneTap(p));

  const go = (to: string) => {
    closeCart();
    navigate(to);
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="fade-in absolute inset-0 bg-black/65" onClick={closeCart} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        className="drawer-in absolute top-0 right-0 flex h-full w-full max-w-md flex-col border-l-2 border-ink bg-paper"
      >
        <div className="flex items-center justify-between border-b-2 border-ink px-5 py-4">
          <h2 id="cart-title" className="text-2xl font-extrabold">
            Your cart <span className="text-base font-bold text-ink-soft">({pluralise(itemCount, 'item')})</span>
          </h2>
          <button ref={closeBtn} type="button" onClick={closeCart} aria-label="Close cart" className="grid size-10 place-items-center rounded-full hover:bg-paper-deep">
            <LuX aria-hidden className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {lines.length === 0 ? (
            <div className="py-10 text-center">
              <p className="font-display text-2xl font-extrabold">Nothing stuck here yet.</p>
              <p className="mt-2 text-ink-soft">Start with a mini sticker or a poster for your wall.</p>
              <button type="button" className="btn-primary mt-6" onClick={() => go(shopUrl({}))}>
                Start browsing <LuArrowRight aria-hidden />
              </button>
            </div>
          ) : (
            <ul className="divide-y-2 divide-ink/10">
              {lines.map((line) =>
                line.type === 'custom-wall' ? (
                  <li key={line.key} className="py-4">
                    <WallCartLine line={line} onQuantity={(n) => setQuantity(line.key, n)} onRemove={() => removeItem(line.key)} />
                  </li>
                ) : line.type === 'custom-pack' ? (
                  <li key={line.key} className="py-4">
                    <PackCartLine line={line} onQuantity={(n) => setQuantity(line.key, n)} onRemove={() => removeItem(line.key)} />
                  </li>
                ) : line.type === 'custom-sticker' ? (
                  <li key={line.key} className="py-4">
                    <StickerCartLine line={line} onQuantity={(n) => setQuantity(line.key, n)} onRemove={() => removeItem(line.key)} />
                  </li>
                ) : (
                <ProductLineItem key={line.key} line={line} />
              ))}
            </ul>
          )}


          {suggestion && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border-2 border-dashed border-ink/20 p-3">
              <div className="size-14 shrink-0 overflow-hidden rounded-lg">
                <ProductImage product={suggestion} className="size-full" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold tracking-wide text-ink-soft uppercase">You might also like</p>
                <p className="truncate font-bold">{suggestion.name}</p>
                <p className="text-sm">{formatPrice(suggestion.price)}</p>
              </div>
              <button type="button" onClick={() => addItem(suggestion.id)} className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-ink bg-lime" aria-label={`Add ${suggestion.name} to cart`}>
                <LuPlus aria-hidden />
              </button>
            </div>
          )}
        </div>

        {lines.length > 0 && (() => {
          const MIN_CHECKOUT_TOTAL = 99;
          const canCheckout = subtotal >= MIN_CHECKOUT_TOTAL;
          const amountNeeded = Math.max(0, MIN_CHECKOUT_TOTAL - subtotal);
          return (
            <div className="receipt-edge border-t-2 border-dashed border-ink/20 bg-paper-deep px-5 pt-5 pb-7 shadow-2xl">
              <div className="flex items-baseline justify-between border-b border-ink/10 pb-3">
                <span className="font-mono text-xs tracking-widest text-mint uppercase">ESTIMATED TOTAL</span>
                <span className="font-display text-2xl font-extrabold tabular-nums text-ink">{formatPrice(subtotal)}</span>
              </div>

              {/* Minimum checkout total progress requirement */}
              {!canCheckout && (
                <div className="mt-3 rounded-xl border border-tomato/30 bg-tomato/10 p-3 text-xs">
                  <div className="flex justify-between font-bold text-ink">
                    <span>Minimum order to checkout is ₹99</span>
                    <span className="text-tomato font-extrabold">Add {formatPrice(amountNeeded)} more</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
                    <div
                      className="h-full bg-mint transition-all duration-300"
                      style={{ width: `${Math.min(100, (subtotal / MIN_CHECKOUT_TOTAL) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-ink-soft">
                    Add another sticker or poster to reach the ₹99 checkout minimum.
                  </p>
                </div>
              )}

              <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                Verified database pricing. Delivery fee and payment method (UPI or Cash on Delivery) are confirmed at checkout.
              </p>
              <button
                type="button"
                disabled={!canCheckout}
                className={`btn-primary mt-4 w-full flex items-center justify-center gap-1.5 ${
                  !canCheckout ? 'opacity-60 cursor-not-allowed' : ''
                }`}
                onClick={() => canCheckout && go('/checkout')}
              >
                {canCheckout ? (
                  <>
                    Proceed to checkout <LuArrowRight aria-hidden />
                  </>
                ) : (
                  <>Add {formatPrice(amountNeeded)} more to checkout</>
                )}
              </button>
              <button type="button" className="mt-2.5 w-full py-2 text-xs font-mono font-bold tracking-wider uppercase text-ink-soft hover:text-ink transition-colors" onClick={closeCart}>
                ← Continue shopping
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

/** One ordinary product in the cart drawer. */
function ProductLineItem({ line }: { line: ProductCartLine }) {
  const { closeCart, setQuantity, removeItem } = useCart();
  const { key, product, variant, secretNote, unitPrice, quantity, lineTotal } = line;
  return (
    <li className="flex gap-4 py-4">
      <Link to={`/product/${product.slug}`} onClick={closeCart} className="block size-20 shrink-0 overflow-hidden rounded-xl border-2 border-ink/10">
        <ProductImage product={product} className="size-full" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-between gap-2">
          <Link to={`/product/${product.slug}`} onClick={closeCart} className="font-bold leading-tight hover:underline">
            {product.name}
          </Link>
          <span className="font-bold tabular-nums">{formatPrice(lineTotal)}</span>
        </div>
        <p className="text-sm text-ink-soft">
          {variant && <span className="mr-1.5 rounded border border-ink/25 px-1 text-xs font-bold text-ink">{variant.label}</span>}
          {formatPrice(unitPrice)} each
        </p>
        {secretNote && (
          <div className="mt-1.5 rounded-lg border border-mint/40 bg-mint/10 p-2 text-xs">
            <span className="font-bold text-mint flex items-center gap-1">
              <span>✉</span> Wax-Sealed Secret Note:
            </span>
            <span className="mt-0.5 block italic text-ink font-medium">"{secretNote}"</span>
          </div>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <QuantitySelector size="sm" allowZero label={`Quantity of ${product.name}${variant ? ` ${variant.label}` : ''}`} value={quantity} onChange={(n) => setQuantity(key, n)} />
          <button type="button" onClick={() => removeItem(key)} className="flex items-center gap-1 text-sm text-ink-soft hover:text-ink" aria-label={`Remove ${product.name}${variant ? ` ${variant.label}` : ''}`}>
            <LuTrash2 aria-hidden className="size-4" /> Remove
          </button>
        </div>
      </div>
    </li>
  );
}
