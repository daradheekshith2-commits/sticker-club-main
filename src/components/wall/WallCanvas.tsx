/**
 * WALL CANVAS — draws a wall layout with whatever fills each position.
 * Used by the builder (interactive), cart thumbnails and wall-pack previews.
 *
 * Positions come from src/data/wallLayouts.ts in centimetres; here they are
 * converted to percentages so the wall scales to any width while keeping
 * true poster proportions.
 */
import { useEffect, useState, type CSSProperties } from 'react';
import { LuImageOff, LuPlus } from 'react-icons/lu';
import { getProductById } from '../../utils/catalogue';
import { paperSizes, type WallLayout } from '../../data/wallLayouts';
import type { DisplayFill } from '../../types/wall';
import { PosterFaceSvg } from '../art/ProductArt';

/** Empty space around the posters, in cm. */
const PAD = 1.5;

interface WallCanvasProps {
  layout: WallLayout;
  fills: (DisplayFill | null)[];
  /** Makes positions clickable (builder). */
  onSelect?: (index: number) => void;
  selectedIndex?: number;
  /** 'full' shows size labels and "Your image" tags; 'thumb' is minimal. */
  detail?: 'full' | 'thumb';
  className?: string;
  /** Accessible description of the whole wall. */
  label?: string;
  /**
   * 'width' (default): fill the available width.
   * 'contain': fit inside a parent box in both directions (the parent must
   * set `container-type: size`, e.g. the Tailwind class [container-type:size]).
   */
  fit?: 'width' | 'contain';
}

export function WallCanvas({ layout, fills, onSelect, selectedIndex, detail = 'full', className = '', label, fit = 'width' }: WallCanvasProps) {
  const W = layout.width + PAD * 2;
  const H = layout.height + PAD * 2;
  // 'contain': as wide as possible without becoming taller than the parent box (cqh = 1% of its height).
  const width = fit === 'contain' ? `min(100%, ${((W / H) * 100).toFixed(2)}cqh)` : '100%';
  return (
    <div
      className={`relative ${className}`}
      style={{ aspectRatio: `${W} / ${H}`, width }}
      role={onSelect ? 'group' : 'img'}
      aria-label={label ?? `${layout.name}: ${layout.slots.length} posters`}
    >
      {layout.slots.map((slot, i) => (
        <PosterSlot
          key={slot.id}
          number={slot.number}
          sizeLabel={paperSizes[slot.size].label}
          fill={fills[i] ?? null}
          selected={selectedIndex === i}
          onSelect={onSelect ? () => onSelect(i) : undefined}
          detail={detail}
          style={{
            left: `${((slot.x + PAD) / W) * 100}%`,
            top: `${((slot.y + PAD) / H) * 100}%`,
            width: `${(slot.w / W) * 100}%`,
            height: `${(slot.h / H) * 100}%`,
          }}
        />
      ))}
    </div>
  );
}

interface PosterSlotProps {
  number: number;
  sizeLabel: string;
  fill: DisplayFill | null;
  selected: boolean;
  onSelect?: () => void;
  detail: 'full' | 'thumb';
  style: CSSProperties;
}

/** One position on the wall: a poster, the customer's image, or an empty placeholder. */
export function PosterSlot({ number, sizeLabel, fill, selected, onSelect, detail, style }: PosterSlotProps) {
  const full = detail === 'full';
  const isUser = fill?.source === 'upload' || fill?.source === 'url';
  const describe = !fill
    ? 'empty'
    : fill.source === 'catalogue'
      ? (getProductById(fill.productId)?.name ?? 'our design')
      : fill.source === 'design'
        ? fill.design.title.replace('\n', ' ')
        : 'your image';
  const content = (
    <>
      <span className={`absolute inset-0 overflow-hidden ${fill ? 'bg-white shadow-[0_2px_6px_rgba(42,32,22,0.18)]' : ''} ${full && fill ? 'p-[4%]' : ''}`}>
        {fill ? <FillContent fill={fill} number={number} /> : <EmptySlot full={full} sizeLabel={sizeLabel} />}
      </span>
      {full && fill && (
        <span className="pointer-events-none absolute top-1 right-1 rounded bg-white/90 px-1 text-[10px] leading-4 font-bold">{sizeLabel}</span>
      )}
      {full && isUser && (
        <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-ink px-1 text-[9px] leading-4 font-bold text-lime">Your image</span>
      )}
      {selected && <span aria-hidden className="pointer-events-none absolute -inset-[5px] rounded-sm border-[3px] border-ink" />}
    </>
  );
  if (!onSelect) {
    return (
      <span className="absolute" style={style}>
        {content}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Position ${number}, ${sizeLabel}: ${describe}`}
      className="absolute cursor-pointer focus-visible:outline-offset-4"
      style={style}
    >
      {content}
    </button>
  );
}

function EmptySlot({ full, sizeLabel }: { full: boolean; sizeLabel: string }) {
  return (
    <span className="flex size-full flex-col items-center justify-center gap-0.5 border-2 border-dashed border-ink/30 bg-white/50 text-ink-soft">
      {full && <LuPlus aria-hidden className="size-4" />}
      {full && <span className="text-[10px] font-bold">{sizeLabel}</span>}
    </span>
  );
}

function FillContent({ fill, number }: { fill: DisplayFill; number: number }) {
  if (fill.source === 'design') return <PosterFaceSvg poster={fill.design} className="size-full" />;
  if (fill.source === 'catalogue') {
    const product = getProductById(fill.productId);
    if (product?.images?.[0]) return <img src={product.images[0].src} alt="" className="size-full object-cover" />;
    if (product?.art.kind === 'poster') return <PosterFaceSvg poster={product.art.poster} className="size-full" />;
    return <Unavailable />;
  }
  const src = fill.source === 'upload' ? fill.objectUrl : fill.url;
  return <UserImage src={src} fit={fill.fit} alt={`Your image in position ${number}`} />;
}

/** The customer's image, with fit and focal point applied. Never shows a broken-image icon. */
function UserImage({ src, fit, alt }: { src: string; fit: { mode: 'cover' | 'contain'; focusX: number; focusY: number }; alt: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (failed) return <Unavailable />;
  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="size-full bg-paper-deep"
      style={{ objectFit: fit.mode, objectPosition: `${fit.focusX}% ${fit.focusY}%` }}
    />
  );
}

function Unavailable() {
  return (
    <span className="flex size-full flex-col items-center justify-center gap-1 bg-paper-deep p-1 text-center text-[10px] font-bold text-ink-soft">
      <LuImageOff aria-hidden className="size-4" />
      Image unavailable
    </span>
  );
}
