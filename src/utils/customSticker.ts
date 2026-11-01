/**
 * CUSTOM STICKER LOGIC — validation and pricing (pure, unit-tested).
 *
 * PRICING RULE (prototype): per-sticker price = size price + finish surcharge,
 * total = per-sticker price × quantity. No quantity discounts yet; if you add
 * them, change `customStickerUnitPrice` / `customStickerTotal` only.
 */
import {
  CUSTOM_STICKER_MAX_QTY,
  CUSTOM_STICKER_MIN_QTY,
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
  finishId: string;
  shape: CustomStickerShape;
  /** e.g. "Custom sticker · Medium · Glossy" */
  label: string;
  /** Per-sticker price when added — informational; the cart recalculates from current data. */
  unitPriceAtAdd: number;
  rightsConfirmed: boolean;
}

export const getStickerSize = (id: string) => customStickerSizes.find((s) => s.id === id);
export const getStickerFinish = (id: string) => customStickerFinishes.find((f) => f.id === id);

export function isValidStickerQuantity(q: number): boolean {
  return Number.isInteger(q) && q >= CUSTOM_STICKER_MIN_QTY && q <= CUSTOM_STICKER_MAX_QTY;
}

/** Per-sticker price, or null if the size/finish doesn't exist. */
export function customStickerUnitPrice(sizeId: string, finishId: string): number | null {
  const size = getStickerSize(sizeId);
  const finish = getStickerFinish(finishId);
  if (!size || !finish) return null;
  return size.unitPrice + finish.surcharge;
}

export function customStickerTotal(sizeId: string, finishId: string, quantity: number): number | null {
  const unit = customStickerUnitPrice(sizeId, finishId);
  if (unit === null || !isValidStickerQuantity(quantity)) return null;
  return unit * quantity;
}

export function customStickerLabel(sizeId: string, finishId: string): string {
  const size = getStickerSize(sizeId)?.label ?? sizeId;
  const finish = getStickerFinish(finishId)?.label ?? finishId;
  return `Custom sticker · ${size} · ${finish}`;
}

export type StickerDraft = {
  image: PickedImage | null;
  sizeId: string;
  finishId: string;
  shape: CustomStickerShape;
  quantity: number;
  rightsConfirmed: boolean;
};

/** Why the sticker can't be added yet, or null when it can. */
export function stickerDraftProblem(d: StickerDraft): string | null {
  if (!d.image) return 'Add an image first.';
  if (!getStickerSize(d.sizeId)) return 'Choose a size.';
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
    finishId: d.finishId,
    shape: d.shape,
    label: customStickerLabel(d.sizeId, d.finishId),
    unitPriceAtAdd: customStickerUnitPrice(d.sizeId, d.finishId)!,
    rightsConfirmed: true,
  };
}
