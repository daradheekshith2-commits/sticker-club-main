import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { products as seedProducts, posterSizes, POSTER_BASE_PRICE, formatPosterDescription } from '../data/products';
import type { Category, CollectionId, Product, ProductArt, ProductType, Variant } from '../types/product';
import { apiUrl } from './AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { subscribeToPopularityChanges } from '../utils/popularity';

export type BackendProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  shortDescription?: string;
  price: string;
  status: string; // 'PUBLISHED' | 'HIDDEN' | 'ARCHIVED'
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
  images?: Array<{ url: string; alt: string; position: number; isPrimary?: boolean }>;
  categories?: Array<{ categoryId: string; productId?: string }>;
  collections?: Array<{ collectionId?: string; categoryId?: string }>;
  tags?: Array<{ tag: string }>;
  metadata?: any;
};

export type CategoryItem = {
  id: string;
  name: string;
  blurb?: string;
  color?: string;
  motif?: string;
  featured?: boolean;
  displayOrder?: number;
  archived?: boolean;
};

interface CatalogueContextValue {
  products: Product[];
  categories: CategoryItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getProductBySlug: (slug: string) => Product | undefined;
  getProductById: (id: string) => Product | undefined;
  isPurchasable: (product: Product) => boolean;
}

export const CatalogueContext = createContext<CatalogueContextValue | null>(null);

function createFallbackArt(p: { name: string; category?: string; productType?: string }): ProductArt {
  if (p.category === 'posters') {
    return {
      kind: 'poster',
      backdrop: '#071B18',
      poster: {
        title: p.name,
        bg: '#0B2420',
        fg: '#F4F0E8',
        accent: '#D90A1F',
      },
    };
  }
  if (p.productType === 'duo') {
    return {
      kind: 'duo',
      backdrop: '#071B18',
      pairing: 'complementary',
      designs: [
        {
          name: p.name + ' Part A',
          shape: 'rounded',
          bg: '#0B2420',
          fg: '#F4F0E8',
          accent: '#D90A1F',
          label: p.name.length > 10 ? p.name.slice(0, 8) + '… A' : p.name + ' A',
        },
        {
          name: p.name + ' Part B',
          shape: 'rounded',
          bg: '#0B2420',
          fg: '#F4F0E8',
          accent: '#A8F0DC',
          label: p.name.length > 10 ? p.name.slice(0, 8) + '… B' : p.name + ' B',
        },
      ],
    };
  }
  return {
    kind: 'single',
    backdrop: '#071B18',
    design: {
      name: p.name,
      shape: 'rounded',
      bg: '#0B2420',
      fg: '#F4F0E8',
      accent: '#D90A1F',
      label: p.name.length > 14 ? p.name.slice(0, 12) + '…' : p.name,
    },
  };
}

function processDatabaseProducts(seeds: Product[], dbProducts: BackendProduct[]): Product[] {
  const seedById = new Map(seeds.map((p) => [p.id, p]));
  const seedBySlug = new Map(seeds.map((p) => [p.slug, p]));

  const result: Product[] = [];

  for (const dbP of dbProducts) {
    if (dbP.status === 'ARCHIVED') continue;

    const seed = seedById.get(dbP.id) ?? seedBySlug.get(dbP.slug);
    const isPoster = dbP.category === 'posters' || dbP.productType === 'poster' || seed?.category === 'posters' || seed?.productType === 'poster';
    const dbPrice = Number(dbP.price);
    const price = isPoster ? POSTER_BASE_PRICE : (!isNaN(dbPrice) && dbPrice >= 0 ? dbPrice : (seed?.price ?? 0));

    const variants: Variant[] | undefined = isPoster
      ? posterSizes
      : (dbP.variants?.length
          ? dbP.variants.map((v) => ({
              id: v.id,
              label: v.label,
              price: Number(v.price),
              detail: v.detail,
            }))
          : seed?.variants);

    const description = isPoster
      ? formatPosterDescription(dbP.description || seed?.description)
      : (dbP.description || seed?.description || '');

    const dimensions = isPoster
      ? (dbP.dimensions || seed?.dimensions || 'A4 (21 × 29.7 cm)')
      : (dbP.dimensions || seed?.dimensions);

    const material = isPoster
      ? (dbP.material || seed?.material || '300 GSM Archival Matte Cardstock')
      : (dbP.material || seed?.material);

    const finish = isPoster
      ? (dbP.finish || seed?.finish || 'Matte Finish')
      : (dbP.finish || seed?.finish);

    const images = dbP.images?.length
      ? [...dbP.images]
          .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0) || a.position - b.position)
          .map((img) => {
            const raw = img.url || (img as any).src || '';
            const src = raw.startsWith('http') || !apiUrl ? raw : `${apiUrl}${raw.startsWith('/') ? '' : '/'}${raw}`;
            return {
              src,
              alt: img.alt || dbP.name,
            };
          })
      : seed?.images;

    const rawCats = dbP.categories || dbP.collections || [];
    const collections = rawCats.length
      ? (rawCats
          .map((c: any) => c.categoryId || c.collectionId)
          .filter((cid: string) => cid && cid !== 'stickers' && cid !== 'posters') as CollectionId[])
      : (seed?.collections ?? []);

    const tags = dbP.tags?.length
      ? dbP.tags.map((t) => t.tag)
      : (seed?.tags ?? []);

    const isActive = dbP.active !== false && dbP.status === 'PUBLISHED';
    const status = isActive ? ('demo' as const) : ('coming-soon' as const);

    if (seed) {
      result.push({
        ...seed,
        name: dbP.name || seed.name,
        slug: dbP.slug || seed.slug,
        description,
        shortDescription: dbP.shortDescription || seed.shortDescription,
        price,
        category: ((dbP.category as Category) || seed.category),
        productType: ((dbP.productType as ProductType) || seed.productType),
        collections,
        tags,
        images,
        variants,
        active: isActive,
        status,
        featured: dbP.featured !== undefined ? dbP.featured : seed.featured,
        isNew: dbP.isNew !== undefined ? dbP.isNew : seed.isNew,
        displayOrder: dbP.displayOrder !== undefined ? dbP.displayOrder : seed.displayOrder,
        packQuantity: dbP.packQuantity ?? seed.packQuantity,
        dimensions,
        material,
        finish,
        note: dbP.note || seed.note,
        rarity: (dbP.rarity as any) || seed.rarity,
        seriesId: dbP.seriesId || seed.seriesId,
        inventory: dbP.inventory ?? seed.inventory ?? null,
        duo: dbP.metadata?.duo || seed.duo,
        messageCardId: dbP.metadata?.messageCardId || seed.messageCardId,
        messageCardCount: dbP.metadata?.messageCardCount || seed.messageCardCount,
      });
    } else {
      // Completely new product created via Admin Panel
      result.push({
        id: dbP.id,
        slug: dbP.slug,
        name: dbP.name,
        shortDescription: dbP.shortDescription || dbP.description?.slice(0, 120) || dbP.name,
        description,
        price,
        variants,
        category: ((dbP.category as Category) || (isPoster ? 'posters' : 'stickers')),
        productType: ((dbP.productType as ProductType) || (isPoster ? 'poster' : 'single')),
        collections,
        tags,
        art: createFallbackArt(dbP),
        images: images || [],
        featured: Boolean(dbP.featured),
        isNew: Boolean(dbP.isNew),
        displayOrder: dbP.displayOrder ?? 100,
        status,
        active: isActive,
        inventory: dbP.inventory ?? null,
        packQuantity: dbP.packQuantity,
        dimensions,
        material,
        finish,
        note: dbP.note,
        rarity: (dbP.rarity as any) || 'common',
        seriesId: dbP.seriesId,
        duo: dbP.metadata?.duo,
        messageCardId: dbP.metadata?.messageCardId,
        messageCardCount: dbP.metadata?.messageCardCount,
      });
    }
  }

  return result;
}

const CACHE_KEY_PRODUCTS = 'sc_catalogue_products_v3';
const CACHE_KEY_CATEGORIES = 'sc_catalogue_categories_v3';

// Clear stale session cache
try {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    window.sessionStorage.removeItem('sc_catalogue_products_v2');
    window.sessionStorage.removeItem('sc_catalogue_categories_v2');
    window.sessionStorage.removeItem('sc_catalogue_products_v1');
    window.sessionStorage.removeItem('sc_catalogue_categories_v1');
  }
} catch {}

export function CatalogueProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const cached = typeof window !== 'undefined' ? window.sessionStorage?.getItem(CACHE_KEY_PRODUCTS) : null;
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    try {
      const cached = typeof window !== 'undefined' ? window.sessionStorage?.getItem(CACHE_KEY_CATEGORIES) : null;
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && !window.sessionStorage?.getItem(CACHE_KEY_PRODUCTS);
    } catch {
      return true;
    }
  });
  const [error, setError] = useState<string | null>(null);
  const [, setPopularityTick] = useState(0);

  useEffect(() => {
    return subscribeToPopularityChanges(() => setPopularityTick((t) => t + 1));
  }, []);

  // Background fetch from Supabase with a strict timeout so network stalls never freeze the UI
  async function fetchSupabaseLive(timeoutMs = 6000): Promise<{ products: BackendProduct[]; categories: CategoryItem[] } | null> {
    if (!isSupabaseConfigured) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      let allProducts: any[] = [];
      let from = 0;
      const step = 1000;

      while (true) {
        if (controller.signal.aborted) throw new Error('Supabase fetch timed out');
        const { data: chunk, error: supaErr } = await supabase
          .from('Product')
          .select('*, inventory:Inventory(quantity), images:ProductImage(*), categories:ProductCategory(*), variants:ProductVariant(*)')
          .range(from, from + step - 1);

        if (supaErr) throw supaErr;
        if (!chunk || chunk.length === 0) break;
        allProducts = allProducts.concat(chunk);
        if (chunk.length < step) break;
        from += step;
      }

      const { data: supaCats } = await supabase.from('Category').select('*').order('displayOrder', { ascending: true });
      clearTimeout(timer);

      if (allProducts.length > 0) {
        return { products: allProducts, categories: supaCats || [] };
      }
      return null;
    } catch (err) {
      clearTimeout(timer);
      console.warn('Background Supabase catalogue sync notice:', err instanceof Error ? err.message : err);
      return null;
    }
  }

  async function fetchCatalogue(forceRefresh = false) {
    try {
      setError(null);

      // If we already have products in memory and it's not a forced refresh, don't show loading spinner
      if (products.length > 0 && !forceRefresh) {
        setLoading(false);
      }

      let loaded = false;

      // 1. Fast path: load local static catalogue immediately if not already populated or if forced
      const baseUrl = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL ? import.meta.env.BASE_URL.replace(/\/$/, '') + '/' : '/';
      if (products.length === 0 || forceRefresh) {
        try {
          const [staticRes, staticCatsRes] = await Promise.all([
            fetch(`${baseUrl}products-catalogue.json`).catch(() => null),
            fetch(`${baseUrl}categories-catalogue.json`).catch(() => null),
          ]);

          if (staticRes && staticRes.ok) {
            const staticProducts: BackendProduct[] = await staticRes.json();
            const processed = processDatabaseProducts(seedProducts, staticProducts);
            setProducts(processed);
            setLoading(false);
            loaded = true;

            try {
              window.sessionStorage?.setItem(CACHE_KEY_PRODUCTS, JSON.stringify(processed));
            } catch {}

            if (staticCatsRes && staticCatsRes.ok) {
              const cats = await staticCatsRes.json();
              setCategories(cats);
              try {
                window.sessionStorage?.setItem(CACHE_KEY_CATEGORIES, JSON.stringify(cats));
              } catch {}
            }
          }
        } catch {
          // ignore and proceed to live fetch
        }
      } else {
        // Background check: re-fetch static catalogue to update cache seamlessly if catalogue expanded
        fetch(`${baseUrl}products-catalogue.json`)
          .then((r) => (r.ok ? r.json() : null))
          .then((staticProducts: BackendProduct[] | null) => {
            if (staticProducts && staticProducts.length !== products.length) {
              const processed = processDatabaseProducts(seedProducts, staticProducts);
              setProducts(processed);
              try {
                window.sessionStorage?.setItem(CACHE_KEY_PRODUCTS, JSON.stringify(processed));
              } catch {}
            }
          })
          .catch(() => {});
      }

      // 2. If API configured (e.g. local backend), try background update
      if (apiUrl) {
        try {
          const [prodRes, catRes] = await Promise.all([
            fetch((apiUrl || '') + '/api/products', { credentials: 'include', signal: AbortSignal.timeout(4000) }).catch(() => null),
            fetch((apiUrl || '') + '/api/categories', { credentials: 'include', signal: AbortSignal.timeout(4000) }).catch(() => null),
          ]);

          if (prodRes && prodRes.ok) {
            const dbProducts: BackendProduct[] = await prodRes.json();
            const processed = processDatabaseProducts(seedProducts, dbProducts);
            setProducts(processed);
            setLoading(false);
            loaded = true;
            try {
              window.sessionStorage?.setItem(CACHE_KEY_PRODUCTS, JSON.stringify(processed));
            } catch {}

            if (catRes && catRes.ok) {
              const dbCategories: CategoryItem[] = await catRes.json();
              setCategories(dbCategories);
              try {
                window.sessionStorage?.setItem(CACHE_KEY_CATEGORIES, JSON.stringify(dbCategories));
              } catch {}
            }
            return;
          }
        } catch {
          // Fall through to Supabase
        }
      }

      // 3. Live Supabase sync (runs in background without freezing UI)
      if (isSupabaseConfigured) {
        const liveData = await fetchSupabaseLive(forceRefresh ? 12000 : 6000);
        if (liveData && liveData.products.length > 0) {
          const processed = processDatabaseProducts(seedProducts, liveData.products);
          setProducts(processed);
          setLoading(false);
          loaded = true;
          try {
            window.sessionStorage?.setItem(CACHE_KEY_PRODUCTS, JSON.stringify(processed));
          } catch {}

          if (liveData.categories.length > 0) {
            setCategories(liveData.categories);
            try {
              window.sessionStorage?.setItem(CACHE_KEY_CATEGORIES, JSON.stringify(liveData.categories));
            } catch {}
          }
        }
      }

      if (!loaded && products.length === 0) {
        throw new Error('Failed to load catalogue');
      }
    } catch (e) {
      console.warn('CatalogueProvider: catalogue fetch failed.', e);
      if (products.length === 0) {
        setError(e instanceof Error ? e.message : 'Could not fetch database catalogue');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchCatalogue();
  }, []);

  // Precompute O(1) lookup tables for slug and id lookups across the storefront
  const productBySlug = useMemo(() => new Map(products.map((p) => [p.slug, p])), [products]);
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const getProductBySlug = useCallback((slug: string): Product | undefined => {
    return productBySlug.get(slug);
  }, [productBySlug]);

  const getProductById = useCallback((id: string): Product | undefined => {
    return productById.get(id);
  }, [productById]);

  const isPurchasable = useCallback((product: Product): boolean => {
    if (product.active === false) return false;
    if (product.status !== 'demo' && (product.status as string) !== 'PUBLISHED') return false;
    if (product.inventory && product.inventory.quantity <= 0) return false;
    return true;
  }, []);

  const value = useMemo(
    () => ({
      products,
      categories,
      loading,
      error,
      refresh: fetchCatalogue,
      getProductBySlug,
      getProductById,
      isPurchasable,
    }),
    [products, categories, loading, error, getProductBySlug, getProductById, isPurchasable]
  );

  return (
    <CatalogueContext.Provider value={value}>
      {children}
    </CatalogueContext.Provider>
  );
}

export function useCatalogue(): CatalogueContextValue {
  const ctx = useContext(CatalogueContext);
  if (!ctx) {
    throw new Error('useCatalogue must be used within a CatalogueProvider');
  }
  return ctx;
}
