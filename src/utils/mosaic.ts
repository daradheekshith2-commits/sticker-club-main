/**
 * MOSAIC LAYOUT — pure helpers for the homepage sticker mosaic (tested in mosaic.test.ts).
 */

/** Deals items into `n` columns like cards (0,1,2,0,1,2…), so neighbours differ and every item is used once. */
export function splitIntoColumns<T>(items: readonly T[], n: number): T[][] {
  const cols: T[][] = Array.from({ length: Math.max(1, n) }, () => []);
  items.forEach((item, i) => cols[i % cols.length].push(item));
  return cols;
}

/**
 * Repeats a column's list until it has at least `min` tiles, so one copy of the
 * column is always taller than the visible area. (Two copies are then stacked
 * for the seamless loop.) Short lists repeat whole, keeping the order.
 */
export function fillColumn<T>(items: readonly T[], min: number): T[] {
  if (!items.length) return [];
  const out: T[] = [];
  while (out.length < min) out.push(...items);
  return out;
}

/**
 * Tile shape (width ÷ height) from the image's real size, kept within a range
 * so very tall or very wide images still make good tiles. The image itself is
 * shown with object-fit: contain, so it's never cropped or stretched.
 */
export function tileAspect(width: number, height: number, min = 0.72, max = 1.45): number {
  if (!width || !height) return 1;
  return Math.min(max, Math.max(min, width / height));
}

/**
 * Loop duration in seconds: proportional to how many tiles a copy holds, so
 * every column moves at a similar, calm speed; `factor` makes neighbours differ.
 */
export function loopSeconds(tilesPerCopy: number, factor: number, secondsPerTile = 4.5): number {
  return Math.round(tilesPerCopy * secondsPerTile * factor * 10) / 10;
}
