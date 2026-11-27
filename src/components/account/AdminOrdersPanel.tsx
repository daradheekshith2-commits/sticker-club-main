import { useEffect, useState } from 'react';
import JSZip from 'jszip';
import { LuTrash2, LuStar } from 'react-icons/lu';
import { useAuth, apiUrl } from '../../context/AuthContext';
import { useCatalogue } from '../../context/CatalogueContext';
import { ProductImage } from '../art/ProductArt';

type Status = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';

type Payment = {
  id: string;
  orderId: string;
  status: 'AWAITING' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED' | 'COLLECTED';
  method: 'UPI' | 'COD';
  amount: string;
  utr?: string | null;
  receiptUrl?: string | null;
  submittedAt?: string | null;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
  order?: {
    id: string;
    total: string;
    user: { name: string; email: string; phone?: string | null };
  };
};

type OrderEvent = {
  id: string;
  kind: string;
  actorId?: string | null;
  detail?: any;
  createdAt: string;
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

export type OrderNote = {
  id: string;
  text: string;
  author: string;
  createdAt: string;
};

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

type Order = {
  id: string;
  status: Status;
  paymentStatus: string;
  paymentMethod: 'UPI' | 'COD';
  fulfilmentMethod?: string;
  subtotal: string;
  deliveryFee: string;
  total: string;
  createdAt: string;
  shippingAddress?: {
    recipient?: string;
    phone?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    notes?: string;
  } | null;
  items: OrderItem[];
  customOrders?: CustomOrder[];
  user: { id?: string; name: string; email: string; phone?: string | null };
  payment?: Payment | null;
  events?: OrderEvent[];
  cancelReason?: string | null;
};

const NEXT_STATUS: Record<Status, Status[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
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

export function AdminOrdersPanel() {
  const { user, request, token } = useAuth();
  const { getProductById } = useCatalogue();
  const [tab, setTab] = useState<'orders' | 'payments'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');

  // Rejection dialog state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionNotice, setActionNotice] = useState<{ id: string; text: string; isError?: boolean } | null>(null);

  // Dedicated Order Notes state
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [localNotesMap, setLocalNotesMap] = useState<Record<string, OrderNote[]>>(() => {
    try {
      const stored = localStorage.getItem('pixwora_admin_order_notes_all');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Detailed Modal or Enlarged Image View state
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

  // Expanded detailed order state
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  function resolveArtworkUrl(rawUrlOrId?: string | null, isDownload = false, fileName?: string | null): string {
    const SUPABASE_STORAGE_PUBLIC_BASE = 'https://iarclkcnxpbbxxpfwamd.supabase.co/storage/v1/object/public/artworks';

    // 1. If fileName is known, Supabase public URL is the permanent, authoritative source
    if (fileName && fileName.trim()) {
      const cleanFileName = fileName.trim().replace(/^\/+/, '');
      return `${SUPABASE_STORAGE_PUBLIC_BASE}/${cleanFileName}`;
    }

    if (!rawUrlOrId || typeof rawUrlOrId !== 'string') return '';
    const trimmed = rawUrlOrId.trim();
    if (!trimmed) return '';

    // 2. If it's a Supabase signed URL (/storage/v1/object/sign/artworks/...), convert to public URL and drop token
    if (trimmed.includes('/storage/v1/object/sign/artworks/')) {
      const pathPart = trimmed.split('/storage/v1/object/sign/artworks/')[1]?.split('?')[0];
      if (pathPart) {
        return `${SUPABASE_STORAGE_PUBLIC_BASE}/${pathPart.replace(/^\/+/, '')}`;
      }
    }

    // 3. If it's already a Supabase public artworks URL, strip query params
    if (trimmed.includes('/storage/v1/object/public/artworks/')) {
      return trimmed.split('?')[0];
    }

    // 4. If it's a relative API upload path
    if (trimmed.startsWith('/api/uploads/artwork/')) {
      const artworkId = trimmed.replace('/api/uploads/artwork/', '').split('/')[0];
      if (apiUrl && !apiUrl.includes('localhost')) {
        let url = `${apiUrl}/api/uploads/artwork/${artworkId}/${isDownload ? 'download' : 'file'}`;
        if (token && !url.includes('token=')) {
          url += (url.includes('?') ? '&' : '?') + `token=${encodeURIComponent(token)}`;
        }
        return url;
      }
      return '';
    }

    // 5. If it contains a folder path (e.g. userId/123-filename.jpg)
    if (trimmed.includes('/') && !trimmed.startsWith('blob:')) {
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed.split('?')[0];
      }
      return `${SUPABASE_STORAGE_PUBLIC_BASE}/${trimmed.replace(/^\/+/, '')}`;
    }

    // 6. If it's an external full URL
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed.split('?')[0];
    }

    // 7. If it's a blob: URL (temporary session only)
    if (trimmed.startsWith('blob:')) {
      return trimmed;
    }

    // 8. Bare UUID or legacy ID without path (only route to API if real backend is configured)
    if (apiUrl && !apiUrl.includes('localhost')) {
      let url = `${apiUrl}/api/uploads/artwork/${trimmed}/${isDownload ? 'download' : 'file'}`;
      if (token && !url.includes('token=')) {
        url += (url.includes('?') ? '&' : '?') + `token=${encodeURIComponent(token)}`;
      }
      return url;
    }

    // Do NOT return `${SUPABASE_STORAGE_PUBLIC_BASE}/${bareUUID}` as it causes 404
    return '';
  }

  function resolveProductImageUrl(url?: string | null): string | undefined {
    if (!url || typeof url !== 'string') return undefined;
    const SUPABASE_STORAGE_PUBLIC_BASE = 'https://iarclkcnxpbbxxpfwamd.supabase.co/storage/v1/object/public/artworks';
    let resolved = url.trim();
    if (!resolved) return undefined;

    if (resolved.includes('/storage/v1/object/sign/artworks/')) {
      const pathPart = resolved.split('/storage/v1/object/sign/artworks/')[1]?.split('?')[0];
      if (pathPart) return `${SUPABASE_STORAGE_PUBLIC_BASE}/${pathPart.replace(/^\/+/, '')}`;
    }
    if (resolved.includes('/storage/v1/object/public/artworks/')) {
      return resolved.split('?')[0];
    }
    // Static assets in /public (/PNG/, /Stickers/, /Poster/, etc.) should never be prefixed with localhost apiUrl
    if (resolved.startsWith('/') && !resolved.startsWith('/api/')) {
      return resolved;
    }
    if (resolved.startsWith('/api/uploads/') && apiUrl && !apiUrl.includes('localhost')) {
      resolved = `${apiUrl}${resolved}`;
    }
    if (resolved.includes('/api/uploads/artwork') && token && !resolved.includes('token=')) {
      return `${resolved}${resolved.includes('?') ? '&' : '?'}` + `token=${encodeURIComponent(token)}`;
    }
    return resolved;
  }

  async function loadOrders() {
    const data = await request<Order[]>('/api/admin/orders');
    setOrders(data);
  }

  async function loadPayments() {
    const data = await request<Payment[]>('/api/admin/payments?status=SUBMITTED');
    setPendingPayments(data);
  }

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    setLoading(true);
    Promise.all([loadOrders(), loadPayments()])
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [user?.id]);

  async function updateStatus(id: string, status: Status) {
    if (!window.confirm(`Change order ${id} to ${status}?`)) return;
    setBusy(id);
    setError('');
    setMessage('');
    setActionNotice(null);
    try {
      await request('/api/admin/orders/' + encodeURIComponent(id), {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadOrders();
      const msg = `Order ${id} status updated to ${status}.`;
      setMessage(msg);
      setActionNotice({ id, text: `✓ Updated to ${status}` });
    } catch (e) {
      const err = e instanceof Error ? e.message : 'Unable to update status';
      setError(err);
      setActionNotice({ id, text: `✕ ${err}`, isError: true });
    } finally {
      setBusy(null);
    }
  }

  async function verifyPayment(paymentId: string) {
    if (!window.confirm('Confirm that funds have been received in your bank account?')) return;
    setBusy(paymentId);
    setError('');
    setMessage('');
    try {
      await request('/api/admin/payments/' + encodeURIComponent(paymentId) + '/verify', {
        method: 'POST',
      });
      setMessage('Payment verified successfully. Order confirmed and Passport stamp awarded if eligible.');
      await Promise.all([loadOrders(), loadPayments()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to verify payment');
    } finally {
      setBusy(null);
    }
  }

  async function handleRejectPayment(paymentId: string) {
    if (!rejectReason.trim()) return;
    setBusy(paymentId);
    setError('');
    setMessage('');
    try {
      await request('/api/admin/payments/' + encodeURIComponent(paymentId) + '/reject', {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      setMessage('Payment rejected. Customer has been prompted to re-enter their UTR.');
      setRejectingId(null);
      setRejectReason('');
      await Promise.all([loadOrders(), loadPayments()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reject payment');
    } finally {
      setBusy(null);
    }
  }

  async function collectCod(orderId: string) {
    if (!window.confirm(`Confirm collection of cash payment for order ${orderId}?`)) return;
    setBusy(orderId);
    setError('');
    setMessage('');
    setActionNotice(null);
    try {
      await request('/api/admin/orders/' + encodeURIComponent(orderId) + '/cod-collected', {
        method: 'POST',
      });
      const msg = `Cash on Delivery marked collected for order ${orderId}. Passport stamp awarded if eligible.`;
      setMessage(msg);
      setActionNotice({ id: orderId, text: '✓ COD Collected & Order Completed' });
      await loadOrders();
    } catch (e) {
      const err = e instanceof Error ? e.message : 'Failed to mark COD collected';
      setError(err);
      setActionNotice({ id: orderId, text: `✕ ${err}`, isError: true });
    } finally {
      setBusy(null);
    }
  }

  async function handlePingReview(order: Order) {
    const customerName = order.shippingAddress?.recipient || order.user?.name || 'Customer';
    const rawPhone = order.shippingAddress?.phone || order.user?.phone || '';
    const cleanDigits = rawPhone.replace(/\D/g, '').replace(/^0+/, '');
    const waPhone = cleanDigits.length === 10 ? '91' + cleanDigits : cleanDigits;

    const message = `Hi ${customerName}! 👋 Thank you for ordering from Pixwora (Order #${order.id})! 🌟\n\nWe hope you're loving your stickers & posters. Could you please take 30 seconds to share your review and photos with our community?\n\n👉 Share your review here: https://www.pixwora.store/reviews\n\nOr feel free to reply right here with your photos and feedback! ✨`;

    setBusy(order.id);
    try {
      await request(`/api/admin/orders/${encodeURIComponent(order.id)}/ping-review`, {
        method: 'POST',
        body: JSON.stringify({ method: waPhone ? 'WHATSAPP' : 'DIRECT' }),
      });
      setActionNotice({ id: order.id, text: '✓ Review Ping Sent' });
      await loadOrders();
    } catch (e) {
      console.warn('Could not record review ping event:', e);
    } finally {
      setBusy(null);
    }

    if (waPhone && waPhone.length >= 10) {
      const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    } else {
      try {
        await navigator.clipboard.writeText(message);
        alert(`No phone number found for order #${order.id}.\n\nReview invitation message has been copied to your clipboard so you can send it via email or message!`);
      } catch {
        alert(`Review message:\n\n${message}`);
      }
    }
  }

  async function handleDeleteOrder(orderId: string) {
    if (!window.confirm(`⚠️ Permanently DELETE order ${orderId}?\n\nThis will remove the order, its items, payment submissions, and custom artwork permanently. This action CANNOT be undone.`)) {
      return;
    }
    setBusy(orderId);
    setError('');
    setMessage('');
    setActionNotice(null);
    try {
      await request('/api/admin/orders/' + encodeURIComponent(orderId), {
        method: 'DELETE',
      });
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      setMessage(`Order ${orderId} was permanently deleted.`);
      setActionNotice({ id: orderId, text: '✓ Deleted' });
      await loadOrders();
    } catch (e) {
      const err = e instanceof Error ? e.message : 'Failed to delete order';
      setError(err);
      setActionNotice({ id: orderId, text: `✕ ${err}`, isError: true });
      alert(`Could not delete order ${orderId}:\n\n${err}`);
    } finally {
      setBusy(null);
    }
  }

  function getOrderNotes(order: Order): OrderNote[] {
    const fromEvents: OrderNote[] = (order.events || [])
      .filter((e) => e.kind === 'ADMIN_NOTE' && (e.detail?.text || e.detail?.note))
      .map((e) => ({
        id: e.id,
        text: String(e.detail?.text || e.detail?.note || ''),
        author: String(e.detail?.author || 'Admin'),
        createdAt: String(e.detail?.createdAt || e.createdAt),
      }));

    const fromShipping: OrderNote[] = Array.isArray((order.shippingAddress as any)?.adminNotes)
      ? (order.shippingAddress as any).adminNotes
      : (order.shippingAddress as any)?.adminNote
      ? [{ id: `legacy-${order.id}`, text: (order.shippingAddress as any).adminNote, author: 'Admin', createdAt: order.createdAt }]
      : [];

    const fromLocal: OrderNote[] = localNotesMap[order.id] || [];

    const seen = new Set<string>();
    const all: OrderNote[] = [];

    for (const n of [...fromLocal, ...fromEvents, ...fromShipping]) {
      const key = n.id || `${n.text}_${n.createdAt}`;
      if (!seen.has(key) && n.text?.trim()) {
        seen.add(key);
        all.push(n);
      }
    }

    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async function handleSaveNote(orderId: string) {
    const text = (notesDraft[orderId] || '').trim();
    if (!text) return;

    setSavingNoteId(orderId);
    const noteId = `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newNote: OrderNote = {
      id: noteId,
      text,
      author: user?.name || user?.email || 'Admin',
      createdAt: new Date().toISOString(),
    };

    // 1. Update local cache immediately
    const updatedForOrder = [newNote, ...(localNotesMap[orderId] || [])];
    const newAll = { ...localNotesMap, [orderId]: updatedForOrder };
    setLocalNotesMap(newAll);
    try {
      localStorage.setItem('pixwora_admin_order_notes_all', JSON.stringify(newAll));
    } catch {}

    // 2. Clear draft
    setNotesDraft((prev) => ({ ...prev, [orderId]: '' }));

    // 3. Optimistically update order.events in state
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const newEv: OrderEvent = {
          id: noteId,
          kind: 'ADMIN_NOTE',
          actorId: user?.id,
          detail: { text, author: newNote.author, createdAt: newNote.createdAt },
          createdAt: newNote.createdAt,
        };
        return {
          ...o,
          events: [...(o.events || []), newEv],
        };
      })
    );

    // 4. Send to backend/supabase
    try {
      await request(`/api/admin/orders/${encodeURIComponent(orderId)}/notes`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      setActionNotice({ id: orderId, text: '✓ Note Saved' });
    } catch (err) {
      console.warn('Note saved locally, remote sync notice:', err);
      setActionNotice({ id: orderId, text: '✓ Note Saved (Local)' });
    } finally {
      setSavingNoteId(null);
    }
  }

  async function handleDeleteNote(orderId: string, noteId: string) {
    if (!window.confirm('Are you sure you want to delete this note?')) return;

    // 1. Remove from local cache
    const updated = (localNotesMap[orderId] || []).filter((n) => n.id !== noteId);
    const newAll = { ...localNotesMap, [orderId]: updated };
    setLocalNotesMap(newAll);
    try {
      localStorage.setItem('pixwora_admin_order_notes_all', JSON.stringify(newAll));
    } catch {}

    // 2. Remove from order.events in state
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          events: (o.events || []).filter((e) => e.id !== noteId),
        };
      })
    );

    // 3. Delete remotely
    try {
      await request(`/api/admin/orders/${encodeURIComponent(orderId)}/notes/${encodeURIComponent(noteId)}`, {
        method: 'DELETE',
      });
      setActionNotice({ id: orderId, text: '✓ Note Removed' });
    } catch (e) {
      console.warn('Note deleted locally, remote sync notice:', e);
    }
  }

  const [zippingId, setZippingId] = useState<string | null>(null);

  async function handleDownloadOrderZip(order: Order) {
    try {
      setZippingId(order.id);
      const zip = new JSZip();

      // 1. Order Summary Text
      const manifest = `=====================================================
PIXWORA ORDER SUMMARY - #${order.id}
Exported At: ${new Date().toLocaleString('en-IN')}
=====================================================

ORDER STATUS & SUMMARY:
Order ID: ${order.id}
Created At: ${new Date(order.createdAt).toLocaleString('en-IN')}
Current Status: ${order.status}
Payment Method: ${order.paymentMethod}
Payment Status: ${order.paymentStatus}
Total Amount: ₹${order.total} (Subtotal: ₹${order.subtotal} + Delivery Fee: ₹${order.deliveryFee})
UPI Payee: KOMMULA SRUJAN REDDY
UPI Transaction ID (UTR): ${order.payment?.utr || 'N/A'}
Submitted At: ${order.payment?.submittedAt ? new Date(order.payment.submittedAt).toLocaleString('en-IN') : 'N/A'}
Verified At: ${order.payment?.verifiedAt ? new Date(order.payment.verifiedAt).toLocaleString('en-IN') : 'N/A'}

CUSTOMER & CONTACT:
Customer Name: ${order.shippingAddress?.recipient || order.user?.name || 'Customer'}
Customer Email: ${order.user?.email || 'N/A'}
Phone Number: ${order.shippingAddress?.phone || order.user?.phone || 'N/A'}

SHIPPING ADDRESS:
Recipient: ${order.shippingAddress?.recipient || order.user?.name || 'N/A'}
Phone: ${order.shippingAddress?.phone || order.user?.phone || 'N/A'}
Address Line 1: ${order.shippingAddress?.line1 || 'N/A'}
Address Line 2: ${order.shippingAddress?.line2 || ''}
City: ${order.shippingAddress?.city || 'N/A'}
State: ${order.shippingAddress?.state || 'N/A'}
Postal Code: ${order.shippingAddress?.postalCode || 'N/A'}
Order Delivery Notes: ${order.shippingAddress?.notes || 'None'}

ITEMS TO PRINT & PACK (${order.items.length}):
-----------------------------------------------------
${order.items.map((it, idx) => {
  const p = it.productId ? getProductById(it.productId) : undefined;
  const size = it.variantLabel || 'Standard 5cm × 5cm (approx 2" × 2")';
  const note = it.metadata?.secretNote || (it as any).secretNote;
  return `[Item #${idx + 1}] ${it.nameSnapshot || p?.name || 'Print Item'} (Qty: ${it.quantity})
  Type: ${p?.productType || 'Sticker'}
  Dimensions / Specs: ${size}
  ${note ? `*** CUSTOM SECRET MESSAGE TO SEAL INSIDE ENVELOPE ***: "${note}"\n` : ''}  Unit Price: ₹${it.unitPrice} | Total: ₹${Number(it.unitPrice) * it.quantity}
  Item ID: ${it.id}
  Product Code: ${it.productId || 'CUSTOM'}
`;
}).join('\n')}

${order.customOrders && order.customOrders.length > 0 ? `
CUSTOM UPLOADED ARTWORKS (${order.customOrders.length}):
-----------------------------------------------------
${order.customOrders.map((co, idx) => {
  const cfg = co.config || {};
  const fileName = co.artwork?.originalName || co.artwork?.fileName || 'custom-artwork.png';
  return `[Custom #${idx + 1}] Custom Upload (ID: ${co.id})
  Dimensions: ${cfg.dimensions || cfg.size || 'Custom'}
  Material: ${cfg.material || 'Waterproof Vinyl'}
  Finish: ${cfg.finish || 'Matte'}
  Cut Type: ${cfg.cutType || 'Die-cut'}
  File: ${fileName}
`;
}).join('\n')}
` : ''}
=====================================================
PIXWORA Print Operations System
`;
      zip.file(`ORDER_${order.id.slice(0, 8)}_DETAILS.txt`, manifest);

      // 1.1 If any secret messages exist, generate a dedicated print card slip file
      const secretItems = order.items.filter((it) => it.metadata?.secretNote || (it as any).secretNote);
      if (secretItems.length > 0) {
        const secretSlip = `=====================================================
PIXWORA SECRET MESSAGE CARDS TO PRINT & WAX-SEAL
Order ID: #${order.id}
Customer: ${order.shippingAddress?.recipient || order.user?.name || 'Customer'}
Phone: ${order.shippingAddress?.phone || order.user?.phone || 'N/A'}
=====================================================

${secretItems.map((it, idx) => `
[CARD #${idx + 1}]
Item: ${it.nameSnapshot}
Quantity: ${it.quantity}
-----------------------------------------------------
SECRET MESSAGE TEXT:
"${it.metadata?.secretNote || (it as any).secretNote}"
-----------------------------------------------------
Instruction: Print on kraft/linen insert card and seal with wax seal into envelope.
`).join('\n\n')}
`;
        zip.file('SECRET_MESSAGES_TO_SEAL.txt', secretSlip);
      }

      // 2. Fetch custom order artworks
      if (order.customOrders && order.customOrders.length > 0) {
        const customFolder = zip.folder('custom-artworks');
        for (let i = 0; i < order.customOrders.length; i++) {
          const co = order.customOrders[i];
          const fileName = co.artwork?.fileName;
          const url = resolveArtworkUrl(co.previewUrl || co.artwork?.fileName || co.artwork?.id || co.artworkId, true, fileName);
          if (url) {
            try {
              const res = await fetch(url);
              if (res.ok) {
                const blob = await res.blob();
                const ext = fileName?.split('.').pop() || 'png';
                const safeTitle = (co.artwork?.originalName || `custom-artwork-${i + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
                customFolder?.file(`${safeTitle}.${ext}`, blob);
              }
            } catch (err) {
              console.warn('Could not bundle artwork:', url, err);
            }
          }
        }
      }

      // 3. Fetch standard item artworks if available
      const itemsFolder = zip.folder('item-artworks');
      for (let i = 0; i < order.items.length; i++) {
        const it = order.items[i];
        const p = it.productId ? getProductById(it.productId) : undefined;
        const imgUrl = it.imageUrl ? resolveProductImageUrl(it.imageUrl) : (p?.images?.[0]?.src ? resolveProductImageUrl(p.images[0].src) : undefined);
        if (imgUrl) {
          try {
            const res = await fetch(imgUrl);
            if (res.ok) {
              const blob = await res.blob();
              const ext = imgUrl.split('.').pop()?.split('?')[0] || 'png';
              const safeName = (it.nameSnapshot || p?.name || `item-${i + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
              itemsFolder?.file(`${safeName}.${ext}`, blob);
            }
          } catch (err) {
            console.warn('Could not bundle item image:', imgUrl, err);
          }
        }
      }

      // 4. Generate and trigger download
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Pixwora_Order_${order.id.slice(0, 8)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 8000);
      setActionNotice({ id: order.id, text: `✓ Downloaded ZIP package for Order #${order.id}` });
    } catch (e) {
      const err = e instanceof Error ? e.message : 'Failed to generate ZIP package';
      setError(err);
      setActionNotice({ id: order.id, text: `✕ ${err}`, isError: true });
    } finally {
      setZippingId(null);
    }
  }

  if (user?.role !== 'ADMIN') return null;

  const visibleOrders = orders.filter((o) => {
    const phoneStr = o.shippingAddress?.phone || o.user?.phone || '';
    const matchesQuery = (
      o.id +
      ' ' +
      (o.user?.name || '') +
      ' ' +
      (o.user?.email || '') +
      ' ' +
      phoneStr +
      ' ' +
      (o.shippingAddress?.recipient || '')
    )
      .toLowerCase()
      .includes(filter.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const matchesMethod = methodFilter === 'ALL' || o.paymentMethod === methodFilter;
    const matchesPaymentStatus = paymentStatusFilter === 'ALL' || o.paymentStatus === paymentStatusFilter;

    let matchesDate = true;
    if (dateFilter !== 'ALL') {
      const orderDate = new Date(o.createdAt).getTime();
      const now = Date.now();
      if (dateFilter === 'TODAY') matchesDate = now - orderDate <= 24 * 60 * 60 * 1000;
      else if (dateFilter === '7D') matchesDate = now - orderDate <= 7 * 24 * 60 * 60 * 1000;
      else if (dateFilter === '30D') matchesDate = now - orderDate <= 30 * 24 * 60 * 60 * 1000;
    }
    return matchesQuery && matchesStatus && matchesMethod && matchesPaymentStatus && matchesDate;
  });

  return (
    <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 pb-4">
        <div>
          <h2 className="text-2xl font-bold">Order & Payment Management</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Manage customer orders, inspect high-res production artwork, verify UPI payments, and monitor order lifecycles.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex rounded-xl bg-paper p-1">
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
              tab === 'orders' ? 'bg-white text-ink shadow' : 'text-ink-soft hover:text-ink'
            }`}
            onClick={() => setTab('orders')}
          >
            All Orders ({orders.length})
          </button>
          <button
            type="button"
            className={`relative rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
              tab === 'payments' ? 'bg-white text-ink shadow' : 'text-ink-soft hover:text-ink'
            }`}
            onClick={() => setTab('payments')}
          >
            Payments Queue
            {pendingPayments.length > 0 && (
              <span className="ml-2 rounded-full bg-sun px-2 py-0.5 text-xs text-paper font-black">
                {pendingPayments.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-danger/10 p-3 text-sm text-danger font-medium">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-3 rounded-lg bg-mint/15 p-3 text-sm text-mint font-medium">
          {message}
        </p>
      )}

      {/* PAYMENTS QUEUE TAB */}
      {tab === 'payments' && (
        <div className="mt-5">
          <h3 className="text-lg font-bold">Pending UPI Payments Verification</h3>
          <p className="mt-0.5 text-xs text-ink-soft">
            Customer-submitted Transaction ID references awaiting verification against your UPI/bank transaction records.
          </p>

          {loading ? (
            <p className="mt-4 text-sm text-ink-soft animate-pulse" role="status">
              Loading pending payments queue…
            </p>
          ) : !pendingPayments.length ? (
            <p className="mt-6 text-center text-sm text-ink-soft py-8">
              No pending UPI payments to review. All submitted payments are up to date!
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {pendingPayments.map((p) => (
                <li key={p.id} className="rounded-xl border border-sun/30 bg-sun/5 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">Order #{p.orderId}</span>
                        <span className="rounded-full bg-sun/20 px-2 py-0.5 text-xs font-bold text-sun">
                          Transaction ID Submitted
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-ink-soft">
                        Customer: <strong className="text-ink">{p.order?.user?.name}</strong> ({p.order?.user?.email}
                        {p.order?.user?.phone ? ` · 📞 ${p.order.user.phone}` : ''})
                      </p>
                      {p.utr && (
                        <p className="mt-1 text-sm">
                          Submitted Transaction ID:{' '}
                          <span className="rounded bg-paper px-2 py-1 font-mono text-sm font-bold text-ink select-all">
                            {p.utr}
                          </span>
                        </p>
                      )}
                      {p.receiptUrl && (
                        <div className="mt-3 flex items-center gap-3 rounded-xl border border-mint/25 bg-paper/60 p-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setModalImgFailed(false);
                              setEnlargedImage({
                                url: p.receiptUrl!,
                                title: `UPI Payment Receipt — Order #${p.orderId}`,
                                subtitle: `Customer: ${p.order?.user?.name || 'Customer'} · Amount: ₹${p.amount}`,
                              });
                            }}
                            className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 border-mint/40 bg-black/40 shadow transition hover:scale-105"
                            title="Click to view/enlarge receipt screenshot"
                          >
                            <img
                              src={p.receiptUrl}
                              alt={`Payment receipt for Order #${p.orderId}`}
                              className="size-full object-cover"
                            />
                            <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100">
                              🔍 Zoom
                            </span>
                          </button>
                          <div className="text-xs space-y-1">
                            <span className="font-bold text-mint uppercase tracking-wider text-[10px] flex items-center gap-1">
                              <span>📸</span> Uploaded UPI Payment Receipt
                            </span>
                            <p className="text-ink-soft">
                              Inspect payee, amount ₹{p.amount}, timestamp, and ref number from customer's screenshot.
                            </p>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setModalImgFailed(false);
                                  setEnlargedImage({
                                    url: p.receiptUrl!,
                                    title: `UPI Payment Receipt — Order #${p.orderId}`,
                                    subtitle: `Customer: ${p.order?.user?.name || 'Customer'} · Amount: ₹${p.amount}`,
                                  });
                                }}
                                className="font-bold text-mint hover:underline"
                              >
                                View full screen
                              </button>
                              <span>·</span>
                              <a
                                href={p.receiptUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="font-bold text-ink-soft hover:underline"
                              >
                                Open in new tab ↗
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                      {p.submittedAt && (
                        <p className="mt-1 text-xs text-ink-soft">
                          Submitted on {new Date(p.submittedAt).toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-extrabold text-lime">₹{p.amount}</span>
                      <p className="text-xs text-ink-soft">Payable via UPI</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-3">
                    <button
                      type="button"
                      className="btn-primary text-xs"
                      disabled={busy === p.id}
                      onClick={() => void verifyPayment(p.id)}
                    >
                      {busy === p.id ? 'Verifying…' : '✓ Verify & Mark Paid'}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost text-xs text-danger hover:border-danger"
                      disabled={busy === p.id}
                      onClick={() => {
                        setRejectingId(p.id);
                        setRejectReason('');
                      }}
                    >
                      ✗ Reject Transaction ID
                    </button>
                  </div>

                  {/* Inline Rejection Reason Modal/Form */}
                  {rejectingId === p.id && (
                    <div className="mt-3 rounded-lg border border-danger/30 bg-paper p-3 text-sm">
                      <p className="text-xs font-bold text-danger">Specify Rejection Reason (shown to customer):</p>
                      <input
                        type="text"
                        required
                        placeholder="e.g. UTR not found on bank statement, wrong amount"
                        className="field-input mt-1.5 w-full text-xs"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          className="btn-primary text-xs bg-danger text-white hover:bg-danger/80"
                          disabled={busy === p.id || !rejectReason.trim()}
                          onClick={() => void handleRejectPayment(p.id)}
                        >
                          Confirm Rejection
                        </button>
                        <button
                          type="button"
                          className="btn-ghost text-xs"
                          onClick={() => setRejectingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ALL ORDERS TAB */}
      {tab === 'orders' && (
        <div className="mt-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-xs font-bold">
              Search Orders
              <input
                className="field-input mt-1 text-xs"
                type="search"
                placeholder="ID, customer, email, or address"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </label>
            <label className="block text-xs font-bold">
              Order Status
              <select
                className="field-input mt-1 text-xs"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PROCESSING">Processing</option>
                <option value="SHIPPED">Shipped</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </label>
            <label className="block text-xs font-bold">
              Payment Method & Status
              <div className="mt-1 flex gap-1">
                <select
                  className="field-input text-xs flex-1"
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                >
                  <option value="ALL">All Methods</option>
                  <option value="UPI">UPI</option>
                  <option value="COD">COD</option>
                </select>
                <select
                  className="field-input text-xs flex-1"
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Pay Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="PAID">Paid</option>
                </select>
              </div>
            </label>
            <label className="block text-xs font-bold">
              Time Period
              <select
                className="field-input mt-1 text-xs"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="ALL">All Time</option>
                <option value="TODAY">Last 24 Hours</option>
                <option value="7D">Last 7 Days</option>
                <option value="30D">Last 30 Days</option>
              </select>
            </label>
          </div>

          {loading && (
            <p className="mt-4 text-sm text-ink-soft animate-pulse" role="status">
              Loading orders from database…
            </p>
          )}

          {!loading && !visibleOrders.length && (
            <p className="mt-4 text-sm text-ink-soft">No matching database orders.</p>
          )}

          <ul className="mt-4 max-h-[50rem] space-y-4 overflow-auto">
            {visibleOrders.map((order) => {
              const isUpi = order.paymentMethod === 'UPI';
              const isCod = order.paymentMethod === 'COD';
              const isPaid = order.paymentStatus === 'PAID';
              const isExpanded = expandedOrderId === order.id;
              const orderPhone = order.shippingAddress?.phone || order.user?.phone;
              const customerName = order.shippingAddress?.recipient || order.user?.name || 'Customer';
              const customerEmail = order.user?.email || 'No email';

              return (
                <li key={order.id} className="rounded-xl border border-ink/15 p-4 shadow-sm transition-all hover:border-ink/30">
                  {/* Order header row */}
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-ink/10 pb-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-base text-ink select-all">Order #{order.id}</strong>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            isPaid
                              ? 'bg-mint/20 text-mint'
                              : isCod
                              ? 'bg-sky/20 text-sky'
                              : 'bg-bubble/20 text-bubble'
                          }`}
                        >
                          {order.paymentMethod} · {order.paymentStatus}
                        </span>
                        <span className="rounded-full bg-paper px-2 py-0.5 text-xs font-bold text-ink">
                          {order.status}
                        </span>
                        {order.events?.some((e) => e.kind === 'REVIEW_PINGED') && (
                          <span className="rounded-full bg-sun/15 border border-sun/30 px-2 py-0.5 text-[11px] font-bold text-sun inline-flex items-center gap-1" title="Customer has been pinged for a review">
                            <LuStar className="size-3 fill-sun text-sun" />
                            <span>Review Pinged</span>
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
                        <strong className="text-ink">{customerName}</strong>
                        <span>({customerEmail})</span>
                        {orderPhone ? (
                          <a
                            href={`tel:${orderPhone}`}
                            className="inline-flex items-center gap-1 rounded-md bg-paper px-2 py-0.5 text-xs font-semibold text-ink hover:text-lime hover:underline transition"
                            title="Call customer phone"
                          >
                            <span>📞</span>
                            <span>{orderPhone}</span>
                          </a>
                        ) : (
                          <span className="text-xs text-ink-soft/70 italic">· No phone</span>
                        )}
                        <span>·</span>
                        <span>{new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-lg font-extrabold text-lime">₹{order.total}</span>
                        <p className="text-xs text-ink-soft">
                          Subtotal: ₹{order.subtotal} + Delivery: ₹{order.deliveryFee}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={zippingId === order.id}
                        className="btn-accent text-xs px-3 py-1 font-bold inline-flex items-center gap-1.5 shadow-sm"
                        onClick={() => void handleDownloadOrderZip(order)}
                        title="Download order summary & all artworks in a ZIP package"
                      >
                        {zippingId === order.id ? (
                          <>
                            <span className="inline-block size-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            <span>Creating ZIP…</span>
                          </>
                        ) : (
                          <>
                            <span>📦</span>
                            <span>Download ZIP</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn-ghost text-xs border border-ink/15 px-2.5 py-1"
                        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                      >
                        {isExpanded ? 'Hide Details' : 'View Full Details'}
                      </button>
                    </div>
                  </div>

                  {/* Compact thumbnails preview in list */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-ink-soft">Purchased Artwork:</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {(() => {
                        const matchedCustomIds = new Set<string>();

                        const itemThumbnails = order.items.map((i) => {
                          const isCustom = !i.productId ||
                            i.metadata?.type?.startsWith('custom') ||
                            i.nameSnapshot.toLowerCase().includes('custom');

                          // Robust matching to custom order
                          const matchingCustom = order.customOrders?.find((co) =>
                            (i.metadata?.artworkId && co.artworkId === i.metadata.artworkId) ||
                            ((i.metadata as any)?.customOrderId && co.id === (i.metadata as any).customOrderId) ||
                            (co.artwork?.id && i.metadata?.artworkId === co.artwork.id) ||
                            (i.imageUrl && co.previewUrl && (i.imageUrl === co.previewUrl || i.imageUrl.split('?')[0] === co.previewUrl.split('?')[0]))
                          ) || (isCustom ? order.customOrders?.find((co) => !matchedCustomIds.has(co.id)) : undefined);

                          if (matchingCustom) {
                            matchedCustomIds.add(matchingCustom.id);
                          }

                          const product = i.productId ? getProductById(i.productId) : undefined;
                          const productImg = product?.images?.[0]?.src;

                          // Resolve custom artwork URL: prioritize previewUrl or fileName
                          const customArtworkUrl = matchingCustom
                            ? resolveArtworkUrl(matchingCustom.previewUrl || matchingCustom.artworkId, false, matchingCustom.artwork?.fileName)
                            : (i.metadata?.previewUrl ? resolveArtworkUrl(i.metadata.previewUrl) : undefined);

                          const rawImg = i.imageUrl ? resolveProductImageUrl(i.imageUrl) : (customArtworkUrl || (productImg ? resolveProductImageUrl(productImg) : undefined));
                          const imgUrl = (!brokenImages[i.id] && rawImg) || (!brokenImages[`custom_${i.id}`] && customArtworkUrl) || undefined;

                          return (
                            <button
                              key={i.id}
                              type="button"
                              title={`${isCustom ? '[Custom] ' : ''}${i.nameSnapshot} (${i.quantity}x) — Click to enlarge`}
                              onClick={() => {
                                setModalImgFailed(false);
                                setEnlargedImage({
                                  url: imgUrl || rawImg,
                                  product,
                                  title: i.nameSnapshot,
                                  subtitle: `${i.variantLabel ? i.variantLabel + ' · ' : ''}Qty: ${i.quantity} · Unit: ₹${i.unitPrice}`,
                                  downloadUrl: customArtworkUrl || imgUrl || rawImg,
                                  downloadName: matchingCustom?.artwork?.originalName || (isCustom ? `${i.nameSnapshot.replace(/\s+/g, '_')}_artwork` : undefined),
                                });
                              }}
                              className={`group relative h-10 w-10 overflow-hidden rounded-lg border bg-paper transition hover:scale-105 focus:outline-none flex items-center justify-center ${
                                isCustom ? 'border-lime/70 shadow-sm' : 'border-ink/15 hover:border-lime'
                              }`}
                            >
                              {imgUrl ? (
                                <img
                                  src={imgUrl}
                                  alt={i.nameSnapshot}
                                  className="h-full w-full object-cover group-hover:scale-105"
                                  loading="lazy"
                                  crossOrigin="anonymous"
                                  referrerPolicy="no-referrer"
                                  onError={() => setBrokenImages((prev) => ({ ...prev, [i.id]: true }))}
                                />
                              ) : product ? (
                                <ProductImage product={product} className="size-full" />
                              ) : isCustom ? (
                                <div className="flex h-full w-full flex-col items-center justify-center bg-paper-deep text-[9px] font-black text-lime uppercase tracking-tighter">
                                  <span>CUST</span>
                                </div>
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-paper-deep text-[10px] font-bold text-ink uppercase">
                                  {i.nameSnapshot.slice(0, 2)}
                                </div>
                              )}
                              {isCustom && (
                                <span className="absolute top-0 right-0 bg-lime px-1 text-[7px] font-extrabold text-paper uppercase tracking-wider leading-tight rounded-bl">
                                  Custom
                                </span>
                              )}
                              {i.quantity > 1 && (
                                <span className="absolute bottom-0 right-0 rounded-tl bg-paper px-1 text-[9px] font-bold text-ink">
                                  ×{i.quantity}
                                </span>
                              )}
                            </button>
                          );
                        });

                        // Any unlinked custom orders (only if NOT already rendered as an item)
                        const unlinkedCustom = (order.customOrders || [])
                          .filter((co) => !matchedCustomIds.has(co.id))
                          .map((co) => {
                            const stickerArtworkUrl = resolveArtworkUrl(co.previewUrl || co.artworkId, false, co.artwork?.fileName);
                            const hasCustomImg = Boolean(stickerArtworkUrl && !brokenImages[`co_${co.id}`]);
                            return (
                              <button
                                key={co.id}
                                type="button"
                                title="Custom Item Artwork — Click to inspect"
                                onClick={() =>
                                  setEnlargedImage({
                                    url: stickerArtworkUrl,
                                    title: 'Custom Order Design',
                                    subtitle: `Original: ${co.artwork?.originalName || 'artwork'} · ${co.artwork?.width || '—'}×${co.artwork?.height || '—'} px`,
                                    downloadUrl: resolveArtworkUrl(co.previewUrl || co.artworkId, true, co.artwork?.fileName),
                                    downloadName: co.artwork?.originalName || 'artwork-production',
                                  })
                                }
                                className="group relative h-10 w-10 overflow-hidden rounded-lg border-2 border-lime/60 bg-paper transition hover:scale-105 flex items-center justify-center"
                              >
                                {hasCustomImg ? (
                                  <img
                                    src={stickerArtworkUrl}
                                    alt="Custom design"
                                    className="h-full w-full object-contain"
                                    loading="lazy"
                                    crossOrigin="anonymous"
                                    referrerPolicy="no-referrer"
                                    onError={() => setBrokenImages((prev) => ({ ...prev, [`co_${co.id}`]: true }))}
                                  />
                                ) : (
                                  <span className="text-[10px] font-bold text-lime">ART</span>
                                )}
                                <span className="absolute top-0 right-0 bg-lime px-0.5 text-[8px] font-extrabold text-paper uppercase">
                                  Custom
                                </span>
                              </button>
                            );
                          });

                        return [...itemThumbnails, ...unlinkedCustom];
                      })()}
                    </div>
                  </div>

                  {/* Payment Info banner if UTR or reason */}
                  {order.payment && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-3 rounded-lg bg-paper/60 px-3 py-1.5 text-xs text-ink-soft">
                      <span>
                        Payment Method: <strong className="text-ink">{order.payment.method}</strong> ({order.payment.status})
                      </span>
                      {order.payment.utr && (
                        <span>
                          Transaction ID: <strong className="font-mono text-ink select-all">{order.payment.utr}</strong>
                        </span>
                      )}
                      {order.payment.receiptUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setModalImgFailed(false);
                            setEnlargedImage({
                              url: order.payment!.receiptUrl!,
                              title: `UPI Payment Receipt — Order #${order.id}`,
                              subtitle: `Customer: ${customerName} · Total: ₹${order.total}`,
                            });
                          }}
                          className="flex items-center gap-1.5 rounded-md border border-mint/40 bg-mint/15 px-2.5 py-1 text-xs font-bold text-mint hover:bg-mint/25 transition-colors"
                        >
                          <span>📸</span>
                          <span>View Payment Receipt</span>
                        </button>
                      )}
                      {order.payment.rejectionReason && (
                        <span className="text-danger font-medium">Rejection Reason: {order.payment.rejectionReason}</span>
                      )}
                    </div>
                  )}

                  {/* EXPANDED FULL DETAILS VIEW */}
                  {isExpanded && (
                    <div className="mt-4 space-y-4 border-t border-ink/15 pt-4 text-xs">
                      {/* Shipping & Customer Details */}
                      <div className="rounded-xl border border-ink/10 bg-paper/40 p-3.5">
                        <h4 className="font-bold text-ink uppercase tracking-wider text-[11px]">Delivery & Fulfillment</h4>
                        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-ink-soft">Fulfillment Method:</p>
                            <p className="font-semibold text-ink">{order.fulfilmentMethod || 'DELIVERY (Standard Shipping)'}</p>
                            <p className="mt-2 text-ink-soft">Recipient Contact:</p>
                            <p className="font-semibold text-ink">{customerName}</p>
                            <p className="text-ink-soft">{customerEmail}</p>
                            <div className="mt-1.5 flex items-center gap-2">
                              {orderPhone ? (
                                <>
                                  <a
                                    href={`tel:${orderPhone}`}
                                    className="inline-flex items-center gap-1 font-bold text-lime hover:underline text-sm"
                                    title="Call customer"
                                  >
                                    <span>📞</span>
                                    <span>{orderPhone}</span>
                                  </a>
                                  <button
                                    type="button"
                                    className="btn-ghost text-[10px] py-0.5 px-2"
                                    onClick={() => navigator.clipboard.writeText(orderPhone)}
                                  >
                                    Copy
                                  </button>
                                </>
                              ) : (
                                <p className="text-ink-soft italic">No phone recorded</p>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-ink-soft">College / Delivery Address:</p>
                            {order.shippingAddress ? (
                              <p className="font-semibold text-ink leading-relaxed">
                                {order.shippingAddress.line1}
                                {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}
                                <br />
                                {order.shippingAddress.city}, {order.shippingAddress.state} —{' '}
                                <span className="font-mono">{order.shippingAddress.postalCode}</span>
                              </p>
                            ) : (
                              <p className="text-ink-soft italic">No college or delivery address recorded.</p>
                            )}
                            {order.shippingAddress?.notes && (
                              <p className="mt-2 text-xs text-mint">
                                <strong>Customer Notes:</strong> {order.shippingAddress.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Purchased Catalogue Items Table */}
                      <div className="rounded-xl border border-ink/10 bg-paper/40 p-3.5">
                        <h4 className="font-bold text-ink uppercase tracking-wider text-[11px]">
                          Purchased Items ({order.items.length})
                        </h4>
                        <div className="mt-2 overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-ink/10 text-ink-soft text-[10px] uppercase">
                                <th className="pb-2">Product Image</th>
                                <th className="pb-2">Item Name & Variant</th>
                                <th className="pb-2 text-center">Quantity</th>
                                <th className="pb-2 text-right">Unit Price</th>
                                <th className="pb-2 text-right">Line Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-ink/10">
                              {order.items.map((i, iIdx) => {
                                const isCustom = !i.productId ||
                                  i.metadata?.type?.startsWith('custom') ||
                                  i.nameSnapshot.toLowerCase().includes('custom');
                                const product = i.productId ? getProductById(i.productId) : undefined;
                                const productImg = product?.images?.[0]?.src;
                                const matchingCustom = order.customOrders?.find((co) =>
                                  (i.metadata?.artworkId && co.artworkId === i.metadata.artworkId) ||
                                  ((i.metadata as any)?.customOrderId && co.id === (i.metadata as any).customOrderId) ||
                                  (co.artwork?.id && i.metadata?.artworkId === co.artwork.id) ||
                                  (i.imageUrl && co.previewUrl && (i.imageUrl === co.previewUrl || i.imageUrl.split('?')[0] === co.previewUrl.split('?')[0]))
                                ) || (isCustom ? order.customOrders?.[iIdx] : undefined);
                                const customArtworkUrl = matchingCustom ? resolveArtworkUrl(matchingCustom.previewUrl || matchingCustom.artworkId, false, matchingCustom.artwork?.fileName) : undefined;
                                const rawImg = i.imageUrl ? resolveProductImageUrl(i.imageUrl) : (customArtworkUrl || (productImg ? resolveProductImageUrl(productImg) : undefined));
                                const resolvedImg = (!brokenImages[i.id] && rawImg) || (!brokenImages[`custom_${i.id}`] && customArtworkUrl) || undefined;
                                return (
                                  <tr key={i.id} className="hover:bg-paper/70">
                                    <td className="py-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setModalImgFailed(false);
                                          setEnlargedImage({
                                            url: rawImg || customArtworkUrl,
                                            product,
                                            title: i.nameSnapshot,
                                            subtitle: `${i.variantLabel ? i.variantLabel + ' · ' : ''}₹${i.unitPrice} each`,
                                            downloadUrl: customArtworkUrl || rawImg,
                                            downloadName: matchingCustom?.artwork?.originalName || (isCustom ? `${i.nameSnapshot.replace(/\s+/g, '_')}_artwork` : undefined),
                                          });
                                        }}
                                        className={`h-12 w-12 overflow-hidden rounded border bg-paper flex items-center justify-center ${
                                          isCustom ? 'border-lime/60' : 'border-ink/10'
                                        }`}
                                      >
                                        {resolvedImg ? (
                                          <img
                                            src={resolvedImg}
                                            alt={i.nameSnapshot}
                                            className="h-full w-full object-cover"
                                            loading="lazy"
                                            crossOrigin="anonymous"
                                            referrerPolicy="no-referrer"
                                            onError={() => setBrokenImages((prev) => ({ ...prev, [i.id]: true }))}
                                          />
                                        ) : product ? (
                                          <ProductImage product={product} className="size-full" />
                                        ) : isCustom ? (
                                          <div className="flex h-full w-full flex-col items-center justify-center bg-paper-deep text-[9px] font-black text-lime uppercase tracking-tighter">
                                            <span>CUST</span>
                                          </div>
                                        ) : (
                                          <div className="flex h-full w-full items-center justify-center bg-paper-deep text-xs font-bold text-ink uppercase">
                                            {i.nameSnapshot.slice(0, 2)}
                                          </div>
                                        )}
                                      </button>
                                    </td>
                                    <td className="py-2 pr-3">
                                      <p className="font-bold text-ink">{i.nameSnapshot}</p>
                                      {i.variantLabel && (
                                        <span className="text-[11px] text-ink-soft">Variant: {i.variantLabel}</span>
                                      )}
                                      {(i.metadata?.secretNote || (i as any).secretNote) && (
                                        <div className="mt-1.5 rounded-lg border border-amber-600/40 bg-amber-500/10 p-2 text-xs">
                                          <span className="font-bold text-amber-500 flex items-center gap-1">
                                            <span>✉</span> Customer Secret Message to Wax-Seal:
                                          </span>
                                          <p className="mt-0.5 font-semibold text-ink italic select-all">
                                            "{i.metadata?.secretNote || (i as any).secretNote}"
                                          </p>
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-2 text-center font-bold">{i.quantity}</td>
                                    <td className="py-2 text-right text-ink-soft">₹{Number(i.unitPrice).toFixed(2)}</td>
                                    <td className="py-2 text-right font-extrabold text-ink">
                                      ₹{(Number(i.unitPrice) * i.quantity).toFixed(2)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Custom Orders & Production Artwork (Requirement 8) */}
                      {order.customOrders && order.customOrders.length > 0 && (
                        <div className="rounded-xl border border-lime/30 bg-paper/60 p-3.5">
                          <h4 className="font-bold text-lime uppercase tracking-wider text-[11px] flex items-center justify-between">
                            <span>Custom Order Artwork & Production Specifications ({order.customOrders.length})</span>
                            <span className="text-[10px] text-ink-soft lowercase">Confidential production files</span>
                          </h4>

                          <div className="mt-3 space-y-4">
                            {order.customOrders.map((co, idx) => {
                              const config = co.config || {};
                              const isSticker = config.type === 'custom-sticker';
                              const isPack = config.type === 'custom-pack';
                              const isWall = config.type === 'custom-wall';

                              // Sticker specs
                              const physicalDim = isSticker ? PHYSICAL_SIZES[config.sizeId] || config.sizeId : null;
                              const minDpiPixels = config.sizeId === 'large' ? 1200 : config.sizeId === 'medium' ? 900 : 600;
                              const isLowResolution =
                                co.artwork &&
                                co.artwork.width &&
                                co.artwork.height &&
                                (co.artwork.width < minDpiPixels || co.artwork.height < minDpiPixels);

                              const downloadUrl = resolveArtworkUrl(co.previewUrl || co.artworkId, true, co.artwork?.fileName);
                              const artworkPreview = resolveArtworkUrl(co.previewUrl || co.artworkId, false, co.artwork?.fileName);

                              return (
                                <div
                                  key={co.id || idx}
                                  className="rounded-xl border border-ink/15 bg-white p-4 shadow-sm"
                                >
                                  {/* Custom Sticker Layout */}
                                  {isSticker && (
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                      {/* Artwork Thumbnail and Enlarge */}
                                      <div className="flex flex-col items-center justify-center rounded-lg border border-ink/10 bg-paper p-3 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft mb-2">
                                          Approved Production Artwork
                                        </span>
                                        {artworkPreview ? (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setEnlargedImage({
                                                url: artworkPreview,
                                                title: `Custom Sticker Production Artwork`,
                                                subtitle: `${co.artwork?.originalName || 'artwork'} · ${co.artwork?.width || '—'} × ${co.artwork?.height || '—'} px`,
                                                downloadUrl: downloadUrl || undefined,
                                                downloadName: co.artwork?.originalName || 'sticker-artwork',
                                              })
                                            }
                                            className="group relative overflow-hidden rounded-lg border border-ink/20 shadow-sm transition hover:border-lime"
                                          >
                                            <img
                                              src={artworkPreview}
                                              alt="Custom sticker artwork"
                                              className="max-h-36 max-w-full object-contain"
                                              crossOrigin="anonymous"
                                              referrerPolicy="no-referrer"
                                            />
                                            <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition text-[11px] font-bold text-white">
                                              🔍 Click to Enlarge
                                            </span>
                                          </button>
                                        ) : (
                                          <p className="text-xs text-ink-soft">No preview available</p>
                                        )}

                                        {downloadUrl && (
                                          <a
                                            href={downloadUrl}
                                            download={co.artwork?.originalName || 'sticker-artwork'}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="btn-ghost mt-3 w-full text-center text-xs border border-lime/40 text-lime font-bold py-1 hover:bg-lime/10"
                                          >
                                            ⬇ Download Production File
                                          </a>
                                        )}
                                      </div>

                                      {/* Physical Specifications & Resolution */}
                                      <div className="space-y-2 md:col-span-2">
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 pb-2">
                                          <strong className="text-sm text-ink">Custom Sticker Specifications</strong>
                                          <span className="rounded bg-lime/20 px-2 py-0.5 text-xs font-bold text-lime">
                                            Qty: {config.quantity || 1}
                                          </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                          <div>
                                            <p className="text-ink-soft">Size Preset:</p>
                                            <p className="font-semibold text-ink uppercase">{config.sizeId}</p>
                                          </div>
                                          <div>
                                            <p className="text-ink-soft">Confirmed Physical Dimensions:</p>
                                            <p className="font-bold text-ink">{physicalDim || 'Standard'}</p>
                                          </div>
                                          <div>
                                            <p className="text-ink-soft">Die-Cut Shape:</p>
                                            <p className="font-semibold text-ink capitalize">{config.shape || 'Standard'}</p>
                                          </div>
                                          <div>
                                            <p className="text-ink-soft">Finish & Laminate:</p>
                                            <p className="font-semibold text-ink capitalize">{config.finishId || 'Standard'}</p>
                                          </div>
                                          <div>
                                            <p className="text-ink-soft">Original File Name:</p>
                                            <p className="font-mono text-ink">{co.artwork?.originalName || 'artwork.png'}</p>
                                          </div>
                                          <div>
                                            <p className="text-ink-soft">Artwork Resolution & Format:</p>
                                            <p className="font-mono text-ink">
                                              {co.artwork?.width && co.artwork?.height
                                                ? `${co.artwork.width} × ${co.artwork.height} px`
                                                : 'Dimensions unrecorded'}{' '}
                                              ({co.artwork?.mimeType || 'image/png'})
                                            </p>
                                          </div>
                                        </div>

                                        {/* Resolution Warning (Requirement 8) */}
                                        {isLowResolution ? (
                                          <div className="rounded-lg border border-danger/40 bg-danger/10 p-2.5 text-xs text-danger font-medium">
                                            ⚠️ <strong>Low Resolution Warning:</strong> The uploaded image (
                                            {co.artwork?.width}×{co.artwork?.height} px) is below the recommended 300 DPI target (
                                            {minDpiPixels}×{minDpiPixels} px) for {config.sizeId} prints. Fine lines or text may print softly.
                                          </div>
                                        ) : (
                                          <div className="rounded-lg bg-mint/15 p-2 text-[11px] text-mint font-medium">
                                            ✓ <strong>Print-Ready Resolution:</strong> Artwork meets or exceeds 300 DPI production requirements.
                                          </div>
                                        )}

                                        {/* Instructions or notes */}
                                        {(config.instructions || co.productionNotes) && (
                                          <div className="rounded bg-paper p-2 text-xs text-ink">
                                            <strong>Customer Production Instructions:</strong>
                                            <p className="mt-0.5 text-ink-soft">{config.instructions || co.productionNotes}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Custom Wall Layout */}
                                  {isWall && (
                                    <div className="space-y-3">
                                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 pb-2">
                                        <strong className="text-sm text-ink">
                                          Custom Wall · {WALL_LAYOUT_NAMES[config.layoutId] || config.layoutId}
                                        </strong>
                                        <span className="rounded bg-sky/20 px-2 py-0.5 text-xs font-bold text-sky">
                                          Layout: {config.layoutId} · Qty: {config.quantity || 1}
                                        </span>
                                      </div>

                                      <p className="text-xs text-ink-soft">
                                        Individual slot configurations ({config.slots?.length || 0} framed prints):
                                      </p>

                                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                                        {config.slots?.map((slot: any, sIdx: number) => {
                                          const fill = slot.fill || {};
                                          const matchingArtwork = co.artworks?.find((a) => a.slotId === slot.slotId)?.artwork;
                                          const artworkId = fill.artworkId || matchingArtwork?.id;
                                          const slotThumb = resolveArtworkUrl(fill.previewUrl || artworkId, false, matchingArtwork?.fileName) || fill.url || '/vite.svg';
                                           const slotDl = resolveArtworkUrl(fill.previewUrl || artworkId, true, matchingArtwork?.fileName);

                                          return (
                                            <div
                                              key={slot.slotId || sIdx}
                                              className="flex items-start gap-3 rounded-lg border border-ink/10 bg-paper p-2.5"
                                            >
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setEnlargedImage({
                                                    url: slotThumb,
                                                    title: `Slot ${slot.slotId} (${slot.size?.toUpperCase()})`,
                                                    subtitle: `Source: ${fill.source} · Fit: ${fill.fit || 'contain'}`,
                                                    downloadUrl: slotDl || undefined,
                                                    downloadName: fill.fileName || `slot-${slot.slotId}`,
                                                  })
                                                }
                                                className="h-16 w-14 shrink-0 overflow-hidden rounded border border-ink/10 bg-white"
                                              >
                                                <img
                                                  src={slotThumb}
                                                  alt={`Slot ${slot.slotId}`}
                                                  className="h-full w-full object-cover"
                                                  loading="lazy"
                                                />
                                              </button>
                                              <div className="min-w-0 flex-1 text-[11px]">
                                                <p className="font-bold text-ink">
                                                  Slot {slot.slotId?.toUpperCase()} · Size {slot.size?.toUpperCase()}
                                                </p>
                                                <p className="text-ink-soft">
                                                  Source: <strong className="text-ink">{fill.source || 'catalogue'}</strong>
                                                </p>
                                                {fill.fit && <p className="text-ink-soft">Fit: {fill.fit}</p>}
                                                {fill.focalPoint && (
                                                  <p className="text-ink-soft">
                                                    Focus: {fill.focalPoint.x}%, {fill.focalPoint.y}%
                                                  </p>
                                                )}
                                                {slotDl && (
                                                  <a
                                                    href={slotDl}
                                                    download={`slot-${slot.slotId}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="mt-1 inline-block text-[10px] font-bold text-lime underline"
                                                  >
                                                    ⬇ Download file
                                                  </a>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Custom Pack Layout */}
                                  {isPack && (
                                    <div className="space-y-3">
                                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 pb-2">
                                        <strong className="text-sm text-ink">
                                          Custom Pack · {config.size} Stickers ({config.seriesId})
                                        </strong>
                                        <span className="rounded bg-mint/20 px-2 py-0.5 text-xs font-bold text-mint">
                                          Finish: {config.finishId || 'Standard'} · Pack Price: ₹{config.size === 10 ? 199 : 109}
                                        </span>
                                      </div>

                                      <div className="text-xs">
                                        <p className="text-ink-soft">Selected Designs ({config.designIds?.length || 0}):</p>
                                        <div className="mt-1 flex flex-wrap gap-1.5">
                                          {config.designIds?.map((dId: string) => (
                                            <span
                                              key={dId}
                                              className="rounded bg-paper px-2 py-0.5 font-mono text-[11px] font-bold text-ink"
                                            >
                                              {dId}
                                            </span>
                                          ))}
                                        </div>
                                        <div className="mt-2 rounded bg-paper/60 p-2 text-[11px] text-mint font-medium">
                                          🎁 Includes 1 guaranteed Sticker Club surprise item / mystery sticker for completion.
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Audit & Event History */}
                      {order.events && order.events.length > 0 && (
                        <div className="rounded-xl border border-ink/10 bg-paper/40 p-3.5">
                          <h4 className="font-bold text-ink uppercase tracking-wider text-[11px]">
                            Audit & Event History ({order.events.length})
                          </h4>
                          <ul className="mt-2 space-y-1 text-ink-soft">
                            {order.events.map((ev) => (
                              <li key={ev.id} className="text-[11px]">
                                • <strong className="text-ink">{ev.kind}</strong> at{' '}
                                {new Date(ev.createdAt).toLocaleString('en-IN')}{' '}
                                {ev.detail ? `— ${JSON.stringify(ev.detail)}` : ''}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dedicated Order Notes Section */}
                  {(() => {
                    const notes = getOrderNotes(order);
                    const draft = notesDraft[order.id] || '';
                    const isSaving = savingNoteId === order.id;

                    return (
                      <div className="mt-4 rounded-xl border border-ink/20 bg-paper/60 p-4 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base">📝</span>
                            <h4 className="font-bold text-xs uppercase tracking-wider text-ink">
                              Admin Notes &amp; Remarks
                            </h4>
                            {notes.length > 0 && (
                              <span className="rounded-full bg-mint/20 border border-mint/40 px-2 py-0.5 text-[10px] font-bold text-mint">
                                {notes.length} note{notes.length === 1 ? '' : 's'}
                              </span>
                            )}
                          </div>
                          {notes.length > 0 && (
                            <span className="text-[11px] text-ink-soft hidden sm:inline-block">
                              Latest: {new Date(notes[0].createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          )}
                        </div>

                        {/* List of existing notes */}
                        {notes.length > 0 && (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {notes.map((note) => (
                              <div
                                key={note.id}
                                className="group relative rounded-lg border border-ink/10 bg-paper p-3 text-xs text-ink transition hover:border-ink/25 shadow-xs"
                              >
                                <p className="whitespace-pre-wrap leading-relaxed text-ink/90 font-medium">
                                  {note.text}
                                </p>
                                <div className="mt-2 flex items-center justify-between text-[10px] text-ink-soft border-t border-ink/5 pt-1.5">
                                  <span>
                                    By <strong className="text-ink">{note.author}</strong> ·{' '}
                                    {new Date(note.createdAt).toLocaleString('en-IN', {
                                      dateStyle: 'medium',
                                      timeStyle: 'short',
                                    })}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteNote(order.id, note.id)}
                                    className="text-danger/80 hover:text-danger hover:underline font-bold transition-colors inline-flex items-center gap-1"
                                    title="Delete this note"
                                  >
                                    <LuTrash2 className="size-3" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Note Input Textarea */}
                        <div className="space-y-2 pt-1">
                          <textarea
                            rows={2}
                            value={draft}
                            onChange={(e) =>
                              setNotesDraft((prev) => ({ ...prev, [order.id]: e.target.value }))
                            }
                            placeholder="Type internal notes for this order (e.g. courier tracking number, custom packaging instructions, customer call log, size confirmations)..."
                            className="w-full rounded-lg border border-ink/20 bg-paper p-3 text-xs text-ink placeholder:text-ink-soft/60 focus:border-mint focus:outline-none focus:ring-1 focus:ring-mint transition"
                          />
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-ink-soft italic">
                              Private note · Visible only to store administrators
                            </span>
                            <div className="flex items-center gap-2">
                              {draft.trim() && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setNotesDraft((prev) => ({ ...prev, [order.id]: '' }))
                                  }
                                  className="btn-ghost text-xs px-2.5 py-1 text-ink-soft hover:text-ink"
                                >
                                  Clear
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={isSaving || !draft.trim()}
                                onClick={() => void handleSaveNote(order.id)}
                                className="btn-primary text-xs px-4 py-1.5 font-bold shadow-sm inline-flex items-center gap-1.5"
                              >
                                {isSaving ? (
                                  <>
                                    <span className="inline-block size-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    <span>Saving…</span>
                                  </>
                                ) : (
                                  <>
                                    <span>💾</span>
                                    <span>Save Note</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Action Buttons Row */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-ink/10">
                    {/* Status transition buttons */}
                    {NEXT_STATUS[order.status].map((status) => (
                      <button
                        type="button"
                        key={status}
                        className="btn-ghost text-xs"
                        disabled={busy === order.id}
                        onClick={() => void updateStatus(order.id, status)}
                      >
                        {busy === order.id ? 'Updating…' : 'Mark ' + status.toLowerCase()}
                      </button>
                    ))}

                    {/* COD Collection Button */}
                    {isCod && !isPaid && order.status !== 'CANCELLED' && (
                      <button
                        type="button"
                        className="btn-primary text-xs bg-sky/90 text-white hover:bg-sky"
                        disabled={busy === order.id}
                        onClick={() => void collectCod(order.id)}
                      >
                        {busy === order.id ? 'Collecting…' : '💵 Mark COD Collected'}
                      </button>
                    )}

                    {/* Verify UPI Payment Button if pending */}
                    {isUpi && order.payment?.status === 'SUBMITTED' && !isPaid && (
                      <button
                        type="button"
                        className="btn-primary text-xs bg-sun text-paper hover:bg-sun/90"
                        disabled={busy === order.payment.id}
                        onClick={() => void verifyPayment(order.payment!.id)}
                      >
                        {busy === order.payment.id ? 'Verifying…' : '✓ Verify UPI Payment'}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={zippingId === order.id}
                      className="btn-ghost text-xs border border-ink/20 px-2.5 py-1 inline-flex items-center gap-1 font-semibold"
                      onClick={() => void handleDownloadOrderZip(order)}
                    >
                      <span>📦</span>
                      <span>{zippingId === order.id ? 'Bundling ZIP…' : 'Download Order ZIP Package'}</span>
                    </button>

                    {/* Ping Customer for Review Button */}
                    <button
                      type="button"
                      disabled={busy === order.id}
                      className="btn-ghost text-xs border border-sun/50 text-sun hover:bg-sun/10 hover:border-sun px-2.5 py-1 inline-flex items-center gap-1.5 font-semibold"
                      onClick={() => void handlePingReview(order)}
                      title="Ping customer via WhatsApp with personalized review invitation"
                    >
                      <LuStar className="size-3.5 fill-sun text-sun" />
                      <span>{order.events?.some((e) => e.kind === 'REVIEW_PINGED') ? 'Ping Review Again' : '⭐ Ping for Review'}</span>
                    </button>

                    {/* Delete Order Button */}
                    <button
                      type="button"
                      disabled={busy === order.id}
                      className="btn-ghost text-xs border border-danger/40 text-danger hover:bg-danger/10 hover:border-danger px-2.5 py-1 inline-flex items-center gap-1 font-semibold ml-auto"
                      onClick={() => void handleDeleteOrder(order.id)}
                      title="Permanently delete this order"
                    >
                      <LuTrash2 className="size-3.5" />
                      <span>{busy === order.id ? 'Deleting…' : 'Delete Order'}</span>
                    </button>

                    {/* Inline Action Notice Feedback */}
                    {actionNotice && actionNotice.id === order.id && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${actionNotice.isError ? 'bg-danger/10 text-danger' : 'bg-mint/20 text-mint'}`}>
                        {actionNotice.text}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ENLARGED IMAGE & ARTWORK PREVIEW MODAL */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setEnlargedImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-2xl w-full rounded-2xl border border-ink/20 bg-paper p-5 shadow-2xl overflow-y-auto"
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
                aria-label="Close image modal"
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
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
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

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-xs text-ink-soft">
                Full-resolution production asset preview
              </span>
              <div className="flex gap-2">
                {enlargedImage.downloadUrl && (
                  <a
                    href={enlargedImage.downloadUrl}
                    download={enlargedImage.downloadName || 'artwork'}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary text-xs"
                  >
                    ⬇ Download Original File
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
        </div>
      )}
    </section>
  );
}
