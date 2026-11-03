/**
 * CUSTOM STICKER OPTIONS & PRICING
 * ---------------------------------------------------------------------------
 * Sizes, finishes, shapes, and automated pricing for custom stickers.
 * - Standard sizes: 5cm × 5cm (₹20), 6cm × 6cm (₹25)
 * - Custom size: dimensions entered in cm by user with automated price formula.
 */

export type CustomStickerSizeId = '5cm' | '6cm' | 'custom' | 'small' | 'medium' | 'large';

export interface CustomStickerSize {
  id: CustomStickerSizeId;
  label: string;
  /** e.g. '5cm × 5cm' */
  dimensions: string | null;
  /** Base price per sticker, whole rupees */
  unitPrice: number;
  /** How big the preview is drawn, relative to Large. Visual hint only. */
  previewScale: number;
}

export interface CustomStickerFinish {
  id: string;
  label: string;
  description: string;
  /** Added to the per-sticker price, whole rupees. */
  surcharge: number;
}

export type CustomStickerShape = 'rounded' | 'circle' | 'contour';

export const customStickerSizes: CustomStickerSize[] = [
  { id: '5cm', label: '5cm × 5cm', dimensions: '5 × 5 cm', unitPrice: 20, previewScale: 0.72 },
  { id: '6cm', label: '6cm × 6cm', dimensions: '6 × 6 cm', unitPrice: 25, previewScale: 0.86 },
  { id: 'custom', label: 'Custom', dimensions: 'Custom size in cm', unitPrice: 20, previewScale: 1 },
];

/**
 * Automated pricing for custom sticker dimensions:
 * 5cm × 5cm (25 cm²) = ₹20
 * 6cm × 6cm (36 cm²) = ₹25
 * Formula: price = Math.round(8.6364 + area * (5 / 11))
 */
export function calculateCustomStickerPrice(widthCm: number, heightCm: number): number {
  const w = Math.max(1, Number(widthCm) || 5);
  const h = Math.max(1, Number(heightCm) || 5);
  const area = w * h;
  const price = Math.round(8.6364 + area * (5 / 11));
  return Math.max(15, price);
}

export const customStickerFinishes: CustomStickerFinish[] = [
  { id: 'standard', label: 'Standard', description: 'Matte vinyl finish with protective laminate.', surcharge: 0 },
  { id: 'gloss', label: 'Glossy', description: 'High-shine finish with enhanced water resistance.', surcharge: 5 },
];

export const customStickerShapes: { id: CustomStickerShape; label: string; hint: string }[] = [
  { id: 'rounded', label: 'Rounded square', hint: 'Works with any photo' },
  { id: 'circle', label: 'Circle', hint: 'Crops to a circle' },
  { id: 'contour', label: 'Follow the shape', hint: 'For PNG/WebP with a transparent background' },
];

export const CUSTOM_STICKER_MIN_QTY = 1;
/** Same per-line limit as the rest of the cart. */
export const CUSTOM_STICKER_MAX_QTY = 20;

export const defaultCustomSticker = {
  sizeId: '5cm' as CustomStickerSize['id'],
  finishId: 'standard',
  shape: 'rounded' as CustomStickerShape,
  quantity: 5,
};
