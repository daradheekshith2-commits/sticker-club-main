import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { products as seedProducts } from '../data/products';
import type { Category, CollectionId, Product, ProductArt, ProductType, Variant } from '../types/product';
import { apiUrl } from './AuthContext';

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

const CatalogueContext = createContext<CatalogueContextValue | null>(null);

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
    const dbPrice = Number(dbP.price);
    const price = !isNaN(dbPrice) && dbPrice >= 0 ? dbPrice : (seed?.price ?? 0);

    const variants: Variant[] | undefined = dbP.variants?.length
      ? dbP.variants.map((v) => ({
          id: v.id,
          label: v.label,
          price: Number(v.price),
          detail: v.detail,
        }))
      : seed?.variants;

    const images = dbP.images?.length
      ? [...dbP.images]
          .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0) || a.position - b.position)
          .map((img) => {
            const raw = img.url;
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
        description: dbP.description || seed.description,
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
        dimensions: dbP.dimensions || seed.dimensions,
        material: dbP.material || seed.material,
        finish: dbP.finish || seed.finish,
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
        description: dbP.description || '',
        price,
        variants,
        category: ((dbP.category as Category) || 'stickers'),
        productType: ((dbP.productType as ProductType) || 'single'),
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
        dimensions: dbP.dimensions,
        material: dbP.material,
        finish: dbP.finish,
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

export function CatalogueProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchCatalogue() {
    try {
      setError(null);
      let dbProducts: BackendProduct[] | null = null;
      let dbCategories: CategoryItem[] | null = null;

      // 1. If apiUrl is set (or in local dev), attempt live API fetch
      const endpoint = apiUrl ? `${apiUrl}/api/products` : '/api/products';
      try {
        const prodRes = await fetch(endpoint, { credentials: 'include' });
        const contentType = prodRes.headers.get('content-type') || '';
        if (prodRes.ok && contentType.includes('application/json')) {
          dbProducts = await prodRes.json();
          const catRes = await fetch(apiUrl ? `${apiUrl}/api/categories` : '/api/categories', { credentials: 'include' }).catch(() => null);
          if (catRes && catRes.ok && (catRes.headers.get('content-type') || '').includes('application/json')) {
            dbCategories = await catRes.json();
          }
        }
      } catch (err) {
        console.warn('Live API unavailable, trying static catalogue fallback:', err);
      }

      // 2. If live API returned null or was not JSON (e.g. Vercel deployment), load static catalogue
      if (!dbProducts) {
        try {
          const staticRes = await fetch('/products-catalogue.json');
          if (staticRes.ok) {
            dbProducts = await staticRes.json();
          }
          const staticCatRes = await fetch('/categories-catalogue.json').catch(() => null);
          if (staticCatRes && staticCatRes.ok) {
            dbCategories = await staticCatRes.json();
          }
        } catch (staticErr) {
          console.warn('Static catalogue fetch failed:', staticErr);
        }
      }

      if (dbProducts && Array.isArray(dbProducts) && dbProducts.length > 0) {
        setProducts(processDatabaseProducts(seedProducts, dbProducts));
        if (dbCategories) {
          setCategories(dbCategories);
        }
      } else {
        setProducts(seedProducts);
      }
    } catch (e) {
      console.warn('CatalogueProvider: catalogue load error.', e);
      setError(e instanceof Error ? e.message : 'Could not fetch catalogue');
      setProducts(seedProducts);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchCatalogue();
  }, []);

  function getProductBySlug(slug: string): Product | undefined {
    return products.find((p) => p.slug === slug);
  }

  function getProductById(id: string): Product | undefined {
    return products.find((p) => p.id === id);
  }

  function isPurchasable(product: Product): boolean {
    if (product.active === false) return false;
    if (product.status !== 'demo') return false;
    if (product.inventory && product.inventory.quantity <= 0) return false;
    return true;
  }

  return (
    <CatalogueContext.Provider
      value={{
        products,
        categories,
        loading,
        error,
        refresh: fetchCatalogue,
        getProductBySlug,
        getProductById,
        isPurchasable,
      }}
    >
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
