import { useEffect, useState, type FormEvent } from 'react';
import { useAuth, apiUrl } from '../../context/AuthContext';
import { useCatalogue } from '../../context/CatalogueContext';
import { ProductImage } from '../art/ProductArt';

type OrderItem = {
  id: string;
  productId?: string | null;
  nameSnapshot: string;
  quantity: number;
  unitPrice: string;
  variantLabel?: string | null;
  imageUrl?: string | null;
  metadata?: any;
};

type Payment = {
  id: string;
  status: 'AWAITING' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED' | 'COLLECTED';
  method: 'UPI' | 'COD';
  amount: string;
  utr?: string | null;
  rejectionReason?: string | null;
  submittedAt?: string | null;
};

type CustomArtwork = {
  id: string;
  originalName: string;
  mimeType: string;
  fileName?: string;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
};

type CustomOrder = {
  id: string;
  artworkId?: string | null;
  previewUrl?: string | null;
  productionNotes?: string | null;
  config: any;
  artwork?: CustomArtwork | null;
  artworks?: Array<{
    id: string;
    slotId?: string | null;
    role?: string | null;
    artwork?: CustomArtwork | null;
  }>;
};

type Order = {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  paymentMethod: 'UPI' | 'COD';
  subtotal: string;
  deliveryFee: string;
  total: string;
  createdAt: string;
  shippingAddress?: {
    recipient?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    notes?: string;
  } | null;
  items: OrderItem[];
  customOrders?: CustomOrder[];
  payment?: Payment | null;
  cancelReason?: string | null;
};

const STAGES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'COMPLETED'] as const;
const STAGE_LABELS: Record<string, string> = {
  PENDING: 'Placed',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const PHYSICAL_SIZES: Record<string, string> = {
  small: '5 × 5 cm (2" × 2")',
  medium: '7.5 × 7.5 cm (3" × 3")',
  large: '10 × 10 cm (4" × 4")',
};

const WALL_LAYOUT_NAMES: Record<string, string> = {
  compact: 'Compact Wall (5 prints)',
  classic: 'Classic Wall (8 prints)',
  studio: 'Studio Wall (10 prints)',
  large: 'Large Wall (15 prints)',
};

export function CustomerOrdersPanel() {
  const { user, request, token } = useAuth();
  const { getProductById } = useCatalogue();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // UTR submission state mapped by orderId
  const [utrInputs, setUtrInputs] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, { success?: string; error?: string }>>({});

  // Enlarged preview modal state
  const [enlargedImage, setEnlargedImage] = useState<{
    url?: string;
    product?: any;
    title: string;
    subtitle?: string;
    downloadUrl?: string;
    downloadName?: string;
  } | null>(null);
  const [modalImgFailed, setModalImgFailed] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  function resolveArtworkUrl(rawUrlOrId?: string | null, isDownload = false, fileName?: string | null): string {
    if (!rawUrlOrId && !fileName) return '';
    if (rawUrlOrId?.startsWith('http')) return rawUrlOrId;
    if (fileName) {
      return `https://iarclkcnxpbbxxpfwamd.supabase.co/storage/v1/object/public/artworks/${fileName}`;
    }
    if (rawUrlOrId && !rawUrlOrId.startsWith('/api')) {
      if (apiUrl) {
        let url = `${apiUrl}/api/uploads/artwork/${rawUrlOrId}/${isDownload ? 'download' : 'file'}`;
        if (token && !url.includes('token=')) {
          url += (url.includes('?') ? '&' : '?') + `token=${encodeURIComponent(token)}`;
        }
        return url;
      }
      return `https://iarclkcnxpbbxxpfwamd.supabase.co/storage/v1/object/public/artworks/${rawUrlOrId}`;
    }
    let url = rawUrlOrId || '';
    if (token && !url.includes('token=')) {
      url += (url.includes('?') ? '&' : '?') + `token=${encodeURIComponent(token)}`;
    }
    return url;
  }

  function resolveProductImageUrl(url?: string | null): string | undefined {
    if (!url) return undefined;
    let resolved = url;
    if (resolved.startsWith('/') && apiUrl && !resolved.startsWith('http')) {
      resolved = `${apiUrl}${resolved}`;
    }
    if (resolved.includes('/api/uploads/artwork') && token && !resolved.includes('token=')) {
      return `${resolved}${resolved.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
    }
    return resolved;
  }

  function loadOrders() {
    if (!user) return;
    setLoading(true);
    request<Order[]>('/api/me/orders')
      .then(setOrders)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadOrders();
  }, [user?.id]);

  async function handleUtrSubmit(orderId: string, event: FormEvent) {
    event.preventDefault();
    const utr = utrInputs[orderId]?.trim();
    if (!utr) return;

    setSubmittingId(orderId);
    setFeedback((prev) => ({ ...prev, [orderId]: {} }));

    try {
      const res = await request<{ orderId: string; payment: Payment }>(`/api/orders/${orderId}/payment/utr`, {
        method: 'POST',
        body: JSON.stringify({ utr }),
      });
      setFeedback((prev) => ({
        ...prev,
        [orderId]: { success: 'UTR submitted! Payment is under review by administrator.' },
      }));
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, payment: { ...o.payment, ...res.payment } } : o))
      );
      setUtrInputs((prev) => ({ ...prev, [orderId]: '' }));
    } catch (e) {
      setFeedback((prev) => ({
        ...prev,
        [orderId]: { error: e instanceof Error ? e.message : 'Could not submit UTR' },
      }));
    } finally {
      setSubmittingId(null);
    }
  }

  async function handleCancelOrder(orderId: string) {
    if (!window.confirm('Are you sure you want to cancel this order? Any reserved stock will be returned.')) return;
    setSubmittingId(orderId);
    try {
      const res = await request<Order>(`/api/me/orders/${orderId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Cancelled by customer' }),
      });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...res } : o)));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not cancel order');
    } finally {
      setSubmittingId(null);
    }
  }

  if (!user) return null;

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-ink/15 pb-4">
        <div>
          <h2 className="text-2xl font-bold">My Orders</h2>
          <p className="mt-1 text-xs text-ink-soft">Track fulfillment, inspect custom artwork, and view purchase history.</p>
        </div>
        <button
          type="button"
          className="text-xs font-semibold text-ink-soft hover:text-ink underline"
          onClick={loadOrders}
        >
          Refresh
        </button>
      </div>

      {loading && <p className="mt-4 text-sm text-ink-soft animate-pulse">Loading your orders…</p>}
      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-danger/10 p-3 text-sm text-danger font-medium">
          {error}
        </p>
      )}
      {!loading && !error && !orders.length && (
        <p className="mt-6 text-center py-8 text-sm text-ink-soft">You have no placed orders yet.</p>
      )}

      <ul className="mt-5 space-y-6">
        {orders.map((o) => {
          const isUpi = o.paymentMethod === 'UPI';
          const isPaid = o.paymentStatus === 'PAID';
          const isCancelled = o.status === 'CANCELLED';
          const currentStageIndex = STAGES.indexOf(o.status as (typeof STAGES)[number]);
          const showUtrForm = isUpi && !isPaid && !isCancelled && o.payment?.status !== 'SUBMITTED';

          return (
            <li className="rounded-xl border border-ink/15 p-5 shadow-sm transition hover:border-ink/30" key={o.id}>
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/10 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base text-ink select-all">Order #{o.id}</span>
                    {/* Payment status badge */}
                    {isPaid ? (
                      <span className="rounded-full bg-mint/20 px-2.5 py-0.5 text-xs font-bold text-mint">
                        {isUpi ? 'Paid' : 'Cash Collected'}
                      </span>
                    ) : o.payment?.status === 'SUBMITTED' ? (
                      <span className="rounded-full bg-sun/20 px-2.5 py-0.5 text-xs font-bold text-sun">
                        Payment Under Review
                      </span>
                    ) : o.payment?.status === 'REJECTED' ? (
                      <span className="rounded-full bg-danger/20 px-2.5 py-0.5 text-xs font-bold text-danger">
                        Payment Rejected
                      </span>
                    ) : isUpi ? (
                      <span className="rounded-full bg-bubble/20 px-2.5 py-0.5 text-xs font-bold text-bubble">
                        Awaiting Payment
                      </span>
                    ) : (
                      <span className="rounded-full bg-sky/20 px-2.5 py-0.5 text-xs font-bold text-sky">
                        Cash on Delivery
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">{new Date(o.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-lime">₹{o.total}</span>
                  <p className="text-xs text-ink-soft">Subtotal: ₹{o.subtotal} + Delivery: ₹{o.deliveryFee}</p>
                </div>
              </div>

              {/* Order Timeline */}
              <div className="mt-4 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Order Timeline</span>
                {isCancelled ? (
                  <div className="mt-2 rounded-lg bg-danger/10 p-3 text-sm text-danger">
                    <strong>Order Cancelled</strong>
                    {o.cancelReason && <p className="mt-0.5 text-xs text-ink-soft">Reason: {o.cancelReason}</p>}
                  </div>
                ) : (
                  <div className="mt-2 flex items-center justify-between">
                    {STAGES.map((stage, idx) => {
                      const isComplete = idx <= currentStageIndex;
                      const isCurrent = idx === currentStageIndex;
                      return (
                        <div key={stage} className="flex flex-1 flex-col items-center">
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                              isComplete
                                ? 'bg-mint text-paper'
                                : 'border border-ink/20 bg-paper-deep text-ink-soft'
                            } ${isCurrent ? 'ring-2 ring-lime ring-offset-2 ring-offset-paper' : ''}`}
                          >
                            {idx + 1}
                          </div>
                          <span
                            className={`mt-1.5 text-[11px] font-medium ${
                              isComplete ? 'text-ink font-bold' : 'text-ink-soft'
                            }`}
                          >
                            {STAGE_LABELS[stage]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Transaction ID Submission / Status Block for UPI */}
              {isUpi && !isPaid && !isCancelled && (
                <div className="mt-4 rounded-lg border border-sun/30 bg-sun/5 p-4 text-sm">
                  {o.payment?.status === 'SUBMITTED' ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full bg-sun animate-pulse" />
                        <strong className="text-sun">Payment Verification in Progress</strong>
                      </div>
                      <p className="mt-1 text-xs text-ink-soft">
                        Submitted Transaction ID: <span className="font-mono font-bold text-ink select-all">{o.payment.utr}</span>. An admin is
                        reviewing your payment.
                      </p>
                    </div>
                  ) : (
                    <div>
                      {o.payment?.status === 'REJECTED' && (
                        <div className="mb-3 rounded-lg bg-danger/15 p-2.5 text-xs text-danger">
                          <strong>Previous Transaction ID was rejected:</strong> {o.payment.rejectionReason}
                          <br />
                          Please check your payment app and submit the correct Transaction ID / Ref No. below.
                        </div>
                      )}
                      <strong>Complete your UPI payment:</strong>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        Transfer ₹{o.total} and submit your Transaction ID / Ref No. below.
                      </p>

                      {feedback[o.id]?.success && (
                        <p className="mt-2 text-xs text-mint font-bold">{feedback[o.id]?.success}</p>
                      )}
                      {feedback[o.id]?.error && (
                        <p className="mt-2 text-xs text-danger font-bold">{feedback[o.id]?.error}</p>
                      )}

                      {showUtrForm && (
                        <form className="mt-3 flex gap-2" onSubmit={(e) => handleUtrSubmit(o.id, e)}>
                          <input
                            type="text"
                            required
                            placeholder="e.g. UPI Transaction ID / Ref No."
                            className="field-input flex-1 text-xs"
                            value={utrInputs[o.id] ?? ''}
                            onChange={(e) => setUtrInputs((prev) => ({ ...prev, [o.id]: e.target.value }))}
                          />
                          <button
                            type="submit"
                            className="btn-primary text-xs"
                            disabled={submittingId === o.id || !(utrInputs[o.id] ?? '').trim()}
                          >
                            {submittingId === o.id ? 'Submitting…' : 'Submit Transaction ID'}
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Purchased Items Section with Images */}
              <div className="mt-4 rounded-xl border border-ink/10 bg-paper/30 p-3.5">
                <span className="font-bold text-xs uppercase tracking-wider text-ink-soft">
                  Purchased Items ({o.items.length})
                </span>
                <div className="mt-2 space-y-2.5">
                  {o.items.map((i) => {
                    const product = i.productId ? getProductById(i.productId) : undefined;
                    const productImg = product?.images?.[0]?.src;
                    const rawImg = i.imageUrl ? resolveProductImageUrl(i.imageUrl) : productImg;
                    const resolvedImg = rawImg && !brokenImages[i.id] ? rawImg : undefined;
                    return (
                      <div key={i.id} className="flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setModalImgFailed(false);
                              setEnlargedImage({
                                url: rawImg,
                                product,
                                title: i.nameSnapshot,
                                subtitle: `${i.variantLabel ? i.variantLabel + ' · ' : ''}₹${i.unitPrice} each`,
                              });
                            }}
                            className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-ink/15 bg-white transition hover:scale-105 flex items-center justify-center"
                          >
                            {resolvedImg ? (
                              <img
                                src={resolvedImg}
                                alt={i.nameSnapshot}
                                className="h-full w-full object-cover"
                                loading="lazy"
                                onError={() => setBrokenImages((prev) => ({ ...prev, [i.id]: true }))}
                              />
                            ) : product ? (
                              <ProductImage product={product} className="size-full" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-paper-deep text-[10px] font-bold text-ink uppercase">
                                {i.nameSnapshot.slice(0, 2)}
                              </div>
                            )}
                          </button>
                          <div>
                            <p className="font-bold text-ink">{i.nameSnapshot}</p>
                            <p className="text-[11px] text-ink-soft">
                              {i.variantLabel ? i.variantLabel + ' · ' : ''}Qty: {i.quantity} × ₹{i.unitPrice}
                            </p>
                          </div>
                        </div>
                        <strong className="text-ink">₹{(Number(i.unitPrice) * i.quantity).toFixed(2)}</strong>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Items & Artwork Previews */}
              {o.customOrders && o.customOrders.length > 0 && (
                <div className="mt-3 rounded-xl border border-lime/20 bg-paper/40 p-3.5">
                  <span className="font-bold text-xs uppercase tracking-wider text-lime">
                    Custom Designs & Artwork ({o.customOrders.length})
                  </span>
                  <div className="mt-2 space-y-3">
                    {o.customOrders.map((co) => {
                      const config = co.config || {};
                      const isSticker = config.type === 'custom-sticker';
                      const isWall = config.type === 'custom-wall';
                      const isPack = config.type === 'custom-pack';

                      const physicalDim = isSticker ? PHYSICAL_SIZES[config.sizeId] || config.sizeId : null;
                      const artworkPreview =
                        co.previewUrl ||
                        (co.artworkId
                          ? resolveArtworkUrl(co.artworkId, false, co.artwork?.fileName)
                          : null);
                      const artworkDownload =
                        co.previewUrl ||
                        (co.artworkId
                          ? resolveArtworkUrl(co.artworkId, true, co.artwork?.fileName)
                          : null);

                      return (
                        <div
                          key={co.id}
                          className="rounded-lg border border-ink/10 bg-white p-3 text-xs"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              {artworkPreview && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEnlargedImage({
                                      url: artworkPreview,
                                      title: 'Custom Artwork Preview',
                                      subtitle: co.artwork?.originalName || 'artwork.png',
                                      downloadUrl: artworkDownload || undefined,
                                      downloadName: co.artwork?.originalName || 'artwork',
                                    })
                                  }
                                  className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-ink/15 bg-paper transition hover:scale-105"
                                >
                                  <img
                                    src={artworkPreview}
                                    alt="Custom item preview"
                                    className="h-full w-full object-contain"
                                    loading="lazy"
                                  />
                                </button>
                              )}
                              <div>
                                <strong className="text-ink font-bold">
                                  {isSticker && `Custom Sticker · ${config.sizeId} · ${config.finishId}`}
                                  {isPack && `Custom Pack · ${config.size} stickers`}
                                  {isWall && `Custom Wall · ${WALL_LAYOUT_NAMES[config.layoutId] || config.layoutId}`}
                                </strong>
                                {isSticker && physicalDim && (
                                  <p className="text-ink-soft">Dimensions: {physicalDim} · Shape: {config.shape}</p>
                                )}
                                {isWall && (
                                  <p className="text-ink-soft">{config.slots?.length || 0} framed prints configured</p>
                                )}
                                {isPack && (
                                  <p className="text-ink-soft">{config.designIds?.length || 0} designs chosen · 1 surprise sticker</p>
                                )}
                              </div>
                            </div>

                            {artworkDownload && (
                              <a
                                href={artworkDownload}
                                download={co.artwork?.originalName || 'artwork'}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-ghost text-xs text-lime border border-lime/30 px-2 py-1 font-bold"
                              >
                                ⬇ Download Artwork
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {o.status === 'PENDING' && (
                <div className="mt-3 border-t border-ink/10 pt-2 text-right">
                  <button
                    type="button"
                    className="text-xs text-danger hover:underline font-semibold"
                    disabled={submittingId === o.id}
                    onClick={() => void handleCancelOrder(o.id)}
                  >
                    {submittingId === o.id ? 'Cancelling…' : 'Cancel Order'}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Enlarged Image Preview Modal */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setEnlargedImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-xl w-full rounded-2xl border border-ink/20 bg-paper p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-ink/10 pb-3">
              <div>
                <h3 className="text-lg font-bold text-ink">{enlargedImage.title}</h3>
                {enlargedImage.subtitle && (
                  <p className="mt-0.5 text-xs text-ink-soft">{enlargedImage.subtitle}</p>
                )}
              </div>
              <button
                type="button"
                className="rounded-lg p-1 text-ink-soft hover:bg-white hover:text-ink text-base"
                onClick={() => setEnlargedImage(null)}
              >
                ✕
              </button>
            </div>

            <div className="my-4 flex items-center justify-center rounded-xl bg-black/40 p-3">
              {enlargedImage.url && !modalImgFailed ? (
                <img
                  src={enlargedImage.url}
                  alt={enlargedImage.title}
                  className="max-h-[60vh] max-w-full rounded object-contain"
                  onError={() => setModalImgFailed(true)}
                />
              ) : enlargedImage.product ? (
                <div className="h-64 w-64 max-h-[60vh] max-w-full overflow-hidden rounded-xl shadow-lg">
                  <ProductImage product={enlargedImage.product} className="size-full" />
                </div>
              ) : (
                <div className="flex h-48 w-48 items-center justify-center rounded-xl bg-paper-deep text-ink font-bold text-2xl uppercase">
                  {enlargedImage.title.slice(0, 2)}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {enlargedImage.downloadUrl && (
                <a
                  href={enlargedImage.downloadUrl}
                  download={enlargedImage.downloadName || 'artwork'}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary text-xs"
                >
                  ⬇ Download File
                </a>
              )}
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => setEnlargedImage(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
