/**
 * WALL LAYOUTS
 * ---------------------------------------------------------------------------
 * Layout presets for "Build your own wall" and for previewing ready-made wall
 * packs. Everything is data: React components only draw what's defined here.
 *
 * Each layout is described as ROWS of items. An item is either one poster
 * size ('a4') or a vertical STACK of sizes (['a5', 'a5']). `buildLayout`
 * turns that into exact slot positions in centimetres, using real ISO paper
 * sizes, so previews keep true proportions.
 *
 * These presets are demo configurations, not confirmed products.
 */

/** Matches the variant ids in `posterSizes` (src/data/products.ts). */
export type PaperSizeId = 'a5' | 'a4' | 'a3';

/** Physical paper sizes in cm (portrait). */
export const paperSizes: Record<PaperSizeId, { label: string; w: number; h: number }> = {
  a5: { label: 'A5', w: 14.8, h: 21 },
  a4: { label: 'A4', w: 21, h: 29.7 },
  a3: { label: 'A3', w: 29.7, h: 42 },
};

export interface WallSlot {
  /** Stable within its layout, e.g. 'compact-3'. */
  id: string;
  /** 1-based position number shown to customers. */
  number: number;
  size: PaperSizeId;
  /** Top-left corner and size, in cm from the top-left of the wall. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WallLayout {
  id: string;
  name: string;
  description: string;
  slots: WallSlot[];
  /** Total wall area covered, in cm (for aspect ratio). */
  width: number;
  height: number;
}

type RowItem = PaperSizeId | PaperSizeId[];

/** Space between posters, in cm. */
const GAP = 3;

/** Turns rows of sizes/stacks into positioned slots. Pure and unit-tested. */
export function buildLayout(id: string, name: string, description: string, rows: RowItem[][]): WallLayout {
  // Measure each item and row first.
  const measured = rows.map((row) => {
    const items = row.map((item) => {
      const stack = Array.isArray(item) ? item : [item];
      const w = Math.max(...stack.map((s) => paperSizes[s].w));
      const h = stack.reduce((sum, s) => sum + paperSizes[s].h, 0) + GAP * (stack.length - 1);
      return { stack, w, h };
    });
    const width = items.reduce((sum, it) => sum + it.w, 0) + GAP * (items.length - 1);
    const height = Math.max(...items.map((it) => it.h));
    return { items, width, height };
  });
  const width = Math.max(...measured.map((r) => r.width));
  const height = measured.reduce((sum, r) => sum + r.height, 0) + GAP * (measured.length - 1);

  // Then place everything: rows centred horizontally, items centred vertically in their row.
  const slots: WallSlot[] = [];
  let y = 0;
  for (const row of measured) {
    let x = (width - row.width) / 2;
    for (const item of row.items) {
      let sy = y + (row.height - item.h) / 2;
      for (const size of item.stack) {
        const p = paperSizes[size];
        slots.push({ id: `${id}-${slots.length + 1}`, number: slots.length + 1, size, x: x + (item.w - p.w) / 2, y: sy, w: p.w, h: p.h });
        sy += p.h + GAP;
      }
      x += item.w + GAP;
    }
    y += row.height + GAP;
  }
  return { id, name, description, slots, width, height };
}

/** Presets offered in the wall builder, smallest first. */
export const builderLayouts: WallLayout[] = [
  buildLayout('compact', 'Compact Wall', 'One A3 centrepiece framed by four A5s. Fits above a single desk.', [
    [['a5', 'a5'], 'a3', ['a5', 'a5']],
  ]),
  buildLayout('classic', 'Classic Wall', 'An A3 between two A4s, with a row of five A5s underneath.', [
    ['a4', 'a3', 'a4'],
    ['a5', 'a5', 'a5', 'a5', 'a5'],
  ]),
  buildLayout('studio', 'Studio Wall', 'Two even rows — four A4s over six A5s. Neat and symmetrical.', [
    ['a4', 'a4', 'a4', 'a4'],
    ['a5', 'a5', 'a5', 'a5', 'a5', 'a5'],
  ]),
  buildLayout('large', 'Large Wall', 'Fifteen mixed sizes for a whole wall, built around an A3.', [
    [['a5', 'a5'], 'a4', 'a3', 'a4', ['a5', 'a5']],
    [['a5', 'a5'], 'a4', ['a5', 'a5'], 'a4', ['a5', 'a5']],
  ]),
];

/** Arrangements used to preview ready-made wall packs (not offered in the builder). */
export const packLayouts: WallLayout[] = [
  buildLayout('pack-trio-a4', 'Trio', 'Three A4s side by side.', [['a4', 'a4', 'a4']]),
  buildLayout('pack-five-a4', 'Five', 'Three A4s over two A4s.', [
    ['a4', 'a4', 'a4'],
    ['a4', 'a4'],
  ]),
];

const allLayouts = [...builderLayouts, ...packLayouts];

export function getLayout(id: string): WallLayout | undefined {
  return allLayouts.find((l) => l.id === id);
}

export const defaultLayoutId = builderLayouts[0].id;

/** "1 × A3 · 4 × A5" — counts per size, largest first. */
export function sizeSummary(layout: WallLayout): string {
  const order: PaperSizeId[] = ['a3', 'a4', 'a5'];
  return order
    .map((s) => ({ s, n: layout.slots.filter((slot) => slot.size === s).length }))
    .filter((x) => x.n > 0)
    .map((x) => `${x.n} × ${paperSizes[x.s].label}`)
    .join(' · ');
}
