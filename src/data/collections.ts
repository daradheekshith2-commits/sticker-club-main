import type { CollectionId, MotifId, ProductType } from '../types/product';

/**
 * "Shop by vibe" collections. Rename, recolour or reorder them here.
 * `featured: true` puts a collection on the homepage.
 */
export interface Collection {
  id: CollectionId;
  name: string;
  blurb: string;
  color: string;
  motif: MotifId;
  featured: boolean;
  /** Shown wherever the collection is presented, e.g. a licensing disclaimer. */
  note?: string;
}

export const collections: Collection[] = [
  { id: 'anime', name: 'Anime', blurb: 'Anime-inspired art, expressive characters and collectible designs.', color: '#FFD447', motif: 'animeFace', featured: true },
  { id: 'movies', name: 'Movies', blurb: 'Cinematic vibes, iconic genres and movie-inspired art.', color: '#8FD3FF', motif: 'clapper', featured: true },
  { id: 'quotes', name: 'Cars & Bikes', blurb: 'Original cars, motorcycles, track-day graphics and racing-inspired designs.', color: '#FF5B2E', motif: 'car', featured: true },
  {
    id: 'marvel',
    name: 'Marvel',
    blurb: 'Superhero-inspired designs for fans of epic universes.',
    color: '#D4FF3A',
    motif: 'hero',
    featured: true,
  },
  { id: 'cute', name: 'Cute & Aesthetic', blurb: 'Soft colours, sleepy clouds, small joys.', color: '#FFB3D1', motif: 'cloud', featured: true },
  { id: 'gaming', name: 'Gaming-Inspired', blurb: 'Original pixel art and controller doodles.', color: '#8A6CFF', motif: 'pixelHeart', featured: false },
  { id: 'music', name: 'Music & Everyday', blurb: 'Headphones on, world off.', color: '#7FE0B5', motif: 'headphones', featured: false },
  { id: 'minimal', name: 'Minimal & Type', blurb: 'Clean icons that go with everything.', color: '#F5F0E6', motif: 'sparkle', featured: false },
  { id: 'motivation', name: 'Mood & Motivation', blurb: 'Tiny pep talks for your water bottle.', color: '#FFD447', motif: 'bolt', featured: false },
  { id: 'duos', name: 'Matching Duos', blurb: 'Coordinated sticker pairs, sold together as one product.', color: '#FF70A6', motif: 'sparkle', featured: false },
  { id: 'secret', name: 'Secret Messages', blurb: 'Message stickers with a sealed message card inside.', color: '#70D6FF', motif: 'envelope', featured: false },
  { id: 'devotion', name: 'Devotion', blurb: 'Spiritual art, divine serenity and sacred deities.', color: '#FFB347', motif: 'sparkle', featured: false },
  { id: 'sports', name: 'Sports', blurb: 'Athletic icons, championship spirit and legendary sports moments.', color: '#47A8FF', motif: 'bolt', featured: false },
];

/**
 * Old collection ids that were renamed. Old links like /shop?vibe=campus keep
 * working and open the collection that replaced it.
 */
export const collectionAliases: Record<string, CollectionId> = {
  campus: 'anime',
  tech: 'movies',
  desi: 'quotes',
  auto: 'marvel',
};

/** The current id for an id or an old alias, or undefined if unknown. */
export function resolveCollectionId(id: string): CollectionId | undefined {
  const real = collectionAliases[id] ?? id;
  return collections.some((c) => c.id === real) ? (real as CollectionId) : undefined;
}

export function getCollection(id: string | undefined): Collection | undefined {
  const real = id === undefined ? undefined : resolveCollectionId(id);
  return collections.find((c) => c.id === real);
}

/** Labels for each product format, used in filters, cards and breadcrumbs. */
export const productTypeLabels: Record<ProductType, { singular: string; plural: string }> = {
  single: { singular: 'Mini sticker', plural: 'Mini stickers' },
  sheet: { singular: 'Sticker sheet', plural: 'Sticker sheets' },
  pack: { singular: 'Sticker pack', plural: 'Sticker packs' },
  mystery: { singular: 'Mystery pack', plural: 'Mystery packs' },
  duo: { singular: 'Matching duo', plural: 'Matching duos' },
  secret: { singular: 'Secret message', plural: 'Secret message stickers' },
  poster: { singular: 'Poster', plural: 'Single posters' },
  'poster-set': { singular: 'Wall pack', plural: 'Wall packs & sets' },
  collage: { singular: 'Photo collage', plural: 'Photo collages' },
};

export const stickerTypes: ProductType[] = ['single', 'sheet', 'pack', 'mystery', 'duo', 'secret'];
export const posterTypes: ProductType[] = ['poster', 'poster-set', 'collage'];
