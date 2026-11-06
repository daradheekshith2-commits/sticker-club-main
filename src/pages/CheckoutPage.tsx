/**
 * CHECKOUT PREVIEW (frontend only)
 *
 * Shows the planned checkout flow and validates the form, but:
 * - nothing typed here is sent anywhere or saved (it lives only in React state),
 * - no payment is taken and no card fields exist,
 * - no order ID is created and no order is claimed to be placed.
 *
 * When a real backend exists, replace `handleSubmit` with a call to it.
 */
import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { LiveOrderCheckout, type OrderReceipt } from '../components/checkout/LiveOrderCheckout';
import { usePageMeta } from '../hooks/usePageMeta';
import { Link } from '../router/router';
import { formatPrice, pluralise } from '../utils/format';
import { ProductImage } from '../components/art/ProductArt';
import { WallCartLine } from '../components/cart/WallCartLine';
import { StickerCartLine } from '../components/cart/StickerCartLine';
import { PackCartLine } from '../components/cart/PackCartLine';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { EmptyState } from '../components/ui/EmptyState';

export function CheckoutPage() {
  usePageMeta('Checkout');
  const { lines, subtotal, itemCount, openCart } = useCart();
  const [createdOrder, setCreatedOrder] = useState<OrderReceipt | null>(null);

  if (!lines.length && !createdOrder) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          title="Your cart is empty"
          body="Add a few stickers, posters, or custom designs first, then proceed to checkout."
          action={
            <Link to="/shop" className="btn-primary">
              Go shopping
            </Link>
          }
        />
      </div>
    );
  }

  const MIN_CHECKOUT_TOTAL = 99;
  if (subtotal < MIN_CHECKOUT_TOTAL && !createdOrder) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          title="Minimum order value is ₹99"
          body={`Your current cart total is ${formatPrice(subtotal)}. Please add at least ${formatPrice(MIN_CHECKOUT_TOTAL - subtotal)} more to your cart to proceed to checkout.`}
          action={
            <Link to="/shop" className="btn-primary">
              Browse shop &amp; add more
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Checkout' }]} />
      <h1 className="mt-4 text-4xl font-extrabold md:text-5xl">
        {createdOrder ? 'Order Confirmation' : 'Checkout'}
      </h1>
      <p className="mt-2 text-ink-soft">
        {createdOrder
          ? 'Review your confirmed order details, complete UPI payment, and submit your UTR reference.'
          : 'Review your items, choose your college address or delivery address, and select your payment method (UPI or Cash on Delivery).'}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0">
          <LiveOrderCheckout onCreated={setCreatedOrder} />
        </div>

        <aside aria-labelledby="summary-title" className="h-fit rounded-[var(--radius-card)] border-2 border-ink bg-white p-5 sm:p-6 lg:sticky lg:top-24">
          <h2 id="summary-title" className="text-2xl font-extrabold">
            Order summary <span className="text-base font-bold text-ink-soft">({pluralise(itemCount, 'item')})</span>
          </h2>
          <ul className="mt-4 divide-y-2 divide-ink/10">
            {lines.map((line) =>
              line.type === 'custom-wall' ? (
                <li key={line.key} className="py-3">
                  <WallCartLine line={line} compact />
                </li>
              ) : line.type === 'custom-sticker' ? (
                <li key={line.key} className="py-3">
                  <StickerCartLine line={line} compact />
                </li>
              ) : line.type === 'custom-pack' ? (
                <li key={line.key} className="py-3">
                  <PackCartLine line={line} compact />
                </li>
              ) : (
                <li key={line.key} className="flex items-center gap-3 py-3">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border-2 border-ink/10">
                    <ProductImage product={line.product} className="size-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{line.product.name}</p>
                    <p className="text-sm text-ink-soft">
                      {line.variant ? `${line.variant.label} · ` : ''}
                      {line.quantity} × {formatPrice(line.unitPrice)}
                    </p>
                  </div>
                  <span className="font-bold tabular-nums">{formatPrice(line.lineTotal)}</span>
                </li>
              ),
            )}
          </ul>
          <dl className="mt-4 space-y-2 border-t-2 border-ink pt-4">
            <div className="flex justify-between text-base font-bold">
              <dt>Cart Subtotal</dt>
              <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
            </div>
            <p className="text-xs text-ink-soft">
              Delivery fee and final total are confirmed in the checkout panel.
            </p>
          </dl>
          <button type="button" className="mt-4 text-sm font-bold underline underline-offset-4" onClick={openCart}>
            Edit cart
          </button>
        </aside>
      </div>
    </div>
  );
}
