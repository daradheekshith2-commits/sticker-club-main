import { z } from 'zod';
import { Prisma } from '@prisma/client';

export const CUSTOM_STICKER_SIZES = {
  small: { label: 'Small', unitPrice: 25 },
  medium: { label: 'Medium', unitPrice: 35 },
  large: { label: 'Large', unitPrice: 49 },
} as const;

export const CUSTOM_STICKER_FINISHES = {
  standard: { label: 'Standard', surcharge: 0 },
  gloss: { label: 'Glossy', surcharge: 5 },
} as const;

export const CUSTOM_PACK_SIZES = {
  5: { count: 5, price: 109 },
  10: { count: 10, price: 199 },
} as const;

export const CUSTOM_PACK_FINISHES = {
  standard: { id: 'standard', label: 'Standard', surchargePerSticker: 0, available: true },
  gloss: { id: 'gloss', label: 'Glossy', surchargePerSticker: 3, available: false },
} as const;

export const POSTER_SIZES = {
  a5: { label: 'A5', price: 59 },
  a4: { label: 'A4', price: 89 },
  a3: { label: 'A3', price: 149 },
} as const;

export const WALL_LAYOUTS = {
  compact: {
    name: 'Compact Wall',
    slotCount: 5,
    slots: [
      { id: 's1', size: 'a5' },
      { id: 's2', size: 'a5' },
      { id: 's3', size: 'a3' },
      { id: 's4', size: 'a5' },
      { id: 's5', size: 'a5' },
    ] as const,
  },
  classic: {
    name: 'Classic Wall',
    slotCount: 8,
    slots: [
      { id: 's1', size: 'a4' },
      { id: 's2', size: 'a3' },
      { id: 's3', size: 'a4' },
      { id: 's4', size: 'a5' },
      { id: 's5', size: 'a5' },
      { id: 's6', size: 'a5' },
      { id: 's7', size: 'a5' },
      { id: 's8', size: 'a5' },
    ] as const,
  },
  studio: {
    name: 'Studio Wall',
    slotCount: 10,
    slots: [
      { id: 's1', size: 'a4' },
      { id: 's2', size: 'a4' },
      { id: 's3', size: 'a4' },
      { id: 's4', size: 'a4' },
      { id: 's5', size: 'a5' },
      { id: 's6', size: 'a5' },
      { id: 's7', size: 'a5' },
      { id: 's8', size: 'a5' },
      { id: 's9', size: 'a5' },
      { id: 's10', size: 'a5' },
    ] as const,
  },
  large: {
    name: 'Large Wall',
    slotCount: 15,
    slots: [
      { id: 's1', size: 'a5' },
      { id: 's2', size: 'a5' },
      { id: 's3', size: 'a4' },
      { id: 's4', size: 'a3' },
      { id: 's5', size: 'a4' },
      { id: 's6', size: 'a5' },
      { id: 's7', size: 'a5' },
      { id: 's8', size: 'a5' },
      { id: 's9', size: 'a5' },
      { id: 's10', size: 'a4' },
      { id: 's11', size: 'a5' },
      { id: 's12', size: 'a5' },
      { id: 's13', size: 'a4' },
      { id: 's14', size: 'a5' },
      { id: 's15', size: 'a5' },
    ] as const,
  },
} as const;

export function calculateCustomStickerUnitPrice(
  sizeId: keyof typeof CUSTOM_STICKER_SIZES | string,
  finishId: keyof typeof CUSTOM_STICKER_FINISHES | string
): Prisma.Decimal {
  const size = CUSTOM_STICKER_SIZES[sizeId as keyof typeof CUSTOM_STICKER_SIZES];
  const finish = CUSTOM_STICKER_FINISHES[finishId as keyof typeof CUSTOM_STICKER_FINISHES];
  if (!size || !finish) {
    throw new Error(`Invalid sticker size (${sizeId}) or finish (${finishId})`);
  }
  return new Prisma.Decimal(size.unitPrice + finish.surcharge);
}

export function calculateCustomPackUnitPrice(
  size: 5 | 10 | number,
  finishId: keyof typeof CUSTOM_PACK_FINISHES | string
): Prisma.Decimal {
  const packSize = CUSTOM_PACK_SIZES[size as keyof typeof CUSTOM_PACK_SIZES];
  if (!packSize) throw new Error(`Invalid pack size: ${size}. Standard sizes are 5 and 10 stickers.`);
  const finish = CUSTOM_PACK_FINISHES[finishId as keyof typeof CUSTOM_PACK_FINISHES];
  if (!finish) throw new Error(`Unknown pack finish: ${finishId}`);
  if (!finish.available && finishId !== 'standard') {
    throw new Error(`Pack finish ${finishId} is currently unavailable`);
  }
  const total = packSize.price + finish.surchargePerSticker * size;
  return new Prisma.Decimal(total);
}

export function calculateCustomWallUnitPrice(layoutId: string): Prisma.Decimal {
  const layout = WALL_LAYOUTS[layoutId as keyof typeof WALL_LAYOUTS];
  if (!layout) throw new Error(`Unknown wall layout: ${layoutId}`);
  const total = layout.slots.reduce((sum, slot) => {
    const pSize = POSTER_SIZES[slot.size as keyof typeof POSTER_SIZES];
    return sum + (pSize ? pSize.price : 0);
  }, 0);
  return new Prisma.Decimal(total);
}

// Validation schemas for Custom Lines
export const CustomStickerLineSchema = z.object({
  type: z.literal('custom-sticker'),
  artworkId: z.string().min(1),
  sizeId: z.enum(['small', 'medium', 'large']),
  finishId: z.enum(['standard', 'gloss']),
  shape: z.enum(['rounded', 'circle', 'contour']),
  quantity: z.number().int().min(1).max(20).default(1),
  previewUrl: z.string().optional(),
  instructions: z.string().max(500).optional(),
});

export const CustomPackLineSchema = z.object({
  type: z.literal('custom-pack'),
  seriesId: z.string().min(1),
  size: z.union([z.literal(5), z.literal(10)]),
  finishId: z.enum(['standard', 'gloss']),
  designIds: z.array(z.string().min(1)),
  quantity: z.number().int().min(1).max(20).default(1),
  previewUrl: z.string().optional(),
});

export const CustomWallSlotFillSchema = z.object({
  source: z.enum(['catalogue', 'upload', 'url']),
  productId: z.string().optional(),
  artworkId: z.string().optional(),
  url: z.string().optional(),
  fileName: z.string().optional(),
  fit: z.enum(['contain', 'cover']).optional(),
  focalPoint: z.object({ x: z.number(), y: z.number() }).optional(),
  crop: z.any().optional(),
});

export const CustomWallLineSchema = z.object({
  type: z.literal('custom-wall'),
  layoutId: z.enum(['compact', 'classic', 'studio', 'large']),
  slots: z.array(
    z.object({
      slotId: z.string().min(1),
      size: z.enum(['a5', 'a4', 'a3']),
      fill: CustomWallSlotFillSchema,
    })
  ),
  quantity: z.number().int().min(1).max(20).default(1),
  previewUrl: z.string().optional(),
});

export const CustomLineSchema = z.discriminatedUnion('type', [
  CustomStickerLineSchema,
  CustomPackLineSchema,
  CustomWallLineSchema,
]);

export type CustomLine = z.infer<typeof CustomLineSchema>;
