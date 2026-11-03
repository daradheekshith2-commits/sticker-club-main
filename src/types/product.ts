import type { DuoPairing, EditionInfo, MysteryConfig, RarityId } from './collectible';

/**
 * PRODUCT TYPES
 * These describe the shape of every product in the catalogue. TypeScript uses
 * them to warn you if a product is missing a field or has a typo.
 */

/** Top-level split: the two main product lines, with equal weight. */
export type Category = 'stickers' | 'posters';

/** The physical format a customer is buying. */
export type ProductType =
  | 'single'     // one mini sticker
  | 'sheet'      // a sheet with several kiss-cut stickers
  | 'pack'       // a curated bundle of separate stickers
  | 'mystery'    // 5 guaranteed stickers + 1 mystery sticker
  | 'duo'        // two coordinated stickers sold as one product
  | 'secret'     // a message sticker with a sealed message card
  | 'poster'     // a single print (future)
  | 'poster-set' // several prints sold together (future)
  | 'collage';   // personalised photo collage (future)

/** Interest-based groupings used for "Shop by vibe". */
export type CollectionId =
  | 'anime'
  | 'movies'
  | 'quotes'
  | 'marvel'
  | 'cute'
  | 'gaming'
  | 'music'
  | 'minimal'
  | 'motivation'
  | 'duos'
  | 'secret'
  | (string & {});

/**
 * Availability while we're a prototype.
 * - 'demo': shown with demo artwork, can be added to the cart to test the flow.
 * - 'coming-soon': visible but not purchasable (e.g. posters).
 */
export type ProductStatus = 'demo' | 'coming-soon';

// ---------- Artwork descriptions (drawn as SVG until real photos exist) ----------

export type MotifId =
  | 'chai' | 'code' | 'bug' | 'books' | 'clock' | 'moon'
  | 'car' | 'helmet' | 'flag' | 'pixelHeart' | 'controller'
  | 'cloud' | 'cat' | 'cassette' | 'headphones' | 'sparkle'
  | 'smiley' | 'bolt' | 'samosa' | 'question'
  | 'catNap' | 'plug' | 'socket' | 'loading' | 'battery' | 'envelope'
  | 'animeFace' | 'ramen' | 'speedStar' | 'clapper' | 'ticket' | 'popcorn' | 'quoteMarks' | 'hero' | 'emblem';

export type StickerShape = 'circle' | 'rounded' | 'blob' | 'pill' | 'badge';

/** One sticker design: a motif (icon) and/or a short text label on a shape. */
export interface StickerDesign {
  /** Human name, also used as the pack-contents line. */
  name: string;
  motif?: MotifId;
  /** Use '\n' for a line break. */
  label?: string;
  shape: StickerShape;
  bg: string;
  fg: string;
  accent: string;
}

export interface PosterDesign {
  title: string;
  bg: string;
  fg: string;
  accent: string;
  motif?: MotifId;
  /** Optional background decoration so posters don't all look alike. */
  pattern?: 'dots' | 'stripes' | 'sun' | 'grid';
}

/**
 * A purchasable option of a product — for posters, a paper size.
 * Each variant has its own price. Products without variants use `price`.
 */
export interface Variant {
  /** Stable ID, unique within the product, e.g. 'a4'. Stored in carts. */
  id: string;
  /** Shown to customers, e.g. 'A4'. */
  label: string;
  price: number;
  /** Optional extra detail, e.g. '21 × 29.7 cm'. */
  detail?: string;
}

/** Describes how to draw the product image. Each `kind` matches a product format. */
export type ProductArt =
  | { kind: 'single'; backdrop: string; design: StickerDesign }
  | { kind: 'sheet'; backdrop: string; designs: StickerDesign[] }
  | { kind: 'pack'; backdrop: string; card: string; designs: StickerDesign[] }
  | { kind: 'mystery'; backdrop: string; card: string; peek: StickerDesign[]; themeName?: string; themeCode?: string }
  /** Two stickers; for 'halves' the first design is drawn once and split down the middle. */
  | { kind: 'duo'; backdrop: string; designs: [StickerDesign, StickerDesign]; pairing: DuoPairing }
  | { kind: 'secret'; backdrop: string; design: StickerDesign; envelope: string }
  | { kind: 'secret-pack'; backdrop: string; designs: StickerDesign[]; envelope: string }
  | { kind: 'poster'; backdrop: string; poster: PosterDesign }
  | { kind: 'poster-set'; backdrop: string; posters: PosterDesign[] }
  | { kind: 'collage'; backdrop: string };

/** Real photos, once you have them. When present they replace the SVG artwork. */
export interface ProductImage {
  src: string; // e.g. '/products/chai-first-1.jpg' (put files in /public/products)
  alt: string;
}

export interface Product {
  /** Stable ID. Never change it once real orders reference it. */
  id: string;
  /** Used in the URL: /product/<slug> */
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  /**
   * Price in whole rupees. For products with `variants`, this must equal the
   * cheapest variant's price (it's shown as "From ₹…"); a test checks this.
   */
  price: number;
  /** Options with their own price (poster sizes, mystery-pack themes). Leave out for single-option products. */
  variants?: Variant[];
  /** What the variants are, for labels. Defaults to 'Size'. */
  variantLabel?: 'Size' | 'Theme';
  /**
   * For wall packs: the arrangement id in src/data/wallLayouts.ts. The layout
   * defines how many prints and which sizes the pack contains.
   */
  wallLayoutId?: string;
  category: Category;
  productType: ProductType;
  collections: CollectionId[];
  tags: string[];
  art: ProductArt;
  images?: ProductImage[];
  imageUrl?: string;
  featured: boolean;
  isNew: boolean;
  /** Lower numbers appear first in "Featured" sort. */
  displayOrder: number;
  status: ProductStatus;
  active?: boolean;
  inventory?: { quantity: number } | null;
  /**
   * Number of stickers/prints in the product. Only needed when it can't be
   * worked out from the artwork (e.g. a mystery pack).
   */
  packQuantity?: number;
  /** Optional specs: leave undefined until confirmed with a supplier. */
  dimensions?: string;
  material?: string;
  finish?: string;
  /** Extra note shown on the product page (e.g. "Concept product"). */
  note?: string;

  // ----- Collectible metadata (see src/data/rarity.ts). Demo classification for now. -----
  rarity?: RarityId;
  /** Series code from src/data/rarity.ts, e.g. 'S01'. */
  seriesId?: string;
  /** Only for limited editions. Numbers are shown only once confirmed. */
  edition?: EditionInfo;
  /** Mystery packs: what's guaranteed and what's a surprise. */
  mystery?: MysteryConfig;
  /** Matching Duos: what the pair is and how it fits together. */
  duo?: { pairing: DuoPairing; pairNote: string; partA: string; partB: string };
  /** Secret Message products: which message-card series is sealed inside (src/data/messageCards.ts). */
  messageCardId?: string;
  /** How many sealed message cards come with the product. */
  messageCardCount?: number;
}
