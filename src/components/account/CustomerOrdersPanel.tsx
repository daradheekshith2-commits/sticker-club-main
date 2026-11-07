import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react';
import { LuCamera, LuCheck, LuStar, LuTrash2, LuX } from 'react-icons/lu';
import { useAuth, apiUrl } from '../../context/AuthContext';
import { useCatalogue } from '../../context/CatalogueContext';
import { addReview } from '../../services/reviews';
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
  receiptUrl?: string | null;
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
  events?: Array<{ id: string; kind: string; detail?: any; createdAt: string }>;
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
  const { user, request, requestMultipart, token } = useAuth();
  const { getProductById } = useCatalogue();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // UTR & receipt upload state mapped by orderId
  const [utrInputs, setUtrInputs] = useState<Record<string, string>>({});
  const [receiptFiles, setReceiptFiles] = useState<Record<string, File>>({});
  const [receiptPreviews, setReceiptPreviews] = useState<Record<string, string>>({});
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

  // Customer order review state
  const [openReviewOrderId, setOpenReviewOrderId] = useState<string | null>(null);
  const [reviewedOrders, setReviewedOrders] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('pixwora_reviewed_orders');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewNote, setReviewNote] = useState<string>('');
  const [reviewName, setReviewName] = useState<string>('');
  const [reviewCity, setReviewCity] = useState<string>('');
  const [reviewPhoto, setReviewPhoto] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  function handlePhotoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setReviewPhoto(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmitReview(orderId: string) {
    if (!reviewNote.trim()) return;
    setSubmittingReview(true);
    try {
      await addReview({
        name: reviewName.trim() || 'Verified Customer',
        city: reviewCity.trim() || undefined,
        rating: reviewRating,
        note: reviewNote.trim(),
        photoUrl: reviewPhoto.trim() || undefined,
        tag: 'Verified Order',
      });
      const updated = { ...reviewedOrders, [orderId]: true };
      setReviewedOrders(updated);
      try {
        localStorage.setItem('pixwora_reviewed_orders', JSON.stringify(updated));
      } catch {}
      setOpenReviewOrderId(null);
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setSubmittingReview(false);
    }
  }

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

  function handleReceiptChange(orderId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!file.type || !allowed.includes(file.type.toLowerCase())) {
      setFeedback((prev) => ({ ...prev, [orderId]: { error: 'Please choose a PNG, JPEG, or WebP image.' } }));
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setFeedback((prev) => ({ ...prev, [orderId]: { error: 'Receipt image must be under 15MB.' } }));
      return;
    }
    setReceiptFiles((prev) => ({ ...prev, [orderId]: file }));
    setReceiptPreviews((prev) => ({ ...prev, [orderId]: URL.createObjectURL(file) }));
    setFeedback((prev) => ({ ...prev, [orderId]: {} }));
  }

  async function handleReceiptUpload(orderId: string, event: FormEvent) {
    event.preventDefault();
    const file = receiptFiles[orderId];
    const utr = utrInputs[orderId]?.trim();
    if (!file && !utr) {
      setFeedback((prev) => ({ ...prev, [orderId]: { error: 'Please choose a payment receipt screenshot or photo.' } }));
      return;
    }

    setSubmittingId(orderId);
    setFeedback((prev) => ({ ...prev, [orderId]: {} }));

    try {
      if (file) {
        const formData = new FormData();
        formData.append('receipt', file);
        if (utr) formData.append('utr', utr);
        const res = await requestMultipart<{ orderId: string; payment: Payment }>(
          `/api/orders/${orderId}/payment/receipt`,
          formData
        );
        setFeedback((prev) => ({
          ...prev,
          [orderId]: { success: 'Receipt uploaded! Payment is under review by administrator.' },
        }));
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, payment: { ...o.payment, ...res.payment } } : o))
        );
      } else {
        const res = await request<{ orderId: string; payment: Payment }>(`/api/orders/${orderId}/payment/utr`, {
          method: 'POST',
          body: JSON.stringify({ utr }),
        });
        setFeedback((prev) => ({
          ...prev,
          [orderId]: { success: 'Payment details submitted! Payment is under review.' },
        }));
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, payment: { ...o.payment, ...res.payment } } : o))
        );
      }
      setUtrInputs((prev) => ({ ...prev, [orderId]: '' }));
    } catch (e) {
      setFeedback((prev) => ({
        ...prev,
        [orderId]: { error: e instanceof Error ? e.message : 'Could not submit payment receipt' },
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
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...res, status: 'CANCELLED', cancelReason: res?.cancelReason || 'Cancelled by customer' } : o))
      );
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
                        Your payment receipt has been submitted and is being reviewed by the admin.
                      </p>
                      {o.payment.receiptUrl ? (
                        <div className="mt-2.5 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setModalImgFailed(false);
                              setEnlargedImage({
                                url: o.payment!.receiptUrl!,
                                title: `Uploaded Payment Receipt — Order #${o.id}`,
                                subtitle: `Total: ₹${o.total}`,
                              });
                            }}
                            className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-mint/30 bg-black/40 shadow transition hover:scale-105"
                            title="Click to view full receipt"
                          >
                            <img
                              src={o.payment.receiptUrl}
                              alt="Submitted payment receipt"
                              className="size-full object-cover"
                            />
                            <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100">
                              🔍
                            </span>
                          </button>
                          <div className="text-xs space-y-0.5">
                            <span className="font-bold text-mint">Receipt uploaded</span>
                            <p className="text-ink-soft">
                              {o.payment.utr ? `Ref ID: ${o.payment.utr}` : 'Screenshot attached'}
                            </p>
                            <a
                              href={o.payment.receiptUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block text-mint font-semibold hover:underline"
                            >
                              Open in new tab ↗
                            </a>
                          </div>
                        </div>
                      ) : o.payment.utr ? (
                        <p className="mt-1 text-xs text-ink-soft">
                          Submitted Transaction ID: <span className="font-mono font-bold text-ink select-all">{o.payment.utr}</span>
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div>
                      {o.payment?.status === 'REJECTED' && (
                        <div className="mb-3 rounded-lg bg-danger/15 p-2.5 text-xs text-danger">
                          <strong>Previous Payment Receipt was rejected:</strong> {o.payment.rejectionReason}
                          <br />
                          Please check your payment app and upload the correct payment receipt screenshot below.
                        </div>
                      )}
                      <strong>Complete your UPI payment:</strong>
                      <div className="mt-1.5 rounded-md border border-ink/10 bg-white/80 p-2.5 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-ink-soft">Payee Name:</span>
                          <span className="font-mono font-bold text-ink">KOMMULA SRUJAN REDDY</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-soft">UPI ID:</span>
                          <span className="font-mono font-bold text-ink select-all">7981793020@kotakbank</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-soft">Amount:</span>
                          <span className="font-bold text-emerald-600">₹{o.total}</span>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-ink-soft">
                        Transfer ₹{o.total} and upload your payment receipt screenshot below.
                      </p>

                      {feedback[o.id]?.success && (
                        <p className="mt-2 text-xs text-mint font-bold">{feedback[o.id]?.success}</p>
                      )}
                      {feedback[o.id]?.error && (
                        <p className="mt-2 text-xs text-danger font-bold">{feedback[o.id]?.error}</p>
                      )}

                      {showUtrForm && (
                        <form className="mt-3 space-y-2.5" onSubmit={(e) => handleReceiptUpload(o.id, e)}>
                          <input
                            type="file"
                            id={`receipt-input-${o.id}`}
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleReceiptChange(o.id, e)}
                          />

                          {!receiptPreviews[o.id] ? (
                            <label
                              htmlFor={`receipt-input-${o.id}`}
                              className="flex items-center justify-between gap-3 rounded-xl border-2 border-dashed border-mint/30 bg-paper/60 px-3.5 py-2.5 cursor-pointer hover:border-mint hover:bg-paper transition"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-lg">📸</span>
                                <div className="text-left">
                                  <p className="text-xs font-bold text-ink">Choose Receipt Screenshot</p>
                                  <p className="text-[10px] text-ink-soft">Access Photos, Gallery, Files, Camera</p>
                                </div>
                              </div>
                              <span className="rounded-lg bg-white border border-ink/15 px-2.5 py-1 text-xs font-semibold text-mint">
                                Browse
                              </span>
                            </label>
                          ) : (
                            <div className="flex items-center gap-2.5 rounded-xl border border-mint/40 bg-paper/70 p-2">
                              <img
                                src={receiptPreviews[o.id]}
                                alt="Receipt preview"
                                className="size-12 rounded-lg object-cover border border-mint/30"
                              />
                              <div className="min-w-0 flex-1 text-left">
                                <p className="truncate text-xs font-bold text-ink">
                                  {receiptFiles[o.id]?.name || 'receipt.png'}
                                </p>
                                <label
                                  htmlFor={`receipt-input-${o.id}`}
                                  className="cursor-pointer text-[11px] font-bold text-mint hover:underline"
                                >
                                  Change photo
                                </label>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="UPI Ref No. (optional)"
                              className="field-input flex-1 text-xs"
                              value={utrInputs[o.id] ?? ''}
                              onChange={(e) => setUtrInputs((prev) => ({ ...prev, [o.id]: e.target.value }))}
                            />
                            <button
                              type="submit"
                              className="btn-primary text-xs"
                              disabled={submittingId === o.id || (!receiptFiles[o.id] && !(utrInputs[o.id] ?? '').trim())}
                            >
                              {submittingId === o.id ? 'Uploading…' : 'Upload Receipt'}
                            </button>
                          </div>
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
                            {(i.metadata?.secretNote || (i as any).secretNote) && (
                              <div className="mt-1 rounded-md border border-mint/40 bg-mint/10 p-1.5 text-[11px]">
                                <span className="font-bold text-mint flex items-center gap-1">
                                  <span>✉</span> Wax-Sealed Secret Message:
                                </span>
                                <p className="mt-0.5 italic text-ink font-semibold">
                                  "{i.metadata?.secretNote || (i as any).secretNote}"
                                </p>
                              </div>
                            )}
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

              {(o.status === 'PENDING' || o.status === 'CONFIRMED' || o.status === 'PROCESSING') && (
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

              {/* Customer Review Section when Order is Finished / Completed */}
              {(o.status === 'COMPLETED' || o.status === 'SHIPPED') && (
                <div className="mt-4 border-t border-ink/10 pt-3">
                  {reviewedOrders[o.id] ? (
                    <div className="flex items-center justify-between rounded-xl bg-mint/10 border border-mint/30 p-3 text-xs text-ink">
                      <div className="flex items-center gap-2">
                        <div className="grid size-6 place-items-center rounded-full bg-mint text-ink font-bold">
                          <LuCheck className="size-3.5" />
                        </div>
                        <div>
                          <p className="font-bold text-mint">Thank you for reviewing this order!</p>
                          <p className="text-[11px] text-ink-soft">Your review has been added to our Community Reviews wall.</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-mint bg-ink px-2 py-0.5 rounded">Reviewed ★★★★★</span>
                    </div>
                  ) : openReviewOrderId === o.id ? (
                    <div className="rounded-xl border border-mint/40 bg-paper p-4 shadow-md">
                      <div className="flex items-center justify-between border-b border-ink/10 pb-2">
                        <span className="text-xs font-bold text-ink flex items-center gap-1.5 uppercase tracking-wider">
                          <LuStar className="size-4 fill-amber-400 text-amber-400" /> Rate &amp; Review Your Order
                        </span>
                        <button
                          type="button"
                          onClick={() => setOpenReviewOrderId(null)}
                          className="text-ink-soft hover:text-ink text-sm p-1"
                        >
                          <LuX className="size-4" />
                        </button>
                      </div>

                      <div className="mt-3 space-y-3">
                        {/* Rating stars */}
                        <div>
                          <label className="block text-[11px] font-bold text-ink-soft mb-1">
                            Your Rating:
                          </label>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setReviewRating(star)}
                                className="p-0.5 transition-transform hover:scale-125 focus:outline-none"
                                title={`${star} Star${star > 1 ? 's' : ''}`}
                              >
                                <LuStar
                                  className={`size-6 ${
                                    star <= reviewRating
                                      ? 'fill-amber-400 text-amber-400 drop-shadow'
                                      : 'text-ink-soft/30 hover:text-amber-300'
                                  }`}
                                />
                              </button>
                            ))}
                            <span className="ml-2 text-xs font-bold text-ink">
                              {reviewRating} of 5 Stars
                            </span>
                          </div>
                        </div>

                        {/* Review text */}
                        <div>
                          <label className="block text-[11px] font-bold text-ink-soft mb-1">
                            Review / Feedback:
                          </label>
                          <textarea
                            rows={3}
                            value={reviewNote}
                            onChange={(e) => setReviewNote(e.target.value)}
                            placeholder="How did you like the sticker quality, prints and packaging? Tell us your thoughts..."
                            className="w-full rounded-xl border border-ink/20 bg-white p-2.5 text-xs text-ink placeholder:text-ink-soft/60 focus:border-mint focus:outline-none focus:ring-1 focus:ring-mint"
                          />
                        </div>

                        {/* Name and City */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-bold text-ink-soft mb-1">
                              Your Name:
                            </label>
                            <input
                              type="text"
                              value={reviewName}
                              onChange={(e) => setReviewName(e.target.value)}
                              placeholder="e.g. Srujan Reddy"
                              className="w-full rounded-lg border border-ink/20 bg-white px-2.5 py-1.5 text-xs text-ink focus:border-mint focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-ink-soft mb-1">
                              City / Campus (Optional):
                            </label>
                            <input
                              type="text"
                              value={reviewCity}
                              onChange={(e) => setReviewCity(e.target.value)}
                              placeholder="e.g. Hyderabad"
                              className="w-full rounded-lg border border-ink/20 bg-white px-2.5 py-1.5 text-xs text-ink focus:border-mint focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Optional photo */}
                        <div>
                          <label className="block text-[11px] font-bold text-ink-soft mb-1">
                            Add a photo of your stickers in use (Optional):
                          </label>
                          <div className="flex items-center gap-3">
                            <label className="btn-secondary cursor-pointer text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold">
                              <LuCamera className="size-3.5" />
                              <span>{reviewPhoto ? 'Change Photo' : 'Upload Setup Photo'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                className="sr-only"
                              />
                            </label>
                            {reviewPhoto && (
                              <div className="relative size-10 overflow-hidden rounded-md border border-ink/20">
                                <img src={reviewPhoto} alt="Review attachment preview" className="size-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => setReviewPhoto('')}
                                  className="absolute top-0 right-0 bg-black/70 text-white p-0.5 rounded-bl hover:bg-black"
                                >
                                  <LuTrash2 className="size-2.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-ink/10">
                          <button
                            type="button"
                            onClick={() => setOpenReviewOrderId(null)}
                            className="btn-ghost text-xs py-1.5 px-3"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={!reviewNote.trim() || submittingReview}
                            onClick={() => void handleSubmitReview(o.id)}
                            className="btn-primary text-xs py-1.5 px-4 font-bold disabled:opacity-50"
                          >
                            {submittingReview ? 'Submitting…' : 'Submit Review'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl p-3 ${
                      o.events?.some((e) => e.kind === 'REVIEW_PINGED')
                        ? 'border-2 border-sun/60 bg-sun/10 shadow-[0_0_15px_rgba(255,212,71,0.15)]'
                        : 'border border-mint/30 bg-mint/5'
                    }`}>
                      <div className="flex items-center gap-2">
                        <div className={`grid size-6 place-items-center rounded-full ${
                          o.events?.some((e) => e.kind === 'REVIEW_PINGED') ? 'bg-sun/30 text-sun' : 'bg-mint/20 text-mint'
                        }`}>
                          <LuStar className="size-3.5 fill-current" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-ink">
                            {o.events?.some((e) => e.kind === 'REVIEW_PINGED')
                              ? '⭐ Pixwora team requested your review for this order!'
                              : 'Order Finished · How was your experience?'}
                          </p>
                          <p className="text-[11px] text-ink-soft">
                            {o.events?.some((e) => e.kind === 'REVIEW_PINGED')
                              ? 'We’d love to see how your stickers look! Tap to leave your feedback.'
                              : 'Leave a review and photo to be featured in our community.'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenReviewOrderId(o.id);
                          setReviewRating(5);
                          setReviewNote('');
                          setReviewName(o.shippingAddress?.recipient || user?.name || '');
                          setReviewCity(o.shippingAddress?.city || '');
                          setReviewPhoto('');
                        }}
                        className={`text-xs py-1.5 px-3.5 font-bold flex items-center gap-1.5 shadow-sm rounded-full ${
                          o.events?.some((e) => e.kind === 'REVIEW_PINGED')
                            ? 'bg-sun text-paper hover:bg-sun/90'
                            : 'btn-primary'
                        }`}
                      >
                        <LuStar className="size-3.5 fill-current" /> Write a Review
                      </button>
                    </div>
                  )}
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
