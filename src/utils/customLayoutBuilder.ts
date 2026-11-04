import { paperSizes, type PaperSizeId, type WallLayout, type WallSlot } from '../data/wallLayouts';
import { sizePrice } from './customWall';

export const CUSTOM_WALL_ID = 'custom';
export const DEFAULT_CANVAS_WIDTH = 130; // cm
export const DEFAULT_CANVAS_HEIGHT = 90; // cm
export const MAX_CUSTOM_SHEETS = 20;
export const SLOT_GAP = 3; // cm

export function getSlotDimensions(size: PaperSizeId, orientation: 'portrait' | 'landscape' = 'portrait'): { w: number; h: number } {
  const p = paperSizes[size];
  if (!p) throw new Error(`Unknown paper size: ${size}`);
  return orientation === 'landscape' ? { w: p.h, h: p.w } : { w: p.w, h: p.h };
}

export function generateSlotId(): string {
  return `sheet-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createCustomSlot(
  size: PaperSizeId,
  x: number = 0,
  y: number = 0,
  orientation: 'portrait' | 'landscape' = 'portrait',
  slotNumber: number = 1,
  id: string = generateSlotId()
): WallSlot {
  const { w, h } = getSlotDimensions(size, orientation);
  return {
    id,
    number: slotNumber,
    size,
    orientation,
    x,
    y,
    w,
    h,
  };
}

/** Check if two slots overlap geometrically (excluding zero-area boundaries). */
export function checkOverlap(a: WallSlot, b: WallSlot, tolerance: number = 0.05): boolean {
  if (a.id === b.id) return false;
  return (
    a.x + tolerance < b.x + b.w &&
    b.x + tolerance < a.x + a.w &&
    a.y + tolerance < b.y + b.h &&
    b.y + tolerance < a.y + a.h
  );
}

/** Returns the set of all slot IDs that overlap with at least one other slot. */
export function getOverlappingSlotIds(slots: WallSlot[]): Set<string> {
  const overlapping = new Set<string>();
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      if (checkOverlap(slots[i], slots[j])) {
        overlapping.add(slots[i].id);
        overlapping.add(slots[j].id);
      }
    }
  }
  return overlapping;
}

/** Clamps a slot's coordinates so it remains strictly within the canvas boundaries. */
export function clampSlotPosition(slot: WallSlot, canvasWidth: number, canvasHeight: number): WallSlot {
  const maxX = Math.max(0, canvasWidth - slot.w);
  const maxY = Math.max(0, canvasHeight - slot.h);
  return {
    ...slot,
    x: Math.max(0, Math.min(slot.x, maxX)),
    y: Math.max(0, Math.min(slot.y, maxY)),
  };
}

/**
 * Packs sheets cleanly into rows without overlapping, keeping gaps consistent.
 * Retains user order or places them comfortably centered.
 */
export function autoArrangeSlots(
  slots: WallSlot[],
  canvasWidth: number = DEFAULT_CANVAS_WIDTH,
  gap: number = SLOT_GAP
): WallSlot[] {
  if (!slots.length) return [];

  const rows: WallSlot[][] = [];
  let currentRow: WallSlot[] = [];
  let currentWidth = 0;

  for (const s of slots) {
    const nextWidth = currentWidth === 0 ? s.w : currentWidth + gap + s.w;
    if (nextWidth <= canvasWidth || currentRow.length === 0) {
      currentRow.push(s);
      currentWidth = nextWidth;
    } else {
      rows.push(currentRow);
      currentRow = [s];
      currentWidth = s.w;
    }
  }
  if (currentRow.length) rows.push(currentRow);

  const arranged: WallSlot[] = [];
  let currentY = 2; // small padding from top

  rows.forEach((row) => {
    const rowHeight = Math.max(...row.map((s) => s.h));
    const totalRowWidth = row.reduce((sum, s) => sum + s.w, 0) + (row.length - 1) * gap;
    let startX = Math.max(2, (canvasWidth - totalRowWidth) / 2);

    row.forEach((s) => {
      // center vertically in row
      const yOffset = (rowHeight - s.h) / 2;
      arranged.push({
        ...s,
        x: Number((startX).toFixed(1)),
        y: Number((currentY + yOffset).toFixed(1)),
      });
      startX += s.w + gap;
    });

    currentY += rowHeight + gap;
  });

  return arranged;
}

/** Finds a reasonable default position for a newly added sheet to avoid covering existing ones. */
export function findNextOpenPosition(
  existingSlots: WallSlot[],
  newSize: PaperSizeId,
  orientation: 'portrait' | 'landscape' = 'portrait',
  canvasWidth: number = DEFAULT_CANVAS_WIDTH,
  canvasHeight: number = DEFAULT_CANVAS_HEIGHT,
  gap: number = SLOT_GAP
): { x: number; y: number } {
  const { w, h } = getSlotDimensions(newSize, orientation);
  if (!existingSlots.length) {
    return {
      x: Number((Math.max(2, (canvasWidth - w) / 2)).toFixed(1)),
      y: Number((Math.max(2, (canvasHeight - h) / 2)).toFixed(1)),
    };
  }

  // Try placing to the right of the rightmost slot
  const sortedByX = [...existingSlots].sort((a, b) => b.x + b.w - (a.x + a.w));
  const rightmost = sortedByX[0];
  const candidateRightX = rightmost.x + rightmost.w + gap;

  if (candidateRightX + w <= canvasWidth) {
    const candidateSlot: WallSlot = { id: 'temp', number: 0, size: newSize, orientation, x: candidateRightX, y: rightmost.y, w, h };
    if (!existingSlots.some((s) => checkOverlap(candidateSlot, s))) {
      return { x: Number(candidateRightX.toFixed(1)), y: Number(rightmost.y.toFixed(1)) };
    }
  }

  // Try placing below the bottom-most slot
  const sortedByY = [...existingSlots].sort((a, b) => b.y + b.h - (a.y + a.h));
  const bottommost = sortedByY[0];
  const candidateBottomY = bottommost.y + bottommost.h + gap;

  if (candidateBottomY + h <= canvasHeight) {
    const candidateSlot: WallSlot = { id: 'temp', number: 0, size: newSize, orientation, x: Math.max(2, bottommost.x), y: candidateBottomY, w, h };
    if (!existingSlots.some((s) => checkOverlap(candidateSlot, s))) {
      return { x: Number(Math.max(2, bottommost.x).toFixed(1)), y: Number(candidateBottomY.toFixed(1)) };
    }
  }

  // Fallback: staggered position
  const offset = (existingSlots.length % 5) * 4 + 2;
  return {
    x: Number(Math.min(offset, canvasWidth - w).toFixed(1)),
    y: Number(Math.min(offset, canvasHeight - h).toFixed(1)),
  };
}

/** Calculates total price for custom slots according to sheet sizes. */
export function calculateCustomSlotsPrice(slots: WallSlot[]): number {
  return slots.reduce((sum, s) => sum + sizePrice(s.size), 0);
}

/** Price breakdown for custom slots. */
export function customSlotsBreakdown(slots: WallSlot[]) {
  const order: PaperSizeId[] = ['a3', 'a4', 'a5'];
  return order
    .map((size) => {
      const count = slots.filter((s) => s.size === size).length;
      const unit = sizePrice(size);
      return {
        size,
        label: paperSizes[size].label,
        count,
        unit,
        total: count * unit,
      };
    })
    .filter((row) => row.count > 0);
}

/** Converts custom slots into a complete WallLayout structure. */
export function createCustomWallLayout(
  slots: WallSlot[],
  canvasWidth: number = DEFAULT_CANVAS_WIDTH,
  canvasHeight: number = DEFAULT_CANVAS_HEIGHT
): WallLayout {
  // Ensure the wall dimensions accommodate all slots plus padding
  let maxRight = canvasWidth;
  let maxBottom = canvasHeight;
  for (const s of slots) {
    if (s.x + s.w > maxRight) maxRight = s.x + s.w + 4;
    if (s.y + s.h > maxBottom) maxBottom = s.y + s.h + 4;
  }

  return {
    id: CUSTOM_WALL_ID,
    name: 'Custom Wall',
    description: 'Your own custom sheet arrangement with A5, A4 and A3 posters.',
    slots: slots.map((s, idx) => ({ ...s, number: idx + 1 })),
    width: Math.max(canvasWidth, Math.round(maxRight)),
    height: Math.max(canvasHeight, Math.round(maxBottom)),
    isCustom: true,
  };
}
