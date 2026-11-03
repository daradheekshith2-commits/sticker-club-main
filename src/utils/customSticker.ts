/**
 * CUSTOM STICKER LOGIC — validation and pricing (pure, unit-tested).
 *
 * PRICING RULE: per-sticker price = size price (or calculated custom area price) + finish surcharge,
 * total = per-sticker price × quantity.
 */
import {
  CUSTOM_STICKER_MAX_QTY,
  CUSTOM_STICKER_MIN_QTY,
  calculateCustomStickerPrice,
  customStickerFinishes,
  customStickerShapes,
  customStickerSizes,
  type CustomStickerShape,
} from '../data/customStickerOptions';
import type { PickedImage } from '../types/image';

/** A finished custom sticker, as stored in the cart. */
export interface CustomStickerConfig {
  image: PickedImage;
  sizeId: string;
  customDimensions?: { width: number; height: number };
  finishId: string;
  shape: CustomStickerShape;
  /** e.g. "Custom sticker · 5cm × 5cm · Standard" */
  label: string;
  /** Per-sticker price when added — informational; the cart recalculates from current data. */
  unitPriceAtAdd: number;
  rightsConfirmed: boolean;
}

export const getStickerSize = (id: string) => {
  const direct = customStickerSizes.find((s) => s.id === id);
  if (direct) return direct;
  // Backward compatibility with legacy stored cart sessions & tests
  if (id === 'small' || id === 'medium') return customStickerSizes.find((s) => s.id === '5cm');
  if (id === 'large') return customStickerSizes.find((s) => s.id === '6cm');
  return undefined;
};
export const getStickerFinish = (id: string) => customStickerFinishes.find((f) => f.id === id);

export function isValidStickerQuantity(q: number): boolean {
  return Number.isInteger(q) && q >= CUSTOM_STICKER_MIN_QTY && q <= CUSTOM_STICKER_MAX_QTY;
}

/** Per-sticker price, or null if the size/finish doesn't exist. */
export function customStickerUnitPrice(
  sizeId: string,
  finishId: string,
  customDimensions?: { width: number; height: number }
): number | null {
  const size = getStickerSize(sizeId);
  const finish = getStickerFinish(finishId);
  if (!size || !finish) return null;

  if (sizeId === 'custom') {
    const base = customDimensions
      ? calculateCustomStickerPrice(customDimensions.width, customDimensions.height)
      : size.unitPrice;
    return base + finish.surcharge;
  }

  return size.unitPrice + finish.surcharge;
}

export function customStickerTotal(
  sizeId: string,
  finishId: string,
  quantity: number,
  customDimensions?: { width: number; height: number }
): number | null {
  const unit = customStickerUnitPrice(sizeId, finishId, customDimensions);
  if (unit === null || !isValidStickerQuantity(quantity)) return null;
  return unit * quantity;
}

export function customStickerLabel(
  sizeId: string,
  finishId: string,
  customDimensions?: { width: number; height: number }
): string {
  const size = getStickerSize(sizeId)?.label ?? sizeId;
  const finish = getStickerFinish(finishId)?.label ?? finishId;
  if (sizeId === 'custom' && customDimensions) {
    return `Custom sticker · ${customDimensions.width}×${customDimensions.height}cm · ${finish}`;
  }
  return `Custom sticker · ${size} · ${finish}`;
}

export type StickerDraft = {
  image: PickedImage | null;
  sizeId: string;
  customDimensions?: { width: number; height: number };
  finishId: string;
  shape: CustomStickerShape;
  quantity: number;
  rightsConfirmed: boolean;
};

/** Why the sticker can't be added yet, or null when it can. */
export function stickerDraftProblem(d: StickerDraft): string | null {
  if (!d.image) return 'Add an image first.';
  if (!getStickerSize(d.sizeId)) return 'Choose a size.';
  if (d.sizeId === 'custom' && d.customDimensions) {
    if (d.customDimensions.width < 1 || d.customDimensions.height < 1) {
      return 'Dimensions must be at least 1 cm.';
    }
  }
  if (!getStickerFinish(d.finishId)) return 'Choose a finish.';
  if (!customStickerShapes.some((s) => s.id === d.shape)) return 'Choose a shape.';
  if (!isValidStickerQuantity(d.quantity)) return `Quantity must be between ${CUSTOM_STICKER_MIN_QTY} and ${CUSTOM_STICKER_MAX_QTY}.`;
  if (!d.rightsConfirmed) return 'Please confirm you have the rights to this image.';
  return null;
}

/** Snapshot the draft for the cart. Throws if it isn't ready. */
export function toStickerConfig(d: StickerDraft): CustomStickerConfig {
  const problem = stickerDraftProblem(d);
  if (problem) throw new Error(problem);
  return {
    image: d.image!,
    sizeId: d.sizeId,
    customDimensions: d.sizeId === 'custom' ? d.customDimensions : undefined,
    finishId: d.finishId,
    shape: d.shape,
    label: customStickerLabel(d.sizeId, d.finishId, d.customDimensions),
    unitPriceAtAdd: customStickerUnitPrice(d.sizeId, d.finishId, d.customDimensions)!,
    rightsConfirmed: true,
  };
}
