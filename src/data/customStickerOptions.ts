/**
 * CUSTOM STICKER OPTIONS & DEMO PRICING
 * ---------------------------------------------------------------------------
 * Everything the "Create your stickers" page offers lives here. All values are
 * PROVISIONAL: sizes, finishes and prices must be confirmed with a printer.
 *
 * - Leave `dimensions` as null until a supplier confirms real sizes; the page
 *   then says "size to be confirmed" instead of inventing measurements.
 * - Only list finishes a supplier can actually provide. Each one is shown as
 *   provisional. Do NOT add waterproof / holographic / laminated claims here
 *   until they're verified.
 */

export interface CustomStickerSize {
  id: 'small' | 'medium' | 'large';
  label: string;
  /** e.g. '5 × 5 cm' once confirmed. null = not confirmed yet. */
  dimensions: string | null;
  /** Price per sticker, whole rupees (test price). */
  unitPrice: number;
  /** How big the preview is drawn, relative to Large. Visual hint only. */
  previewScale: number;
}

export interface CustomStickerFinish {
  id: string;
  label: string;
  description: string;
  /** Added to the per-sticker price, whole rupees (test price). */
  surcharge: number;
}

export type CustomStickerShape = 'rounded' | 'circle' | 'contour';

export const customStickerSizes: CustomStickerSize[] = [
  { id: 'small', label: 'Small', dimensions: null, unitPrice: 25, previewScale: 0.62 },
  { id: 'medium', label: 'Medium', dimensions: null, unitPrice: 35, previewScale: 0.8 },
  { id: 'large', label: 'Large', dimensions: null, unitPrice: 49, previewScale: 1 },
];

export const customStickerFinishes: CustomStickerFinish[] = [
  { id: 'standard', label: 'Standard', description: 'Our default finish — exact material to be confirmed with our printer.', surcharge: 0 },
  { id: 'gloss', label: 'Glossy', description: 'Shinier look, if our printer offers it at a fair price. Not confirmed yet.', surcharge: 5 },
];

export const customStickerShapes: { id: CustomStickerShape; label: string; hint: string }[] = [
  { id: 'rounded', label: 'Rounded square', hint: 'Works with any photo' },
  { id: 'circle', label: 'Circle', hint: 'Crops to a circle' },
  { id: 'contour', label: 'Follow the shape', hint: 'For PNG/WebP with a transparent background' },
];

export const CUSTOM_STICKER_MIN_QTY = 1;
/** Same per-line limit as the rest of the cart. */
export const CUSTOM_STICKER_MAX_QTY = 20;

export const defaultCustomSticker = { sizeId: 'medium' as CustomStickerSize['id'], finishId: 'standard', shape: 'rounded' as CustomStickerShape, quantity: 5 };
