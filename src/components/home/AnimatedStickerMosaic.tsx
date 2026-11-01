/**
 * ANIMATED STICKER MOSAIC — the moving columns on the right of the homepage hero.
 *
 * How the endless scroll works:
 * - Images are dealt into columns. Each column's TRACK holds the column's list
 *   TWICE, one copy after the other. Every tile has the same bottom margin and
 *   the track is a flex column (so the last margin isn't collapsed away), which
 *   makes the track exactly two copies tall.
 * - CSS moves the track by exactly -50% (one copy) and repeats. At the end the
 *   second copy sits exactly where the first one started, so the jump back is
 *   invisible — no gaps, no reset.
 * - Odd columns run upwards, even columns downwards, each at its own speed.
 * - The movement is a CSS animation on the track; tiles never animate the
 *   same transform, so nothing fights.
 *
 * Images come from src/data/heroStickers.ts (generated from public/hero-stickers/).
 * If an image fails to load it is removed from BOTH copies, so the loop stays
 * seamless. If no images exist yet, the shop's own sticker artwork is used.
 */
import { useMemo, useState, type CSSProperties } from 'react';
import { heroStickers, type HeroStickerFile } from '../../data/heroStickers';
import { products } from '../../data/products';
import type { StickerDesign } from '../../types/product';
import { designOf } from '../../utils/collectibles';
import { fillColumn, loopSeconds, splitIntoColumns, tileAspect } from '../../utils/mosaic';
import { StickerSvg } from '../art/Sticker';

type Tile = { key: string; file: HeroStickerFile } | { key: string; design: StickerDesign };

/** Backing colours from the cinematic palette, cycled tile by tile like the reference. */
const backings = ['#E3102A', '#A8F0DC', '#0B2420', '#F4F0E8', '#0B2420', '#A8F0DC'];
/** Speed multipliers, so neighbouring columns never match. */
const speedFactors = [1, 1.28, 1.12];
/** Enough tiles per copy that one copy is always taller than the visible window. */
const MIN_TILES_PER_COPY = 9;

/** Shop artwork used only while public/hero-stickers/ is empty. */
function fallbackTiles(): Tile[] {
  return products
    .filter((p) => p.productType === 'single' && p.status === 'demo')
    .map((p) => ({ key: `art-${p.id}`, design: designOf(p)! }))
    .filter((t) => t.design);
}

function Sparkle({ className, color }: { className: string; color: string }) {
  return (
    <svg viewBox="0 0 20 20" className={`absolute ${className}`} aria-hidden>
      <path d="M10 0 C11 8 12 9 20 10 C12 11 11 12 10 20 C9 12 8 11 0 10 C8 9 9 8 10 0 Z" fill={color} />
    </svg>
  );
}

function TileView({ tile, index, eager, onFail }: { tile: Tile; index: number; eager: boolean; onFail: (src: string) => void }) {
  const backing = backings[index % backings.length];
  const light = backing === '#A8F0DC' || backing === '#F4F0E8';
  const sparkle = index % 3 === 1;
  if ('design' in tile) {
    return (
      <div className="mosaic-tile relative mb-4 overflow-hidden rounded-[22px] p-[12%]" style={{ backgroundColor: backing }}>
        <StickerSvg design={tile.design} className="h-auto w-full drop-shadow-[0_8px_10px_rgba(0,0,0,0.35)]" />
        {sparkle && <Sparkle className="top-3 right-3 size-4" color={light ? '#E3102A' : '#F4F0E8'} />}
      </div>
    );
  }
  const { file } = tile;
  // Cutouts sit on a coloured backing with breathing room; opaque images fill a dark tile at their own shape.
  const aspect = file.transparent ? tileAspect(file.width, file.height) : tileAspect(file.width, file.height, 0.6, 1.8);
  return (
    <div
      className={`mosaic-tile relative mb-4 overflow-hidden rounded-[22px] ${file.transparent ? 'p-[9%]' : 'border border-[#A8F0DC]/20'}`}
      style={{ aspectRatio: String(aspect), backgroundColor: file.transparent ? backing : '#071B18' }}
    >
      <img
        src={file.src}
        alt=""
        width={file.width}
        height={file.height}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        onError={() => onFail(file.src)}
        className={`size-full object-contain ${file.transparent ? 'drop-shadow-[0_8px_10px_rgba(0,0,0,0.35)]' : ''}`}
      />
      {sparkle && file.transparent && <Sparkle className="top-3 right-3 size-4" color={light ? '#E3102A' : '#F4F0E8'} />}
    </div>
  );
}

export function AnimatedStickerMosaic({ columns = 3, className = '' }: { columns?: number; className?: string }) {
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const usingFiles = heroStickers.length > 0;

  const cols = useMemo(() => {
    const tiles: Tile[] = usingFiles
      ? heroStickers.filter((f) => !failed.has(f.src)).map((file) => ({ key: file.key, file }))
      : fallbackTiles();
    return splitIntoColumns(tiles, columns).map((col) => fillColumn(col, MIN_TILES_PER_COPY));
  }, [usingFiles, failed, columns]);

  const onFail = (src: string) => {
    setFailed((prev) => (prev.has(src) ? prev : new Set(prev).add(src)));
    // Visible during development so a broken file in public/hero-stickers/ can be found and fixed.
    if (import.meta.env?.DEV) console.warn(`[hero stickers] Could not load ${decodeURIComponent(src)} — hidden from the mosaic.`);
  };

  return (
    <div aria-hidden className={`cinema-mosaic relative overflow-hidden rounded-[32px] ${className}`} data-source={usingFiles ? 'files' : 'fallback'}>
      <div className="absolute -inset-x-[6%] -inset-y-[12%] flex -rotate-[5deg] gap-4 px-4">
        {cols.map((col, c) => {
          const style = {
            '--mosaic-duration': `${loopSeconds(col.length, speedFactors[c % speedFactors.length])}s`,
            // Start each column part-way through its loop so they don't line up.
            '--mosaic-delay': `-${(c * 7 + 3) % 11}s`,
          } as CSSProperties;
          return (
            <div key={c} className={`min-w-0 flex-1 ${c === 2 ? 'hidden sm:block' : ''}`}>
              <div className={`mosaic-track flex flex-col ${c % 2 === 0 ? 'mosaic-up' : 'mosaic-down'}`} style={style}>
                {[0, 1].map((copy) =>
                  col.map((tile, i) => (
                    <TileView key={`${copy}-${i}-${tile.key}`} tile={tile} index={i + c * 2} eager={copy === 0 && i < 4} onFail={onFail} />
                  )),
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* Edge glow and top/bottom fades */}
      <div className="pointer-events-none absolute inset-0 rounded-[32px] shadow-[inset_0_0_0_1px_rgba(168,240,220,0.14),inset_0_0_60px_rgba(255,16,38,0.18)]" />
    </div>
  );
}
