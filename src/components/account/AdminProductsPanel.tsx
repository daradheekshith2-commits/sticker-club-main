import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react';
import { LuArchive, LuEye, LuEyeOff, LuFolder, LuImage, LuPackage, LuPencil, LuPlus, LuSearch, LuTrash, LuX } from 'react-icons/lu';
import { useAuth, apiUrl } from '../../context/AuthContext';
import { useCatalogue } from '../../context/CatalogueContext';
import { ProductImage } from '../art/ProductArt';
import { collections as baselineCollections } from '../../data/collections';

function resolveImgUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http') || !apiUrl) return url;
  return `${apiUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

type VariantDraft = { id: string; label: string; price: number; detail?: string };
type ImageDraft = { url: string; alt: string; position: number; isPrimary: boolean; file?: File };

type BackendProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  shortDescription?: string;
  price: string;
  status: 'PUBLISHED' | 'HIDDEN' | 'ARCHIVED';
  productType?: string;
  category?: string;
  active?: boolean;
  featured?: boolean;
  isNew?: boolean;
  displayOrder?: number;
  packQuantity?: number;
  dimensions?: string;
  material?: string;
  finish?: string;
  note?: string;
  rarity?: string;
  seriesId?: string;
  inventory?: { quantity: number } | null;
  variants?: Array<{ id: string; label: string; price: string; detail?: string }>;
  images?: Array<{ id?: string; url: string; alt: string; position: number; isPrimary?: boolean }>;
  categories?: Array<{ categoryId: string; productId?: string }>;
  collections?: Array<{ collectionId?: string; categoryId?: string }>;
  tags?: Array<{ tag: string }>;
  metadata?: any;
};

type CategoryItem = {
  id: string;
  name: string;
  blurb?: string;
  color?: string;
  motif?: string;
  featured?: boolean;
  displayOrder?: number;
  archived?: boolean;
};

export function AdminProductsPanel() {
  const { user, request, requestMultipart } = useAuth();
  const { refresh: refreshStorefrontCatalogue, getProductById } = useCatalogue();

  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');

  // Products state
  const [products, setProducts] = useState<BackendProduct[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Filters
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'stickers' | 'posters'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'HIDDEN' | 'ARCHIVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Categories state
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [catDraft, setCatDraft] = useState({ id: '', name: '', blurb: '', color: '#D90A1F', motif: 'sparkle', displayOrder: 0 });

  // Product Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<BackendProduct | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [prodType, setProdType] = useState<'stickers' | 'posters'>('stickers');
  const [format, setFormat] = useState('single');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [price, setPrice] = useState('20');
  const [stock, setStock] = useState('100');
  const [description, setDescription] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [status, setStatus] = useState<'PUBLISHED' | 'HIDDEN'>('PUBLISHED');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isNewItem, setIsNewItem] = useState(false);
  const [seriesId, setSeriesId] = useState('S01');
  const [rarity, setRarity] = useState('common');
  const [note, setNote] = useState('');

  // Variants & Images
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [images, setImages] = useState<ImageDraft[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Bulk Selection State
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  function toggleSelectAll() {
    if (selectedProductIds.size === products.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(products.map((p) => p.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Load products from backend with pagination and filters
  async function loadProducts() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'ALL') params.set('type', typeFilter);
      if (categoryFilter !== 'ALL') params.set('category', categoryFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      params.set('page', String(page));
      params.set('limit', String(pageSize));

      const res = await request<any>(
        `/api/admin/products?${params.toString()}`
      );
      const items: BackendProduct[] = Array.isArray(res) ? res : res?.items || res?.products || [];
      setProducts(items);
      setTotalProducts(typeof res?.total === 'number' ? res.total : items.length);
    } catch (e: any) {
      setError(e.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }

  // Load categories
  async function loadCategories() {
    try {
      const data = await request<CategoryItem[]>('/api/admin/categories');
      setCategories(data);
    } catch {
      // Fallback
      setCategories(baselineCollections.map((c) => ({ ...c, archived: false })));
    }
  }

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    void loadProducts();
    void loadCategories();
  }, [user?.id, typeFilter, categoryFilter, statusFilter, page, searchQuery]);

  // Open add/edit modal
  function openAddModal() {
    setEditingId(null);
    setProdType('stickers');
    setFormat('single');
    setName('');
    setSlug('');
    setPrice('20');
    setStock('100');
    setDescription('');
    setShortDesc('');
    setSelectedCollections([]);
    setStatus('PUBLISHED');
    setIsFeatured(false);
    setIsNewItem(false);
    setSeriesId('S01');
    setRarity('common');
    setNote('');
    setVariants([]);
    setImages([]);
    setModalOpen(true);
  }

  function openEditModal(p: BackendProduct) {
    setEditingId(p.id);
    setProdType(p.category === 'posters' ? 'posters' : 'stickers');
    setFormat(p.productType || 'single');
    setName(p.name);
    setSlug(p.slug);
    setPrice(p.price);
    setStock(String(p.inventory?.quantity ?? 100));
    setDescription(p.description || '');
    setShortDesc(p.shortDescription || '');
    const assignedCats = (
      p.categories?.map((c: any) => c.categoryId) ||
      p.collections?.map((c: any) => c.collectionId || c.categoryId) ||
      []
    ).filter((id: string) => id !== 'stickers' && id !== 'posters');
    setSelectedCollections(assignedCats);
    setStatus(p.status === 'HIDDEN' ? 'HIDDEN' : 'PUBLISHED');
    setIsFeatured(Boolean(p.featured));
    setIsNewItem(Boolean(p.isNew));
    setSeriesId(p.seriesId || 'S01');
    setRarity(p.rarity || 'common');
    setNote(p.note || '');
    setVariants(
      p.variants?.map((v) => ({
        id: v.id,
        label: v.label,
        price: Number(v.price),
        detail: v.detail,
      })) || []
    );
    setImages(
      p.images?.map((img) => ({
        url: img.url,
        alt: img.alt,
        position: img.position,
        isPrimary: Boolean(img.isPrimary),
      })) || []
    );
    setModalOpen(true);
  }

  // Handle uploading product image file
  async function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await requestMultipart<{ url: string; fileName: string }>('/api/admin/uploads/product-image', formData);
      const isFirst = images.length === 0;
      setImages((prev) => [
        ...prev,
        {
          url: res.url,
          alt: `${name || 'Product'} image`,
          position: prev.length,
          isPrimary: isFirst,
        },
      ]);
    } catch (err: any) {
      setError(err.message || 'Image upload failed');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  }

  // Save product
  async function handleProductSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const trimmedName = name.trim();
      if (!trimmedName) throw new Error('Product name is required');

      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice < 0) throw new Error('Enter a valid non-negative price');
      const numStock = parseInt(stock, 10);
      if (isNaN(numStock) || numStock < 0) throw new Error('Enter a valid non-negative stock quantity');

      const generatedSlug = (slug.trim() || trimmedName)
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/(^-|-$)/g, '') || `item-${Date.now().toString(36)}`;

      const cleanVariants = variants
        .filter((v) => (v.label || v.id).trim())
        .map((v) => ({
          id: (v.id.trim() || v.label.trim()).toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'v1',
          label: v.label.trim() || v.id.trim() || 'Variant',
          price: Number(v.price) >= 0 ? Number(v.price) : numPrice,
          detail: v.detail?.trim() || undefined,
        }));

      const payload = {
        name: trimmedName,
        slug: generatedSlug,
        description: description.trim() || trimmedName,
        shortDescription: shortDesc.trim() || undefined,
        price: numPrice,
        category: prodType,
        productType: format,
        status,
        featured: isFeatured,
        isNew: isNewItem,
        seriesId: seriesId.trim() || undefined,
        rarity: rarity || 'common',
        note: note.trim() || undefined,
        categories: selectedCollections,
        collections: selectedCollections,
        stock: numStock,
        variants: cleanVariants.length > 0 ? cleanVariants : undefined,
        images: images.map((img, i) => ({
          url: img.url,
          alt: img.alt || trimmedName,
          position: i,
          isPrimary: img.isPrimary,
        })),
      };

      if (editingId) {
        await request(`/api/admin/products/${encodeURIComponent(editingId)}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setMessage(`Product "${trimmedName}" updated successfully.`);
      } else {
        await request('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setMessage(`Product "${trimmedName}" created successfully.`);
      }

      setModalOpen(false);
      await loadProducts();
      await refreshStorefrontCatalogue();
    } catch (err: any) {
      setError(err.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  // Quick action: Toggle publish/hide
  async function togglePublish(p: BackendProduct) {
    setBusy(true);
    const nextStatus = p.status === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED';
    try {
      await request(`/api/admin/products/${encodeURIComponent(p.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus, active: nextStatus === 'PUBLISHED' }),
      });
      await loadProducts();
      await refreshStorefrontCatalogue();
      setMessage(`Product "${p.name}" is now ${nextStatus.toLowerCase()}.`);
    } catch (err: any) {
      setError(err.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  // Archive product
  async function handleArchive(p: BackendProduct) {
    if (!window.confirm(`Are you sure you want to archive "${p.name}"? It will be hidden from the customer storefront while preserving past orders.`)) {
      return;
    }
    setBusy(true);
    try {
      await request(`/api/admin/products/${encodeURIComponent(p.id)}`, { method: 'DELETE' });
      await loadProducts();
      await refreshStorefrontCatalogue();
      setMessage(`Product "${p.name}" has been archived.`);
    } catch (err: any) {
      setError(err.message || 'Archive failed');
    } finally {
      setBusy(false);
    }
  }

  // Delete product permanently
  async function handleDeleteProduct(p: BackendProduct) {
    if (!window.confirm(`Are you sure you want to permanently delete "${p.name}" (${p.slug})? This cannot be undone.`)) {
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await request(`/api/admin/products/${encodeURIComponent(p.id)}?permanent=true`, { method: 'DELETE' });
      await loadProducts();
      await refreshStorefrontCatalogue();
      setMessage(`Product "${p.name}" was permanently deleted.`);
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  // Category Actions
  function openAddCategory() {
    setEditingCategory(null);
    setCatDraft({
      id: '',
      name: '',
      blurb: '',
      color: '#D90A1F',
      motif: 'sparkle',
      displayOrder: categories.length + 1,
    });
  }

  function openEditCategory(cat: CategoryItem) {
    setEditingCategory(cat);
    setCatDraft({
      id: cat.id,
      name: cat.name,
      blurb: cat.blurb || '',
      color: cat.color || '#D90A1F',
      motif: cat.motif || 'sparkle',
      displayOrder: cat.displayOrder || 0,
    });
  }

  async function handleCategorySubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (editingCategory) {
        await request(`/api/admin/categories/${encodeURIComponent(editingCategory.id)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: catDraft.name.trim(),
            blurb: catDraft.blurb.trim() || undefined,
            color: catDraft.color,
            motif: catDraft.motif,
            displayOrder: Number(catDraft.displayOrder),
          }),
        });
        setMessage(`Category "${catDraft.name}" updated.`);
      } else {
        const catId = catDraft.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        await request('/api/admin/categories', {
          method: 'POST',
          body: JSON.stringify({
            id: catId,
            name: catDraft.name.trim(),
            blurb: catDraft.blurb.trim() || undefined,
            color: catDraft.color,
            motif: catDraft.motif,
            displayOrder: Number(catDraft.displayOrder),
          }),
        });
        setMessage(`Category "${catDraft.name}" created.`);
      }
      setEditingCategory(null);
      await loadCategories();
      await refreshStorefrontCatalogue();
    } catch (err: any) {
      setError(err.message || 'Category update failed');
    } finally {
      setBusy(false);
    }
  }

  async function toggleArchiveCategory(cat: CategoryItem) {
    if (cat.id === 'quotes') {
      alert('Cars & Bikes is a core themed collection and cannot be archived.');
      return;
    }
    setBusy(true);
    try {
      await request(`/api/admin/categories/${encodeURIComponent(cat.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ archived: !cat.archived }),
      });
      await loadCategories();
      await refreshStorefrontCatalogue();
      setMessage(`Category "${cat.name}" is now ${cat.archived ? 'active' : 'archived'}.`);
    } catch (err: any) {
      setError(err.message || 'Category archive toggle failed');
    } finally {
      setBusy(false);
    }
  }

  if (user?.role !== 'ADMIN') return null;

  return (
    <section className="mt-6 rounded-2xl bg-[#0B2420] border border-[#315e53] p-6 text-[#F4F0E8] shadow-lg">
      {/* Header and Tab Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#315e53] pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#F4F0E8]">Catalogue Management</h2>
          <p className="mt-1 text-sm text-[#B5C7C1]">
            Authoritative database source of truth. Manage stickers, posters, stock, and themed collections.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 text-xs font-bold rounded-lg border transition ${
              activeTab === 'products'
                ? 'bg-[#D90A1F] border-[#D90A1F] text-[#F4F0E8]'
                : 'border-[#315e53] bg-[#071B18] text-[#B5C7C1] hover:text-[#F4F0E8]'
            }`}
          >
            <LuPackage className="inline mr-1 size-3.5" /> Products ({totalProducts})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 text-xs font-bold rounded-lg border transition ${
              activeTab === 'categories'
                ? 'bg-[#D90A1F] border-[#D90A1F] text-[#F4F0E8]'
                : 'border-[#315e53] bg-[#071B18] text-[#B5C7C1] hover:text-[#F4F0E8]'
            }`}
          >
            <LuFolder className="inline mr-1 size-3.5" /> Collections ({categories.length})
          </button>
          {activeTab === 'products' ? (
            <button
              type="button"
              onClick={openAddModal}
              className="btn-primary text-xs py-2 px-3 inline-flex items-center gap-1.5"
            >
              <LuPlus className="size-4" /> Add Product
            </button>
          ) : (
            <button
              type="button"
              onClick={openAddCategory}
              className="btn-primary text-xs py-2 px-3 inline-flex items-center gap-1.5"
            >
              <LuPlus className="size-4" /> New Collection
            </button>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger font-medium">
          {error}
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-cinema-red/40 bg-[#071B18] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Confirm Bulk Deletion</h3>
            <p className="mt-2 text-sm text-[#B5C7C1] leading-relaxed">
              Are you sure you want to delete <strong className="text-white">{selectedProductIds.size}</strong> selected products?
            </p>
            <p className="mt-3 text-xs text-amber-300/90 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 leading-relaxed">
              Products without existing customer orders will be permanently removed. Products referenced in customer orders will be safely archived to preserve customer order histories.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="rounded-lg border border-[#315e53] px-4 py-2 text-xs font-semibold text-[#B5C7C1] hover:bg-[#0B2420]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={async () => {
                  setBulkDeleting(true);
                  try {
                    await request('/api/admin/products/bulk-delete', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ ids: Array.from(selectedProductIds), permanent: true }),
                    });
                    setMessage(`Successfully processed ${selectedProductIds.size} products.`);
                    setSelectedProductIds(new Set());
                    setShowBulkDeleteConfirm(false);
                    await loadProducts();
                    void refreshStorefrontCatalogue();
                  } catch (err: any) {
                    setError(err.message || 'Failed to bulk delete products');
                  } finally {
                    setBulkDeleting(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cinema-red px-4 py-2 text-xs font-bold text-white hover:bg-cinema-red/90 disabled:opacity-50"
              >
                {bulkDeleting ? 'Deleting…' : 'Yes, Delete Selected'}
              </button>
            </div>
          </div>
        </div>
      )}
      {message && (
        <div role="status" className="mt-4 rounded-xl border border-mint/30 bg-mint/15 p-3 text-sm text-mint font-medium">
          {message}
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-cinema-red/40 bg-[#071B18] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Confirm Bulk Deletion</h3>
            <p className="mt-2 text-sm text-[#B5C7C1] leading-relaxed">
              Are you sure you want to delete <strong className="text-white">{selectedProductIds.size}</strong> selected products?
            </p>
            <p className="mt-3 text-xs text-amber-300/90 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 leading-relaxed">
              Products without existing customer orders will be permanently removed. Products referenced in customer orders will be safely archived to preserve customer order histories.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="rounded-lg border border-[#315e53] px-4 py-2 text-xs font-semibold text-[#B5C7C1] hover:bg-[#0B2420]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={async () => {
                  setBulkDeleting(true);
                  try {
                    await request('/api/admin/products/bulk-delete', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ ids: Array.from(selectedProductIds), permanent: true }),
                    });
                    setMessage(`Successfully processed ${selectedProductIds.size} products.`);
                    setSelectedProductIds(new Set());
                    setShowBulkDeleteConfirm(false);
                    await loadProducts();
                    void refreshStorefrontCatalogue();
                  } catch (err: any) {
                    setError(err.message || 'Failed to bulk delete products');
                  } finally {
                    setBulkDeleting(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cinema-red px-4 py-2 text-xs font-bold text-white hover:bg-cinema-red/90 disabled:opacity-50"
              >
                {bulkDeleting ? 'Deleting…' : 'Yes, Delete Selected'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCTS TAB */}
      {activeTab === 'products' && (
        <div className="mt-5 space-y-4">
          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#071B18] p-3 rounded-xl border border-[#315e53]">
            {/* Search */}
            <div className="relative">
              <LuSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#B5C7C1]" />
              <input
                type="text"
                placeholder="Search name or slug…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-[#315e53] bg-[#0B2420] py-1.5 pl-9 pr-3 text-xs text-[#F4F0E8] outline-none focus:border-[#A8F0DC]"
              />
            </div>

            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as any);
                setPage(1);
              }}
              className="rounded-lg border border-[#315e53] bg-[#0B2420] py-1.5 px-3 text-xs text-[#F4F0E8] outline-none focus:border-[#A8F0DC]"
            >
              <option value="ALL">All Types (Stickers & Posters)</option>
              <option value="stickers">Stickers Only</option>
              <option value="posters">Posters Only</option>
            </select>

            {/* Category filter */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-[#315e53] bg-[#0B2420] py-1.5 px-3 text-xs text-[#F4F0E8] outline-none focus:border-[#A8F0DC]"
            >
              <option value="ALL">All Collections</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.id === 'quotes' ? '(Cars & Bikes)' : ''}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="rounded-lg border border-[#315e53] bg-[#0B2420] py-1.5 px-3 text-xs text-[#F4F0E8] outline-none focus:border-[#A8F0DC]"
            >
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="HIDDEN">Hidden</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          {/* Bulk Selection Action Bar */}
          {selectedProductIds.size > 0 && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cinema-red/50 bg-[#071B18] px-4 py-3 shadow-lg">
              <div className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full bg-cinema-red text-xs font-bold text-white">
                  {selectedProductIds.size}
                </span>
                <span className="text-sm font-bold text-[#F4F0E8]">
                  products selected on this page
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedProductIds(new Set())}
                  className="rounded-lg border border-[#315e53] px-3 py-1.5 text-xs font-semibold text-[#B5C7C1] hover:text-white hover:bg-[#0B2420]"
                >
                  Clear Selection
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-cinema-red px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-cinema-red/90"
                >
                  <LuTrash className="size-3.5" />
                  Delete Selected ({selectedProductIds.size})
                </button>
              </div>
            </div>
          )}

          {/* Product Table / Cards */}
          {loading ? (
            <div className="py-12 text-center text-sm text-[#B5C7C1] animate-pulse">
              Loading products from authoritative database…
            </div>
          ) : products.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#B5C7C1]">
              No products found matching the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#315e53]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#071B18] text-[#B5C7C1] uppercase tracking-wider font-bold border-b border-[#315e53]">
                  <tr>
                    <th className="py-3 px-3 w-8">
                      <input
                        type="checkbox"
                        checked={products.length > 0 && selectedProductIds.size === products.length}
                        onChange={toggleSelectAll}
                        className="size-4 rounded accent-[#FF1026] cursor-pointer"
                        aria-label="Select all products on page"
                      />
                    </th>
                    <th className="py-3 px-3">Item</th>
                    <th className="py-3 px-3">Type & Format</th>
                    <th className="py-3 px-3">Collections</th>
                    <th className="py-3 px-3">Price</th>
                    <th className="py-3 px-3">Stock</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#315e53]/50">
                  {products.map((p) => {
                    const primaryImg = p.images?.find((img) => img.isPrimary) || p.images?.[0];
                    const isArchived = p.status === 'ARCHIVED';
                    const isHidden = p.status === 'HIDDEN';

                    return (
                      <tr key={p.id} className="hover:bg-[#071B18]/60 transition">
                        <td className="py-2.5 px-3">
                          <input
                            type="checkbox"
                            checked={selectedProductIds.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                            className="size-4 rounded accent-[#FF1026] cursor-pointer"
                            aria-label={`Select ${p.name}`}
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            {primaryImg ? (
                              <button
                                type="button"
                                onClick={() => setPreviewProduct(p)}
                                title="Click to view full image"
                                className="group relative size-11 shrink-0 rounded-lg overflow-hidden bg-black/40 border border-[#315e53] hover:border-[#A8F0DC] transition focus:outline-none focus:ring-1 focus:ring-[#A8F0DC] cursor-pointer"
                              >
                                <img
                                  src={resolveImgUrl(primaryImg.url)}
                                  alt={primaryImg.alt || p.name}
                                  className="size-full object-cover group-hover:scale-110 transition-transform duration-200"
                                  loading="lazy"
                                />
                                <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <LuEye className="size-4 text-white drop-shadow" />
                                </span>
                              </button>
                            ) : getProductById(p.id) ? (
                              <button
                                type="button"
                                onClick={() => setPreviewProduct(p)}
                                title="Click to view preview"
                                className="group relative size-11 shrink-0 rounded-lg bg-black/40 border border-[#315e53] overflow-hidden hover:border-[#A8F0DC] transition cursor-pointer"
                              >
                                <ProductImage product={getProductById(p.id)!} className="size-full object-cover group-hover:scale-110 transition-transform" />
                                <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <LuEye className="size-4 text-white drop-shadow" />
                                </span>
                              </button>
                            ) : (
                              <div className="size-11 shrink-0 rounded-lg bg-[#071B18] border border-[#315e53] grid place-items-center text-[10px] text-[#B5C7C1]">
                                No img
                              </div>
                            )}
                            <div>
                              <button
                                type="button"
                                onClick={() => openEditModal(p)}
                                className="block text-left text-sm font-bold text-[#F4F0E8] hover:text-[#A8F0DC] transition"
                              >
                                {p.name}
                              </button>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] text-[#B5C7C1]">{p.slug}</span>
                                <a
                                  href={`/product/${p.slug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-[#A8F0DC] hover:underline"
                                  title="View on live storefront"
                                >
                                  View live ↗
                                </a>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="capitalize font-semibold text-[#F4F0E8]">{p.category || 'stickers'}</span>
                          <span className="block text-[10px] text-[#B5C7C1] capitalize">{p.productType || 'single'}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {(
                              p.categories?.map((c: any) => c.categoryId) ||
                              p.collections?.map((c: any) => c.collectionId || c.categoryId) ||
                              []
                            )
                              .filter((cid: string) => cid !== 'stickers' && cid !== 'posters')
                              .map((cid: string) => {
                                const catName = categories.find((cat) => cat.id === cid)?.name || (cid === 'quotes' ? 'Cars & Bikes' : cid);
                                return (
                                  <span key={cid} className="rounded bg-[#071B18] px-1.5 py-0.5 text-[9px] text-[#A8F0DC] border border-[#315e53]">
                                    {catName}
                                  </span>
                                );
                              })}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-[#F4F0E8]">
                          ₹{p.price}
                          {p.variants?.length ? (
                            <span className="block text-[10px] font-normal text-[#B5C7C1]">
                              +{p.variants.length} sizes
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`font-bold ${p.inventory && p.inventory.quantity <= 5 ? 'text-danger' : 'text-mint'}`}>
                            {p.inventory?.quantity ?? '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              isArchived
                                ? 'bg-black/40 text-[#B5C7C1]'
                                : isHidden
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-mint/20 text-mint'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(p)}
                              title="Edit product"
                              className="p-1.5 rounded hover:bg-[#071B18] text-[#F4F0E8] hover:text-[#A8F0DC]"
                            >
                              <LuPencil className="size-4" />
                            </button>
                            {!isArchived && (
                              <button
                                type="button"
                                onClick={() => void togglePublish(p)}
                                title={isHidden ? 'Publish product' : 'Hide from shop'}
                                className="p-1.5 rounded hover:bg-[#071B18] text-[#B5C7C1] hover:text-[#F4F0E8]"
                              >
                                {isHidden ? <LuEye className="size-4 text-mint" /> : <LuEyeOff className="size-4" />}
                              </button>
                            )}
                            {!isArchived && (
                              <button
                                type="button"
                                onClick={() => void handleArchive(p)}
                                title="Archive product"
                                className="p-1.5 rounded hover:bg-[#071B18] text-[#B5C7C1] hover:text-[#F4F0E8]"
                              >
                                <LuArchive className="size-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => void handleDeleteProduct(p)}
                              title="Delete product permanently"
                              className="p-1.5 rounded hover:bg-danger/20 text-danger/80 hover:text-danger"
                            >
                              <LuTrash className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalProducts > pageSize && (
            <div className="flex items-center justify-between text-xs text-[#B5C7C1] pt-2">
              <span>
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalProducts)} of {totalProducts}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 rounded bg-[#071B18] border border-[#315e53] disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page * pageSize >= totalProducts}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 rounded bg-[#071B18] border border-[#315e53] disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-cinema-red/40 bg-[#071B18] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Confirm Bulk Deletion</h3>
            <p className="mt-2 text-sm text-[#B5C7C1] leading-relaxed">
              Are you sure you want to delete <strong className="text-white">{selectedProductIds.size}</strong> selected products?
            </p>
            <p className="mt-3 text-xs text-amber-300/90 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 leading-relaxed">
              Products without existing customer orders will be permanently removed. Products referenced in customer orders will be safely archived to preserve customer order histories.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="rounded-lg border border-[#315e53] px-4 py-2 text-xs font-semibold text-[#B5C7C1] hover:bg-[#0B2420]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={async () => {
                  setBulkDeleting(true);
                  try {
                    await request('/api/admin/products/bulk-delete', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ ids: Array.from(selectedProductIds), permanent: true }),
                    });
                    setMessage(`Successfully processed ${selectedProductIds.size} products.`);
                    setSelectedProductIds(new Set());
                    setShowBulkDeleteConfirm(false);
                    await loadProducts();
                    void refreshStorefrontCatalogue();
                  } catch (err: any) {
                    setError(err.message || 'Failed to bulk delete products');
                  } finally {
                    setBulkDeleting(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cinema-red px-4 py-2 text-xs font-bold text-white hover:bg-cinema-red/90 disabled:opacity-50"
              >
                {bulkDeleting ? 'Deleting…' : 'Yes, Delete Selected'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORIES TAB */}
      {activeTab === 'categories' && (
        <div className="mt-5 space-y-4">
          <p className="text-xs text-[#B5C7C1]">
            Manage the 11 themed collections and storefront groupings. Cars & Bikes retains the internal ID <code className="text-[#A8F0DC]">quotes</code>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-[#315e53] bg-[#071B18] p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="size-4 rounded-full border border-black/30" style={{ backgroundColor: c.color || '#D90A1F' }} />
                      <h4 className="font-extrabold text-[#F4F0E8]">{c.name}</h4>
                    </div>
                    {c.archived && (
                      <span className="rounded bg-black/40 px-2 py-0.5 text-[9px] text-[#B5C7C1]">Archived</span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-[#B5C7C1] line-clamp-2">{c.blurb || 'No description'}</p>
                  <p className="mt-2 font-mono text-[10px] text-[#B5C7C1]">
                    ID: {c.id} {c.id === 'quotes' ? '★ (Cars & Bikes preserved)' : ''}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-[#315e53]/50 pt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => openEditCategory(c)}
                    className="text-[#A8F0DC] hover:underline"
                  >
                    Edit
                  </button>
                  {c.id !== 'quotes' && (
                    <button
                      type="button"
                      onClick={() => void toggleArchiveCategory(c)}
                      className="text-xs text-[#B5C7C1] hover:text-danger"
                    >
                      {c.archived ? 'Restore' : 'Archive'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Edit/Create Category Drawer */}
          {editingCategory !== null || catDraft.name !== '' ? (
            <form onSubmit={handleCategorySubmit} className="mt-6 rounded-xl border border-[#A8F0DC]/40 bg-[#071B18] p-4 space-y-3">
              <h3 className="font-bold text-sm text-[#A8F0DC]">
                {editingCategory ? `Edit Category: ${editingCategory.name}` : 'New Category'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs font-bold">
                  Name
                  <input
                    type="text"
                    required
                    value={catDraft.name}
                    onChange={(e) => setCatDraft((d) => ({ ...d, name: e.target.value }))}
                    className="field-input mt-1 w-full text-xs"
                  />
                </label>
                <label className="text-xs font-bold">
                  Card Color
                  <input
                    type="color"
                    value={catDraft.color}
                    onChange={(e) => setCatDraft((d) => ({ ...d, color: e.target.value }))}
                    className="mt-1 block h-9 w-full rounded border border-[#315e53] bg-[#0B2420] p-1"
                  />
                </label>
              </div>
              <label className="text-xs font-bold">
                Blurb
                <textarea
                  rows={2}
                  value={catDraft.blurb}
                  onChange={(e) => setCatDraft((d) => ({ ...d, blurb: e.target.value }))}
                  className="field-input mt-1 w-full text-xs"
                />
              </label>
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className="btn-primary text-xs py-1.5 px-4">
                  Save Category
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCategory(null);
                    setCatDraft({ id: '', name: '', blurb: '', color: '#D90A1F', motif: 'sparkle', displayOrder: 0 });
                  }}
                  className="btn-ghost text-xs py-1.5 px-3"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : null}
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-cinema-red/40 bg-[#071B18] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Confirm Bulk Deletion</h3>
            <p className="mt-2 text-sm text-[#B5C7C1] leading-relaxed">
              Are you sure you want to delete <strong className="text-white">{selectedProductIds.size}</strong> selected products?
            </p>
            <p className="mt-3 text-xs text-amber-300/90 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 leading-relaxed">
              Products without existing customer orders will be permanently removed. Products referenced in customer orders will be safely archived to preserve customer order histories.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="rounded-lg border border-[#315e53] px-4 py-2 text-xs font-semibold text-[#B5C7C1] hover:bg-[#0B2420]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={async () => {
                  setBulkDeleting(true);
                  try {
                    await request('/api/admin/products/bulk-delete', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ ids: Array.from(selectedProductIds), permanent: true }),
                    });
                    setMessage(`Successfully processed ${selectedProductIds.size} products.`);
                    setSelectedProductIds(new Set());
                    setShowBulkDeleteConfirm(false);
                    await loadProducts();
                    void refreshStorefrontCatalogue();
                  } catch (err: any) {
                    setError(err.message || 'Failed to bulk delete products');
                  } finally {
                    setBulkDeleting(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cinema-red px-4 py-2 text-xs font-bold text-white hover:bg-cinema-red/90 disabled:opacity-50"
              >
                {bulkDeleting ? 'Deleting…' : 'Yes, Delete Selected'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL PRODUCT ADD / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl border-2 border-[#315e53] bg-[#0B2420] p-6 text-[#F4F0E8] shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#315e53] pb-3">
              <h3 className="text-xl font-extrabold text-[#F4F0E8]">
                {editingId ? 'Edit Product' : 'Add New Product to Database'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-[#B5C7C1] hover:text-[#F4F0E8]"
              >
                <LuX className="size-5" />
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="mt-4 space-y-4 text-xs">
              {/* Type and Format */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="font-bold">
                  Product Type
                  <select
                    value={prodType}
                    onChange={(e) => {
                      const nextType = e.target.value as 'stickers' | 'posters';
                      setProdType(nextType);
                      setFormat(nextType === 'posters' ? 'poster' : 'single');
                      if (!editingId) {
                        if (nextType === 'posters') {
                          setPrice('90');
                          if (variants.length === 0) {
                            setVariants([
                              { id: 'a5', label: 'A5', price: 90 },
                              { id: 'a4', label: 'A4', price: 120 },
                              { id: 'a3', label: 'A3', price: 150 },
                            ]);
                          }
                        } else {
                          setPrice('20');
                          setVariants([]);
                        }
                      }
                    }}
                    className="field-input mt-1 w-full text-xs"
                  >
                    <option value="stickers">Stickers</option>
                    <option value="posters">Posters</option>
                  </select>
                </label>
                <label className="font-bold">
                  Format
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="field-input mt-1 w-full text-xs"
                  >
                    {prodType === 'stickers' ? (
                      <>
                        <option value="single">Single Mini Sticker</option>
                        <option value="sheet">Sticker Sheet</option>
                        <option value="pack">Sticker Pack</option>
                        <option value="mystery">Mystery Pack</option>
                        <option value="duo">Matching Duo</option>
                        <option value="secret">Secret Message</option>
                      </>
                    ) : (
                      <>
                        <option value="poster">Single Poster</option>
                        <option value="poster-set">Wall Pack & Set</option>
                        <option value="collage">Personalised Collage</option>
                      </>
                    )}
                  </select>
                </label>
              </div>

              {/* Name & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="font-bold">
                  Product Name
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!editingId) {
                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                      }
                    }}
                    placeholder="e.g. Chai & Samosa Duo"
                    className="field-input mt-1 w-full text-xs"
                  />
                </label>
                <label className="font-bold">
                  URL Slug
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="chai-samosa-duo"
                    className="field-input mt-1 w-full text-xs font-mono"
                  />
                </label>
              </div>

              {/* Price & Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="font-bold">
                  Base Price (₹)
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="field-input mt-1 w-full text-xs font-bold"
                  />
                </label>
                <label className="font-bold">
                  Stock Quantity
                  <input
                    type="number"
                    required
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="field-input mt-1 w-full text-xs"
                  />
                </label>
                <label className="font-bold">
                  Publication Status
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="field-input mt-1 w-full text-xs"
                  >
                    <option value="PUBLISHED">Published (Visible in shop)</option>
                    <option value="HIDDEN">Hidden (Draft / Unpublished)</option>
                  </select>
                </label>
              </div>

              {/* Description */}
              <label className="block font-bold">
                Description
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed customer description…"
                  className="field-input mt-1 w-full text-xs"
                />
              </label>

              {/* Collection Assignments (11 themed collections) */}
              <div>
                <span className="block font-bold mb-1.5">Assign Collections / Categories</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 bg-[#071B18] p-3 rounded-xl border border-[#315e53]">
                  {categories.filter((c) => c.id !== 'stickers' && c.id !== 'posters').map((c) => {
                    const checked = selectedCollections.includes(c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-2 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedCollections((prev) => [...prev, c.id]);
                            else setSelectedCollections((prev) => prev.filter((id) => id !== c.id));
                          }}
                          className="size-3.5 accent-[#D90A1F]"
                        />
                        <span className="truncate">{c.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Product Images Management */}
              <div className="rounded-xl border border-[#315e53] bg-[#071B18] p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#A8F0DC] flex items-center gap-1.5">
                    <LuImage className="size-4" /> Product Images ({images.length})
                  </span>
                  <label className="btn-ghost text-xs py-1 px-3 cursor-pointer">
                    {uploadingImage ? 'Uploading…' : '+ Upload Image'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      disabled={uploadingImage}
                      onChange={(e) => void handleImageUpload(e)}
                      className="sr-only"
                    />
                  </label>
                </div>

                {images.length === 0 ? (
                  <p className="text-ink-soft text-[11px]">No images uploaded yet. SVG artwork is rendered if no images exist.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative rounded-lg border border-[#315e53] bg-[#0B2420] p-2 flex flex-col gap-1.5">
                        <div className="relative h-28 w-full overflow-hidden rounded bg-black/40">
                          <img src={resolveImgUrl(img.url)} alt={img.alt} className="size-full object-contain" />
                          {img.isPrimary && (
                            <span className="absolute top-1 left-1 rounded bg-[#D90A1F] px-1.5 py-0.5 text-[9px] font-black text-white">
                              Primary
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="Alt text"
                          value={img.alt}
                          onChange={(e) => {
                            const val = e.target.value;
                            setImages((prev) => prev.map((im, i) => (i === idx ? { ...im, alt: val } : im)));
                          }}
                          className="field-input text-[11px] py-1"
                        />
                        <div className="flex items-center justify-between text-[10px]">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="primary-image"
                              checked={img.isPrimary}
                              onChange={() => {
                                setImages((prev) => prev.map((im, i) => ({ ...im, isPrimary: i === idx })));
                              }}
                              className="size-3 accent-[#D90A1F]"
                            />
                            <span>Set Primary</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-danger hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Poster Size Variants (if Poster or if user adds sizes) */}
              <div className="rounded-xl border border-[#315e53] bg-[#071B18] p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#A8F0DC]">Size Variants ({variants.length})</span>
                  <button
                    type="button"
                    onClick={() => {
                      const posterDefaults = [
                        { id: 'a5', label: 'A5', price: 90 },
                        { id: 'a4', label: 'A4', price: 120 },
                        { id: 'a3', label: 'A3', price: 150 },
                      ];
                      const next = posterDefaults[variants.length] ?? {
                        id: `var-${variants.length + 1}`,
                        label: `Size ${variants.length + 1}`,
                        price: Number(price) || 90,
                      };
                      setVariants((prev) => [...prev, next]);
                    }}
                    className="btn-ghost text-xs py-1 px-2.5"
                  >
                    + Add Size Variant
                  </button>
                </div>
                {variants.map((v, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="ID (e.g. a4)"
                      value={v.id}
                      onChange={(e) => {
                        const val = e.target.value;
                        setVariants((prev) => prev.map((item, i) => (i === idx ? { ...item, id: val } : item)));
                      }}
                      className="field-input w-20 text-xs py-1 font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Label (e.g. A4 Print)"
                      value={v.label}
                      onChange={(e) => {
                        const val = e.target.value;
                        setVariants((prev) => prev.map((item, i) => (i === idx ? { ...item, label: val } : item)));
                      }}
                      className="field-input flex-1 text-xs py-1"
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Price"
                      value={v.price}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setVariants((prev) => prev.map((item, i) => (i === idx ? { ...item, price: val } : item)));
                      }}
                      className="field-input w-24 text-xs py-1 font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setVariants((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-danger hover:underline p-1"
                    >
                      <LuTrash className="size-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Collectible specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label className="font-bold">
                  Series Code
                  <input
                    type="text"
                    value={seriesId}
                    onChange={(e) => setSeriesId(e.target.value)}
                    placeholder="S01"
                    className="field-input mt-1 w-full text-xs font-mono"
                  />
                </label>
                <label className="font-bold">
                  Rarity
                  <select
                    value={rarity}
                    onChange={(e) => setRarity(e.target.value)}
                    className="field-input mt-1 w-full text-xs capitalize"
                  >
                    <option value="common">Common</option>
                    <option value="uncommon">Uncommon</option>
                    <option value="rare">Rare</option>
                    <option value="epic">Epic</option>
                    <option value="legendary">Legendary</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 pt-6 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="size-4 accent-[#D90A1F]"
                  />
                  <span>Featured on Homepage</span>
                </label>
                <label className="flex items-center gap-2 pt-6 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={isNewItem}
                    onChange={(e) => setIsNewItem(e.target.checked)}
                    className="size-4 accent-[#D90A1F]"
                  />
                  <span>Mark as New</span>
                </label>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-[#315e53] pt-4">
                {editingId && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      const p = products.find((x) => x.id === editingId);
                      if (p) {
                        setModalOpen(false);
                        void handleDeleteProduct(p);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs font-bold text-danger hover:bg-danger/20 transition"
                  >
                    <LuTrash className="size-3.5" /> Delete Product
                  </button>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="btn-ghost text-xs py-2 px-4"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="btn-primary text-xs py-2 px-6"
                  >
                    {busy ? 'Saving to Database…' : editingId ? 'Update Product' : 'Create Product'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-cinema-red/40 bg-[#071B18] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Confirm Bulk Deletion</h3>
            <p className="mt-2 text-sm text-[#B5C7C1] leading-relaxed">
              Are you sure you want to delete <strong className="text-white">{selectedProductIds.size}</strong> selected products?
            </p>
            <p className="mt-3 text-xs text-amber-300/90 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 leading-relaxed">
              Products without existing customer orders will be permanently removed. Products referenced in customer orders will be safely archived to preserve customer order histories.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="rounded-lg border border-[#315e53] px-4 py-2 text-xs font-semibold text-[#B5C7C1] hover:bg-[#0B2420]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={async () => {
                  setBulkDeleting(true);
                  try {
                    await request('/api/admin/products/bulk-delete', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ ids: Array.from(selectedProductIds), permanent: true }),
                    });
                    setMessage(`Successfully processed ${selectedProductIds.size} products.`);
                    setSelectedProductIds(new Set());
                    setShowBulkDeleteConfirm(false);
                    await loadProducts();
                    void refreshStorefrontCatalogue();
                  } catch (err: any) {
                    setError(err.message || 'Failed to bulk delete products');
                  } finally {
                    setBulkDeleting(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cinema-red px-4 py-2 text-xs font-bold text-white hover:bg-cinema-red/90 disabled:opacity-50"
              >
                {bulkDeleting ? 'Deleting…' : 'Yes, Delete Selected'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Clickable Image Preview Modal */}
      {previewProduct && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPreviewProduct(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-2xl w-full rounded-2xl bg-[#0B2420] border-2 border-[#315e53] p-6 shadow-2xl text-[#F4F0E8] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewProduct(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#071B18] text-[#B5C7C1] hover:text-[#F4F0E8] transition"
              aria-label="Close image preview"
            >
              <LuX className="size-5" />
            </button>

            <div className="flex flex-col items-center">
              <div className="w-full max-h-[60vh] flex items-center justify-center rounded-xl bg-black/50 border border-[#315e53] p-4 overflow-hidden">
                {previewProduct.images?.[0] ? (
                  <img
                    src={resolveImgUrl(previewProduct.images.find((img) => img.isPrimary)?.url || previewProduct.images[0].url)}
                    alt={previewProduct.name}
                    className="max-h-[55vh] w-auto max-w-full object-contain rounded-lg drop-shadow-lg"
                  />
                ) : getProductById(previewProduct.id) ? (
                  <div className="size-72 overflow-hidden rounded-lg">
                    <ProductImage product={getProductById(previewProduct.id)!} className="size-full object-contain" />
                  </div>
                ) : (
                  <p className="text-sm text-[#B5C7C1]">No image available</p>
                )}
              </div>

              <div className="mt-4 w-full flex flex-wrap items-center justify-between gap-3 border-t border-[#315e53] pt-4">
                <div>
                  <h3 className="text-xl font-extrabold text-[#F4F0E8]">{previewProduct.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs text-[#B5C7C1]">{previewProduct.slug}</span>
                    <span className="text-xs text-mint font-bold">₹{previewProduct.price}</span>
                    <span className="capitalize text-xs text-[#B5C7C1]">({previewProduct.category || 'stickers'})</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`/product/${previewProduct.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost text-xs py-2 px-3 inline-flex items-center gap-1"
                  >
                    View on Store ↗
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      const p = previewProduct;
                      setPreviewProduct(null);
                      openEditModal(p);
                    }}
                    className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5"
                  >
                    <LuPencil className="size-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const p = previewProduct;
                      setPreviewProduct(null);
                      void handleDeleteProduct(p);
                    }}
                    className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs font-bold text-danger hover:bg-danger/20 transition inline-flex items-center gap-1.5"
                  >
                    <LuTrash className="size-3.5" /> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
