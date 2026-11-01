/**
 * CUSTOM WALL LOGIC — pricing and builder state (pure functions, unit-tested).
 *
 * PRICING RULE (prototype): a wall costs the sum of its posters' single prices,
 * taken from `posterSizes` in src/data/products.ts. There is no bundle
 * discount. If you introduce one later, change `wallPrice` only.
 */
import { posterSizes } from '../data/products';
import { getLayout, paperSizes, type PaperSizeId, type WallLayout } from '../data/wallLayouts';
import type { Product } from '../types/product';
import { defaultFit, isUserImage, type CustomWallConfig, type ImageFit, type SlotFill } from '../types/wall';

// ---------- Pricing ----------

/** Current (test) price of one poster in this size. */
export function sizePrice(size: PaperSizeId): number {
  const variant = posterSizes.find((v) => v.id === size);
  if (!variant) throw new Error(`No price configured for poster size "${size}"`);
  return variant.price;
}

/** Total for a layout = every slot's size price added together. */
export function wallPrice(layout: WallLayout): number {
  return layout.slots.reduce((sum, slot) => sum + sizePrice(slot.size), 0);
}

/** Price breakdown per size, e.g. [{ label: 'A5', count: 4, unit: 59, total: 236 }]. */
export function priceBreakdown(layout: WallLayout) {
  return (['a3', 'a4', 'a5'] as PaperSizeId[])
    .map((size) => {
      const count = layout.slots.filter((s) => s.size === size).length;
      return { size, label: paperSizes[size].label, count, unit: sizePrice(size), total: count * sizePrice(size) };
    })
    .filter((row) => row.count > 0);
}

/**
 * For a ready-made pack with a layout: how much less it costs than buying the
 * same prints as singles, using our own current prices. Null when it isn't cheaper.
 */
export function packSavings(product: Product): { singlesTotal: number; saving: number } | null {
  const layout = product.wallLayoutId ? getLayout(product.wallLayoutId) : undefined;
  if (!layout) return null;
  const singlesTotal = wallPrice(layout);
  const saving = singlesTotal - product.price;
  return saving > 0 ? { singlesTotal, saving } : null;
}

// ---------- Image quality hint ----------

/**
 * Minimum pixels we'd want on the short side for a poster of this size.
 * Based on ~100 pixels per inch — a deliberately lenient bar. Passing it does
 * NOT mean the print will look sharp; failing it means it very likely won't.
 */
export function minShortSidePixels(size: PaperSizeId): number {
  return Math.round((paperSizes[size].w / 2.54) * 100);
}

export function isLowResolution(width: number | undefined, height: number | undefined, size: PaperSizeId): boolean {
  if (!width || !height) return false; // unknown → don't guess
  return Math.min(width, height) < minShortSidePixels(size);
}

// ---------- Builder state ----------

export interface BuilderState {
  layoutId: string;
  /** One entry per slot, in slot order. null = empty. */
  fills: (SlotFill | null)[];
  /** Index of the slot being edited. */
  selected: number;
  /** Message about the last layout change, e.g. which images were removed. */
  notice: string | null;
}

export type BuilderAction =
  | { type: 'chooseLayout'; layoutId: string }
  | { type: 'select'; index: number }
  | { type: 'setFill'; index: number; fill: SlotFill }
  | { type: 'clearFill'; index: number }
  | { type: 'setFit'; index: number; fit: ImageFit }
  | { type: 'reset'; layoutId?: string };

export function initialBuilderState(layoutId: string): BuilderState {
  const layout = getLayout(layoutId);
  return { layoutId, fills: Array(layout?.slots.length ?? 0).fill(null), selected: 0, notice: null };
}

/** Fills that would be lost when switching to a layout with `newCount` slots. */
export function fillsDroppedBySwitch(state: BuilderState, newCount: number): SlotFill[] {
  return state.fills.slice(newCount).filter((f): f is SlotFill => f !== null);
}

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'chooseLayout': {
      const layout = getLayout(action.layoutId);
      if (!layout || action.layoutId === state.layoutId) return state;
      const count = layout.slots.length;
      // Keep images in order: position 1 stays position 1, and so on.
      const fills = Array.from({ length: count }, (_, i) => state.fills[i] ?? null);
      const dropped = fillsDroppedBySwitch(state, count).length;
      const added = Math.max(0, count - state.fills.length);
      const parts: string[] = [];
      if (dropped) parts.push(`${dropped} ${dropped === 1 ? 'image was' : 'images were'} removed because this layout has only ${count} positions`);
      if (added && state.fills.some(Boolean)) parts.push(`${added} new empty ${added === 1 ? 'position' : 'positions'} added`);
      return {
        layoutId: action.layoutId,
        fills,
        selected: Math.min(state.selected, count - 1),
        notice: parts.length ? `${parts.join('; ')}. Your other images kept their positions — sizes follow the new layout.` : null,
      };
    }
    case 'select':
      return { ...state, selected: Math.max(0, Math.min(action.index, state.fills.length - 1)) };
    case 'setFill': {
      const fills = [...state.fills];
      fills[action.index] = action.fill;
      return { ...state, fills, notice: null };
    }
    case 'clearFill': {
      const fills = [...state.fills];
      fills[action.index] = null;
      return { ...state, fills };
    }
    case 'setFit': {
      const current = state.fills[action.index];
      if (!isUserImage(current)) return state;
      const fills = [...state.fills];
      fills[action.index] = { ...current, fit: action.fit };
      return { ...state, fills };
    }
    case 'reset':
      return initialBuilderState(action.layoutId ?? state.layoutId);
    default:
      return state;
  }
}

export const filledCount = (state: BuilderState) => state.fills.filter(Boolean).length;
export const isComplete = (state: BuilderState) => state.fills.length > 0 && state.fills.every(Boolean);
export const usesOwnImages = (state: BuilderState) => state.fills.some(isUserImage);

/** Snapshot the builder as a cart configuration. Throws if the wall isn't complete. */
export function toWallConfig(state: BuilderState, rightsConfirmed: boolean): CustomWallConfig {
  const layout = getLayout(state.layoutId);
  if (!layout) throw new Error('Unknown layout');
  if (!isComplete(state)) throw new Error('Every position needs an image first');
  if (usesOwnImages(state) && !rightsConfirmed) throw new Error('Image rights must be confirmed');
  return {
    layoutId: layout.id,
    layoutName: layout.name,
    slots: layout.slots.map((slot, i) => ({ slotId: slot.id, size: slot.size, fill: state.fills[i]! })),
    priceAtAdd: wallPrice(layout),
    rightsConfirmed,
  };
}

/** A fresh fit object (so slots never share one by reference). */
export const newFit = (): ImageFit => ({ ...defaultFit });
