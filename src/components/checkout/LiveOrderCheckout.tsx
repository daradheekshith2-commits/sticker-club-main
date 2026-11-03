import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { Link } from '../../router/router';
import type { ProductCartLine } from '../../utils/cart';

type Address = { id: string; recipient: string; line1: string; city: string; state: string; postalCode: string; isDefault: boolean };
type ServerCart = {
  items: Array<{
    productId: string;
    variantId: string;
    quantity: number;
    product: {
      name: string;
      price: string;
      active: boolean;
      variants: Array<{ id: string; label: string; price: string }>;
      inventory: { quantity: number } | null;
    };
  }>;
};

export type OrderReceipt = {
  id: string;
  total: string;
  subtotal: string;
  deliveryFee: string;
  paymentMethod: 'UPI' | 'COD';
  paymentStatus: string;
  status: string;
  payment?: {
    id: string;
    status: string;
    method?: string;
    amount?: string;
    utr?: string | null;
    rejectionReason?: string | null;
  } | null;
};

type PaymentConfig = {
  upiId: string | null;
  upiName?: string | null;
  upiQrUrl: string | null;
  deliveryFee: string | null;
};

export function LiveOrderCheckout({ onCreated }: { onCreated?: (order: OrderReceipt) => void } = {}) {
  const { user, request, requestMultipart } = useAuth();
  const { lines, removeItem } = useCart();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selected, setSelected] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [newAddress, setNewAddress] = useState({ recipient: '', phone: '', line1: '', city: 'Hyderabad', state: 'Telangana', postalCode: '' });
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'COD'>('UPI');
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<OrderReceipt | null>(null);
  const [preview, setPreview] = useState<ServerCart | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Sync user phone if loaded after mount
  useEffect(() => {
    if (user?.phone && !phone) {
      setPhone(user.phone);
    }
  }, [user?.phone]);

  // Stable idempotency key: stays constant across retries of the same purchase attempt
  const [purchaseAttemptKey, setPurchaseAttemptKey] = useState(() => crypto.randomUUID());
  useEffect(() => {
    // Generate fresh key only when purchase parameters change
    setPurchaseAttemptKey(crypto.randomUUID());
  }, [selected, paymentMethod, lines.length, phone]);

  // UTR submission state on receipt
  const [utrInput, setUtrInput] = useState('');
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [utrSuccess, setUtrSuccess] = useState('');
  const [utrError, setUtrError] = useState('');

  const standard = lines.filter((l): l is ProductCartLine => l.type === 'product');
  const customLinesInCart = lines.filter((l) => l.type !== 'product');

  useEffect(() => {
    // Fetch payment configuration (UPI ID, QR, delivery fee)
    void request<PaymentConfig>('/api/payment/config')
      .then(setPaymentConfig)
      .catch(() => setPaymentConfig(null));
  }, []);

  useEffect(() => {
    if (!user) return;
    void request<Address[]>('/api/me/addresses')
      .then((a) => {
        setAddresses(a);
        setSelected(a.find((x) => x.isDefault)?.id ?? a[0]?.id ?? '');
      })
      .catch((e) => setError(String(e)));
  }, [user?.id]);

  async function addAddress(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const saved = await request<Address>('/api/me/addresses', {
        method: 'POST',
        body: JSON.stringify({ ...newAddress, isDefault: !addresses.length }),
      });
      setAddresses((a) => [...a, saved]);
      setSelected(saved.id);
      if (newAddress.phone && !phone) {
        setPhone(newAddress.phone);
      }
      setNewAddress({ recipient: '', phone: '', line1: '', city: 'Hyderabad', state: 'Telangana', postalCode: '' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save address');
    } finally {
      setSaving(false);
    }
  }

  async function uploadArtworkBlob(objectUrlOrHttpUrl: string, fileName: string): Promise<{ id: string; url?: string }> {
    const blob = await fetch(objectUrlOrHttpUrl).then((r) => r.blob());
    const formData = new FormData();
    formData.append('file', blob, fileName || 'artwork.png');

    const data = await requestMultipart<{ id: string; url?: string }>('/api/uploads/artwork', formData);
    return data;
  }

  async function prepare() {
    if (!user || (!standard.length && !customLinesInCart.length)) return;
    const phoneDigits = phone.replace(/\D/g, '');
    if (!phoneDigits || phoneDigits.length < 10) {
      setError('Please enter a valid 10-digit phone number for delivery updates before reviewing prices.');
      return;
    }
    setWorking(true);
    setError('');
    setPreview(null);
    try {
      if (standard.length) {
        await request('/api/cart', { method: 'DELETE' });
        for (const line of standard) {
          await request('/api/cart/items', {
            method: 'POST',
            body: JSON.stringify({ productId: line.product.id, variantId: line.variant?.id, quantity: line.quantity }),
          });
        }
        const data = await request<ServerCart>('/api/cart');
        if (data.items.length !== standard.length) throw Error('The server cart did not match your order. No order has been placed.');
        setPreview(data);
      } else {
        setPreview({ items: [] });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not review your order');
    } finally {
      setWorking(false);
    }
  }

  async function place() {
    if (!selected || !preview || working) return;
    const phoneDigits = phone.replace(/\D/g, '');
    if (!phoneDigits || phoneDigits.length < 10) {
      setError('Please enter a valid 10-digit phone number for delivery contact.');
      return;
    }
    setWorking(true);
    setError('');
    try {
      const preparedCustomLines = [];
      for (const line of customLinesInCart) {
        if (line.type === 'custom-sticker') {
          let artId = (line.sticker.image as any).artworkId;
          let previewUrl = (line.sticker.image as any).url || null;
          if (!artId) {
            const url = line.sticker.image.source === 'upload' ? line.sticker.image.objectUrl : (line.sticker.image as any).url;
            if (url) {
              const fileName = 'fileName' in line.sticker.image ? (line.sticker.image.fileName as string) : 'custom-sticker.png';
              const upRes = await uploadArtworkBlob(url, fileName);
              artId = upRes.id;
              if (upRes.url) previewUrl = upRes.url;
            }
          }
          if (!artId) {
            throw new Error('Please ensure an artwork image is attached to your custom sticker');
          }
          preparedCustomLines.push({
            type: 'custom-sticker',
            artworkId: artId,
            previewUrl,
            sizeId: line.sticker.sizeId,
            finishId: line.sticker.finishId,
            shape: line.sticker.shape,
            quantity: line.quantity,
          });
        } else if (line.type === 'custom-pack') {
          preparedCustomLines.push({
            type: 'custom-pack',
            seriesId: line.pack.seriesId,
            size: line.pack.size,
            finishId: line.pack.finishId,
            designIds: line.pack.designIds,
            quantity: line.quantity,
          });
        } else if (line.type === 'custom-wall') {
          const slots = [];
          for (const s of line.wall.slots) {
            if (s.fill.source === 'upload') {
              const upRes = await uploadArtworkBlob(s.fill.objectUrl, s.fill.fileName);
              slots.push({ slotId: s.slotId, size: s.size, fill: { source: 'upload', artworkId: upRes.id, previewUrl: upRes.url, fileName: s.fill.fileName } });
            } else if (s.fill.source === 'catalogue') {
              slots.push({ slotId: s.slotId, size: s.size, fill: { source: 'catalogue', productId: s.fill.productId } });
            } else if (s.fill.source === 'url') {
              const upRes = await uploadArtworkBlob(s.fill.url, 'linked-wall-slot.png');
              slots.push({ slotId: s.slotId, size: s.size, fill: { source: 'upload', artworkId: upRes.id, previewUrl: upRes.url, fileName: 'linked-wall-slot.png' } });
            }
          }
          preparedCustomLines.push({
            type: 'custom-wall',
            layoutId: line.wall.layoutId,
            slots,
            quantity: line.quantity,
          });
        }
      }

      const placed = await request<OrderReceipt>('/api/orders', {
        method: 'POST',
        headers: { 'Idempotency-Key': purchaseAttemptKey },
        body: JSON.stringify({
          addressId: selected,
          phone: phone.trim(),
          paymentMethod,
          clearServerCart: standard.length === 0,
          customLines: preparedCustomLines.length > 0 ? preparedCustomLines : undefined,
        }),
      });
      setOrder(placed);
      onCreated?.(placed);
      for (const line of lines) {
        removeItem(line.key);
      }
      setPreview(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create order');
      setPreview(null);
    } finally {
      setWorking(false);
    }
  }

  async function submitUtr(event: FormEvent) {
    event.preventDefault();
    if (!order || !utrInput.trim()) return;
    setSubmittingUtr(true);
    setUtrError('');
    setUtrSuccess('');
    try {
      const res = await request<{ orderId: string; payment: { id: string; status: string; utr: string } }>(
        `/api/orders/${order.id}/payment/utr`,
        {
          method: 'POST',
          body: JSON.stringify({ utr: utrInput.trim() }),
        }
      );
      setUtrSuccess('Transaction ID submitted successfully! Our team will verify your payment shortly.');
      setOrder((prev) => (prev ? { ...prev, payment: { ...prev.payment, ...res.payment } } : prev));
      setUtrInput('');
    } catch (e) {
      setUtrError(e instanceof Error ? e.message : 'Failed to submit Transaction ID');
    } finally {
      setSubmittingUtr(false);
    }
  }

  if (!user) {
    return (
      <section className="rounded-2xl border border-ink/20 bg-white p-6">
        <h2 className="text-2xl font-extrabold">Sign in to checkout</h2>
        <p className="mt-2 text-sm text-ink-soft">Sign in to review items against real-time database availability and place your order.</p>
        <Link className="btn-primary mt-4 inline-block" to="/login">
          Sign in
        </Link>
      </section>
    );
  }

  if (order) {
    const isUpi = order.paymentMethod === 'UPI';
    const isPaid = order.paymentStatus === 'PAID';
    const isUtrSubmitted = order.payment?.status === 'SUBMITTED' || Boolean(utrSuccess);

    return (
      <section className="rounded-2xl border border-ink/20 bg-white p-6" role="status">
        <div className="flex items-center justify-between border-b border-ink/15 pb-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-ink-soft">Order Confirmation</span>
            <h2 className="text-2xl font-extrabold">Order #{order.id}</h2>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              isPaid
                ? 'bg-mint/20 text-mint'
                : isUtrSubmitted
                ? 'bg-sun/20 text-sun'
                : 'bg-bubble/20 text-bubble'
            }`}
          >
            {isPaid ? 'PAID' : isUtrSubmitted ? 'UNDER REVIEW' : 'PAYMENT PENDING'}
          </span>
        </div>

        <div className="mt-4 grid gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-soft">Subtotal:</span>
            <strong>₹{order.subtotal}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-soft">Delivery Fee:</span>
            <strong>₹{order.deliveryFee}</strong>
          </div>
          <div className="flex justify-between border-t border-ink/10 pt-2 text-base font-extrabold">
            <span>Total Payable:</span>
            <span className="text-lime">₹{order.total}</span>
          </div>
          <div className="flex justify-between pt-1">
            <span className="text-ink-soft">Payment Method:</span>
            <strong>{isUpi ? 'UPI' : 'Cash on Delivery (COD)'}</strong>
          </div>
          {phone && (
            <div className="flex justify-between pt-1">
              <span className="text-ink-soft">Contact Phone:</span>
              <strong className="font-mono text-ink">📞 {phone}</strong>
            </div>
          )}
        </div>

        {isUpi && !isPaid && (
          <div className="mt-6 rounded-xl border-2 border-dashed border-sun/50 bg-sun/10 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Complete your UPI payment</h3>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600">
                Verified Merchant
              </span>
            </div>

            {paymentConfig?.upiId ? (
              <div className="mt-3 space-y-3">
                <div className="rounded-xl border border-ink/10 bg-white p-3.5 shadow-sm space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-ink/10 pb-2">
                    <span className="text-xs font-bold text-ink-soft uppercase tracking-wider">UPI Display Name (Payee)</span>
                    <span className="font-mono text-sm font-extrabold text-ink tracking-wide">
                      {paymentConfig.upiName || 'KOMMULA SRUJAN REDDY'}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-ink/10 pb-2">
                    <span className="text-xs font-bold text-ink-soft uppercase tracking-wider">Store UPI ID</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-ink select-all">
                        {paymentConfig.upiId}
                      </span>
                      <button
                        type="button"
                        className="btn-ghost text-xs py-1 px-2.5"
                        onClick={() => {
                          if (paymentConfig.upiId) {
                            navigator.clipboard.writeText(paymentConfig.upiId);
                            setCopiedUpi(true);
                            setTimeout(() => setCopiedUpi(false), 2000);
                          }
                        }}
                      >
                        {copiedUpi ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-xs font-bold text-ink-soft uppercase tracking-wider">Amount to Transfer</span>
                    <span className="font-display text-lg font-extrabold text-emerald-600">
                      ₹{order.total}
                    </span>
                  </div>
                </div>

                {paymentConfig.upiQrUrl && (
                  <div className="mt-3 text-center sm:text-left">
                    <p className="text-xs font-bold text-ink-soft mb-2">Scan with Google Pay, PhonePe, Paytm, or any UPI app:</p>
                    <div className="inline-block rounded-xl border-2 border-ink/15 bg-white p-2.5 shadow-sm">
                      <img
                        src={paymentConfig.upiQrUrl}
                        alt="UPI QR Code - Payee KOMMULA SRUJAN REDDY"
                        className="h-44 w-44 rounded-lg object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">
                Store UPI ID is not configured yet. Please contact support or check back once verified.
              </p>
            )}

            <div className="mt-5 border-t border-ink/15 pt-4">
              <h4 className="text-sm font-bold">Submit your UPI Transaction ID</h4>
              <p className="mt-1 text-xs text-ink-soft">
                After paying in your UPI app (GPay, PhonePe, Paytm, etc.), copy the Transaction ID / Ref No. and paste it below.
              </p>
              {utrSuccess && (
                <p className="mt-3 rounded-lg bg-mint/20 p-2 text-sm text-mint font-medium" role="status">
                  {utrSuccess}
                </p>
              )}
              {utrError && (
                <p className="mt-3 rounded-lg bg-danger/20 p-2 text-sm text-danger" role="alert">
                  {utrError}
                </p>
              )}
              {!utrSuccess && (
                <form className="mt-3 flex flex-col sm:flex-row gap-2" onSubmit={submitUtr}>
                  <input
                    type="text"
                    required
                    placeholder="Enter UPI Transaction ID / Ref No."
                    className="field-input flex-1 text-xs"
                    value={utrInput}
                    onChange={(e) => setUtrInput(e.target.value)}
                  />
                  <button className="btn-primary text-xs" type="submit" disabled={submittingUtr || !utrInput.trim()}>
                    {submittingUtr ? 'Submitting…' : 'Submit Transaction ID'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {!isUpi && (
          <div className="mt-5 rounded-xl border border-sky/30 bg-sky/10 p-4 text-sm">
            <h3 className="font-bold">Cash on Delivery</h3>
            <p className="mt-1 text-ink-soft">
              Please keep <strong>₹{order.total}</strong> in cash ready when the delivery partner arrives.
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/account" className="btn-primary">
            View in My Orders →
          </Link>
          <button type="button" className="btn-ghost" onClick={() => setOrder(null)}>
            Place Another Order
          </button>
        </div>
      </section>
    );
  }

  const standardSubtotal = preview
    ? preview.items.reduce(
        (total, item) =>
          total +
          Number(item.product.variants.find((v) => v.id === item.variantId)?.price ?? item.product.price) * item.quantity,
        0
      )
    : 0;
  const customSubtotal = customLinesInCart.reduce((sum, line) => sum + line.lineTotal, 0);
  const subtotalEstimate = standardSubtotal + customSubtotal;
  const deliveryFeeVal = paymentConfig?.deliveryFee ? Number(paymentConfig.deliveryFee) : 0;
  const totalEstimate = subtotalEstimate + deliveryFeeVal;

  return (
    <section className="rounded-2xl border border-ink/20 bg-white p-6">
      <h2 className="text-2xl font-extrabold">Checkout with database verification</h2>
      <p className="mt-2 text-sm text-ink-soft">
        Standard catalogue items and custom designs are verified server-side. Shipping and prices are securely validated.
      </p>

      {lines.length === 0 && <p className="mt-3 text-sm">There are no products in this cart.</p>}

      {/* Address selection */}
      <label className="mt-5 block text-sm font-bold">
        Shipping address
        <select
          className="field-input mt-2"
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            setPreview(null);
          }}
        >
          <option value="">Select a saved address</option>
          {addresses.map((a) => (
            <option key={a.id} value={a.id}>
              {a.recipient} — {a.line1}, {a.city} {a.postalCode}
            </option>
          ))}
        </select>
      </label>

      {/* Add Address Form */}
      <details open={addresses.length === 0} className="mt-4 rounded-xl border border-ink/20 p-4">
        <summary className="cursor-pointer font-bold">Add a delivery address</summary>
        <form className="mt-3 grid gap-3" onSubmit={addAddress}>
          <input
            className="field-input"
            aria-label="Recipient"
            placeholder="Recipient name"
            required
            maxLength={100}
            value={newAddress.recipient}
            onChange={(e) => setNewAddress((a) => ({ ...a, recipient: e.target.value }))}
          />
          <input
            className="field-input"
            aria-label="Address line"
            placeholder="Building, street and area"
            required
            maxLength={250}
            value={newAddress.line1}
            onChange={(e) => setNewAddress((a) => ({ ...a, line1: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="field-input"
              aria-label="City"
              placeholder="City"
              required
              value={newAddress.city}
              onChange={(e) => setNewAddress((a) => ({ ...a, city: e.target.value }))}
            />
            <input
              className="field-input"
              aria-label="State"
              placeholder="State"
              required
              value={newAddress.state}
              onChange={(e) => setNewAddress((a) => ({ ...a, state: e.target.value }))}
            />
          </div>
          <input
            className="field-input"
            aria-label="Postal code"
            placeholder="PIN code"
            required
            minLength={3}
            maxLength={15}
            value={newAddress.postalCode}
            onChange={(e) => setNewAddress((a) => ({ ...a, postalCode: e.target.value }))}
          />
          <input
            className="field-input"
            aria-label="Contact phone number"
            placeholder="Contact phone number (10 digits)"
            type="tel"
            maxLength={15}
            value={newAddress.phone}
            onChange={(e) => {
              const val = e.target.value.replace(/[^\d\s+-]/g, '');
              setNewAddress((a) => ({ ...a, phone: val }));
              if (!phone) setPhone(val);
            }}
          />
          <button className="btn-ghost" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save address'}
          </button>
        </form>
      </details>

      {/* Contact Phone Number Input */}
      <div className="mt-5 rounded-2xl border border-ink/15 bg-paper/30 p-4">
        <label className="block text-sm font-bold text-ink">
          <span>Contact Phone Number</span> <span className="text-danger">*</span>
          <span className="block mt-0.5 text-xs font-normal text-ink-soft">
            Required for order delivery, courier coordination, and status updates.
          </span>
          <div className="mt-2 flex rounded-xl border border-ink/20 bg-white focus-within:border-lime focus-within:ring-2 focus-within:ring-lime/20 overflow-hidden shadow-sm">
            <span className="flex items-center bg-paper px-3.5 text-sm font-semibold text-ink-soft border-r border-ink/15 select-none">
              🇮🇳 +91
            </span>
            <input
              type="tel"
              required
              placeholder="e.g. 9876543210"
              maxLength={15}
              className="w-full px-3 py-2.5 text-sm font-medium text-ink focus:outline-none placeholder:text-ink-soft/60"
              value={phone}
              onChange={(e) => {
                const val = e.target.value.replace(/[^\d\s+-]/g, '');
                setPhone(val);
                setError('');
              }}
            />
          </div>
        </label>
      </div>

      {/* Payment Method Selection */}
      <div className="mt-5">
        <span id="payment-method-label" className="block text-sm font-bold">Choose Payment Method</span>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-labelledby="payment-method-label">
          <button
            type="button"
            role="radio"
            aria-checked={paymentMethod === 'UPI'}
            className={`flex flex-col rounded-xl border-2 p-4 text-left transition-colors ${
              paymentMethod === 'UPI' ? 'border-lime bg-lime/10' : 'border-ink/20 hover:border-ink/40'
            }`}
            onClick={() => setPaymentMethod('UPI')}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold">UPI (QR / VPA)</span>
              {paymentMethod === 'UPI' && <span className="text-lime" aria-hidden>●</span>}
            </div>
            <p className="mt-1 text-xs text-ink-soft">Scan QR or transfer to store UPI ID, then submit your Transaction ID.</p>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={paymentMethod === 'COD'}
            className={`flex flex-col rounded-xl border-2 p-4 text-left transition-colors ${
              paymentMethod === 'COD' ? 'border-lime bg-lime/10' : 'border-ink/20 hover:border-ink/40'
            }`}
            onClick={() => setPaymentMethod('COD')}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold">Cash on Delivery (COD)</span>
              {paymentMethod === 'COD' && <span className="text-lime" aria-hidden>●</span>}
            </div>
            <p className="mt-1 text-xs text-ink-soft">Pay in cash when your stickers and posters are delivered.</p>
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-danger/10 p-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {!preview ? (
        <button
          type="button"
          className="btn-primary mt-6 w-full"
          onClick={() => void prepare()}
          disabled={working || !selected || (standard.length === 0 && customLinesInCart.length === 0) || !phone.trim()}
        >
          {working ? 'Checking database…' : 'Review Server Prices & Availability'}
        </button>
      ) : (
        <div className="mt-6 rounded-xl border-2 border-ink/20 p-5">
          <h3 className="text-xl font-bold">Server-side Price & Fee Breakdown</h3>
          <div className="mt-3 divide-y divide-ink/10">
            {preview.items.map((item) => {
              const unit = Number(item.product.variants.find((v) => v.id === item.variantId)?.price ?? item.product.price);
              const cartLine = standard.find(
                (l) => l.product.id === item.productId && (l.variant?.id ?? undefined) === (item.variantId ?? undefined)
              );
              const imgUrl = cartLine?.product.images?.[0]?.src;
              return (
                <div key={item.productId} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="flex items-center gap-3">
                    {imgUrl ? (
                      <img src={imgUrl} alt={item.product.name} className="h-10 w-10 rounded-md object-cover border border-ink/10" />
                    ) : (
                      <div className="h-10 w-10 rounded-md bg-ink/5 border border-ink/10" />
                    )}
                    <span>
                      {item.product.name}
                      {item.variantId ? ' · ' + (item.product.variants.find((v) => v.id === item.variantId)?.label ?? item.variantId) : ''} × {item.quantity}
                    </span>
                  </div>
                  <strong>₹{(unit * item.quantity).toFixed(2)}</strong>
                </div>
              );
            })}
            {customLinesInCart.map((item) => {
              let thumb: string | null = null;
              if (item.type === 'custom-sticker') {
                thumb = item.sticker.image.source === 'upload' ? item.sticker.image.objectUrl : item.sticker.image.url;
              } else if (item.type === 'custom-wall') {
                const userSlot = item.wall.slots.find((s) => s.fill.source === 'upload' || s.fill.source === 'url');
                if (userSlot?.fill.source === 'upload') {
                  thumb = userSlot.fill.objectUrl;
                } else if (userSlot?.fill.source === 'url') {
                  thumb = userSlot.fill.url;
                }
              }
              return (
                <div key={item.key} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="flex items-center gap-3">
                    {thumb ? (
                      <img src={thumb} alt="Custom artwork preview" className="h-10 w-10 rounded-md object-cover border border-ink/10" />
                    ) : (
                      <div className="h-10 w-10 rounded-md bg-ink/5 border border-ink/10" />
                    )}
                    <span>
                      {item.type === 'custom-sticker' && `${item.sticker.label} × ${item.quantity}`}
                      {item.type === 'custom-pack' && `Custom Pack (${item.pack.size} stickers, ${item.pack.finishId}) × ${item.quantity}`}
                      {item.type === 'custom-wall' && `Custom Wall (${item.wall.layoutName}) × ${item.quantity}`}
                    </span>
                  </div>
                  <strong>₹{item.lineTotal.toFixed(2)}</strong>
                </div>
              );
            })}
          </div>

          <div className="mt-4 space-y-1.5 border-t border-ink/15 pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-soft">Subtotal</span>
              <span>₹{subtotalEstimate.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Delivery Fee</span>
              <span>
                {paymentConfig?.deliveryFee ? `₹${Number(paymentConfig.deliveryFee).toFixed(2)}` : 'Not configured'}
              </span>
            </div>
            <div className="flex justify-between border-t border-ink/10 pt-2 text-base font-extrabold">
              <span>Total</span>
              <span className="text-lime">₹{totalEstimate.toFixed(2)}</span>
            </div>
          </div>

          {paymentConfig?.deliveryFee === null && (
            <p className="mt-3 rounded-lg bg-danger/10 p-2 text-xs text-danger font-medium">
              Delivery fee is not configured on the backend. Please contact support.
            </p>
          )}

          {subtotalEstimate < 99 && (
            <p className="mt-3 rounded-lg bg-tomato/15 border border-tomato/30 p-2.5 text-xs text-tomato font-bold">
              Minimum cart subtotal is ₹99. Please add ₹{(99 - subtotalEstimate).toFixed(2)} more to your cart to place an order.
            </p>
          )}

          <button
            type="button"
            className="btn-primary mt-5 w-full"
            onClick={() => void place()}
            disabled={working || !selected || paymentConfig?.deliveryFee === null || !phone.trim() || subtotalEstimate < 99}
          >
            {working
              ? 'Placing order…'
              : subtotalEstimate < 99
                ? `Minimum order of ₹99 required (Add ₹${(99 - subtotalEstimate).toFixed(2)} more)`
                : `Place Order with ${paymentMethod} (₹${totalEstimate.toFixed(2)})`}
          </button>
          <button type="button" className="btn-ghost mt-2 w-full" onClick={() => setPreview(null)}>
            Change Cart or Address
          </button>
        </div>
      )}
    </section>
  );
}
