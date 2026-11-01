/**
 * CUSTOM WALL TYPES
 * What can go into one poster slot, and what a configured wall looks like
 * when it is saved as a cart line.
 */
import type { PosterDesign } from './product';
import type { PaperSizeId } from '../data/wallLayouts';

/** How a user image sits inside its slot. Affects the preview (object-fit / object-position). */
export interface ImageFit {
  mode: 'cover' | 'contain';
  /** Focal point for 'cover', 0–100 (%). 50/50 = centred. */
  focusX: number;
  focusY: number;
}

export const defaultFit: ImageFit = { mode: 'cover', focusX: 50, focusY: 50 };

/** One of our catalogue poster designs. */
export interface CatalogueFill {
  source: 'catalogue';
  productId: string;
}

/** A file the customer chose from their device (kept in memory only). */
export interface UploadFill {
  source: 'upload';
  /** Temporary blob: URL. Lost on page refresh. */
  objectUrl: string;
  fileName: string;
  width?: number;
  height?: number;
  fit: ImageFit;
}

/** A direct image link the customer pasted. */
export interface UrlFill {
  source: 'url';
  url: string;
  width?: number;
  height?: number;
  fit: ImageFit;
}

export type SlotFill = CatalogueFill | UploadFill | UrlFill;
export type UserImageFill = UploadFill | UrlFill;

/** Only used for previews of ready-made packs, which hold designs rather than products. */
export interface DesignFill {
  source: 'design';
  design: PosterDesign;
}

export type DisplayFill = SlotFill | DesignFill;

export function isUserImage(fill: DisplayFill | null | undefined): fill is UserImageFill {
  return fill?.source === 'upload' || fill?.source === 'url';
}

/** A finished wall, as stored in the cart. Snapshot of the builder at "Add to cart". */
export interface CustomWallConfig {
  layoutId: string;
  layoutName: string;
  slots: { slotId: string; size: PaperSizeId; fill: SlotFill }[];
  /** Price when added — informational; cart totals are recalculated from current price data. */
  priceAtAdd: number;
  /** True when the customer confirmed they may reproduce their own images. */
  rightsConfirmed: boolean;
}
