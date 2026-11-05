/**
 * WALL CANVAS — draws a wall layout with whatever fills each position.
 * Used by the builder (interactive), cart thumbnails and wall-pack previews.
 *
 * Positions come from src/data/wallLayouts.ts in centimetres; here they are
 * converted to percentages so the wall scales to any width while keeping
 * true poster proportions.
 */
import { useContext, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { LuImageOff, LuPlus, LuTriangleAlert } from 'react-icons/lu';
import { getProductById } from '../../utils/catalogue';
import { CatalogueContext } from '../../context/CatalogueContext';
import { paperSizes, type PaperSizeId, type WallLayout } from '../../data/wallLayouts';
import type { DisplayFill, PosterCropEdit } from '../../types/wall';
import { PosterFaceSvg, ProductImage } from '../art/ProductArt';
import { sizePrice } from '../../utils/customWall';
import { formatPrice } from '../../utils/format';

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
  /** Drag-to-move support for custom layouts */
  onMoveSlot?: (index: number, x: number, y: number) => void;
  overlappingSlotIds?: Set<string>;
  onAddFirstSheet?: (size: PaperSizeId) => void;
  isCustom?: boolean;
}

export function WallCanvas({
  layout,
  fills,
  onSelect,
  selectedIndex,
  detail = 'full',
  className = '',
  label,
  fit = 'width',
  onMoveSlot,
  overlappingSlotIds,
  onAddFirstSheet,
  isCustom,
}: WallCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const W = layout.width + PAD * 2;
  const H = layout.height + PAD * 2;
  // 'contain': as wide as possible without becoming taller than the parent box (cqh = 1% of its height).
  const width = fit === 'contain' ? `min(100%, ${((W / H) * 100).toFixed(2)}cqh)` : '100%';

  if (isCustom && layout.slots.length === 0) {
    return (
      <div
        className={`relative flex min-h-[320px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink/30 bg-[#F5EFE6] p-8 text-center sm:min-h-[420px] ${className}`}
        style={{ width }}
      >
        <div className="grid size-14 place-items-center rounded-2xl bg-ink/10 text-ink">
          <LuPlus className="size-8" />
        </div>
        <h3 className="mt-4 font-display text-2xl font-extrabold text-ink">
          Add your first sheet
        </h3>
        <p className="mt-1.5 max-w-sm text-sm text-ink-soft">
          Start your custom wall by adding a sheet below. You can arrange any mix of A5, A4, and A3 sheets.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {(['a5', 'a4', 'a3'] as PaperSizeId[]).map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={() => onAddFirstSheet?.(sz)}
              className="btn border-2 border-ink bg-white font-bold text-ink shadow-sm hover:bg-lime"
            >
              + {paperSizes[sz].label} ({paperSizes[sz].w} × {paperSizes[sz].h} cm) · {formatPrice(sizePrice(sz))}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const handlePointerDown = (index: number, e: ReactPointerEvent) => {
    if (!onMoveSlot || !containerRef.current) return;
    const slot = layout.slots[index];
    if (!slot) return;

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragIndex(index);
    if (onSelect) onSelect(index);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: slot.x,
      origY: slot.y,
    };
  };

  const handlePointerMove = (index: number, e: ReactPointerEvent) => {
    if (dragIndex !== index || !dragStartRef.current || !containerRef.current || !onMoveSlot) return;
    const rect = containerRef.current.getBoundingClientRect();
    const slot = layout.slots[index];
    if (!slot || rect.width <= 0) return;

    const dxPx = e.clientX - dragStartRef.current.startX;
    const dyPx = e.clientY - dragStartRef.current.startY;
    const pxToCm = W / rect.width;

    const newX = Math.max(0, Math.min(layout.width - slot.w, dragStartRef.current.origX + dxPx * pxToCm));
    const newY = Math.max(0, Math.min(layout.height - slot.h, dragStartRef.current.origY + dyPx * pxToCm));

    onMoveSlot(index, Number(newX.toFixed(1)), Number(newY.toFixed(1)));
  };

  const handlePointerUp = (e: ReactPointerEvent) => {
    if (dragIndex !== null) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      setDragIndex(null);
      dragStartRef.current = null;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative select-none ${className}`}
      style={{ aspectRatio: `${W} / ${H}`, width }}
      role={onSelect ? 'group' : 'img'}
      aria-label={label ?? `${layout.name}: ${layout.slots.length} posters`}
    >
      {layout.slots.map((slot, i) => {
        const isOverlapping = Boolean(overlappingSlotIds?.has(slot.id));
        return (
          <PosterSlot
            key={slot.id}
            number={slot.number}
            size={slot.size}
            orientation={slot.orientation}
            sizeLabel={paperSizes[slot.size].label}
            fill={fills[i] ?? null}
            selected={selectedIndex === i}
            isOverlapping={isOverlapping}
            isDragging={dragIndex === i}
            onSelect={onSelect ? () => onSelect(i) : undefined}
            onPointerDown={onMoveSlot ? (e) => handlePointerDown(i, e) : undefined}
            onPointerMove={onMoveSlot ? (e) => handlePointerMove(i, e) : undefined}
            onPointerUp={onMoveSlot ? handlePointerUp : undefined}
            detail={detail}
            style={{
              left: `${((slot.x + PAD) / W) * 100}%`,
              top: `${((slot.y + PAD) / H) * 100}%`,
              width: `${(slot.w / W) * 100}%`,
              height: `${(slot.h / H) * 100}%`,
            }}
          />
        );
      })}
    </div>
  );
}

interface PosterSlotProps {
  number: number;
  size: PaperSizeId;
  orientation?: 'portrait' | 'landscape';
  sizeLabel: string;
  fill: DisplayFill | null;
  selected: boolean;
  isOverlapping?: boolean;
  isDragging?: boolean;
  onSelect?: () => void;
  onPointerDown?: (e: ReactPointerEvent) => void;
  onPointerMove?: (e: ReactPointerEvent) => void;
  onPointerUp?: (e: ReactPointerEvent) => void;
  detail: 'full' | 'thumb';
  style: CSSProperties;
}

/** One position on the wall: a poster, the customer's image, or an empty placeholder. */
export function PosterSlot({
  number,
  size,
  orientation,
  sizeLabel,
  fill,
  selected,
  isOverlapping,
  isDragging,
  onSelect,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  detail,
  style,
}: PosterSlotProps) {
  const full = detail === 'full';
  const isUser = fill?.source === 'upload' || fill?.source === 'url';
  const price = sizePrice(size);

  const catalogueCtx = useContext(CatalogueContext);
  const getProduct = (id: string) => catalogueCtx?.getProductById(id) ?? getProductById(id);

  const describe = !fill
    ? 'empty'
    : fill.source === 'catalogue'
      ? (getProduct(fill.productId)?.name ?? 'our design')
      : fill.source === 'design'
        ? fill.design.title.replace('\n', ' ')
        : 'your image';

  const content = (
    <>
      <span
        className={`absolute inset-0 overflow-hidden ${
          fill ? 'bg-white shadow-[0_2px_6px_rgba(42,32,22,0.18)]' : ''
        } ${full && fill ? 'p-[3%]' : ''}`}
      >
        {fill ? <FillContent fill={fill} number={number} /> : <EmptySlot full={full} sizeLabel={sizeLabel} price={price} />}
      </span>

      {/* Size and orientation badge */}
      {full && fill && (
        <span className="pointer-events-none absolute top-1 right-1 rounded bg-ink/90 px-1.5 py-0.5 text-[9px] font-extrabold text-white shadow-sm">
          {sizeLabel}
          {orientation === 'landscape' && ' ↻'}
        </span>
      )}

      {/* Your Image tag */}
      {full && isUser && (
        <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-ink px-1 text-[9px] font-bold text-lime shadow-sm">
          Your image
        </span>
      )}

      {/* Overlap alert badge */}
      {isOverlapping && (
        <span className="pointer-events-none absolute top-1 left-1 flex items-center gap-0.5 rounded bg-tomato px-1 text-[9px] font-extrabold text-white shadow">
          <LuTriangleAlert aria-hidden className="size-2.5" /> Overlap
        </span>
      )}

      {/* Focus & selected ring */}
      {selected && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-[4px] rounded-md border-[3px] border-ink ring-2 ring-lime ring-offset-1 ring-offset-paper"
        />
      )}
    </>
  );

  if (!onSelect && !onPointerDown) {
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
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      aria-pressed={selected}
      aria-label={`Position ${number}, ${sizeLabel}${orientation === 'landscape' ? ' landscape' : ''}: ${describe}`}
      className={`absolute cursor-pointer transition-shadow focus-visible:outline-offset-4 touch-none ${
        onPointerDown ? (isDragging ? 'cursor-grabbing z-30 shadow-2xl scale-[1.02]' : 'cursor-grab hover:z-20') : ''
      } ${isOverlapping ? 'ring-2 ring-tomato ring-offset-1' : ''}`}
      style={style}
    >
      {content}
    </button>
  );
}

function EmptySlot({ full, sizeLabel, price }: { full: boolean; sizeLabel: string; price: number }) {
  return (
    <span className="flex size-full flex-col items-center justify-center gap-0.5 border-2 border-dashed border-ink/30 bg-white/60 p-1 text-center text-ink-soft hover:bg-white/80 transition-colors">
      {full && <LuPlus aria-hidden className="size-4 text-ink" />}
      {full && <span className="text-[10px] font-extrabold text-ink">{sizeLabel}</span>}
      {full && <span className="text-[9px] font-bold text-ink-soft">{formatPrice(price)}</span>}
    </span>
  );
}

function FillContent({ fill, number }: { fill: DisplayFill; number: number }) {
  const catalogueCtx = useContext(CatalogueContext);
  const getProduct = (id: string) => catalogueCtx?.getProductById(id) ?? getProductById(id);

  if (fill.source === 'design') {
    return <PosterFaceSvg poster={fill.design} className="size-full" />;
  }

  if (fill.source === 'catalogue') {
    const product = getProduct(fill.productId);
    if (!product) return <Unavailable text="Loading design…" />;

    // If an edited crop preview was generated, display it directly
    if (fill.edit?.previewUrl) {
      return (
        <img
          src={fill.edit.previewUrl}
          alt={product.name}
          className="size-full bg-paper-deep"
          style={{ objectFit: fill.edit.mode }}
          loading="lazy"
        />
      );
    }

    // Standard catalogue product rendering with fallback
    return (
      <div
        className="size-full overflow-hidden bg-paper-deep"
        style={
          fill.edit && !fill.edit.previewUrl
            ? {
                transform: `rotate(${fill.edit.rotation}deg) scale(${fill.edit.zoom})`,
              }
            : undefined
        }
      >
        <ProductImage product={product} className="size-full object-cover object-center" />
      </div>
    );
  }

  // Upload or URL fill
  const src = fill.edit?.previewUrl ?? (fill.source === 'upload' ? fill.objectUrl : fill.url);
  const fit = fill.fit ?? { mode: fill.edit?.mode ?? 'cover', focusX: 50, focusY: 50 };

  return (
    <UserImage
      src={src}
      fit={fit}
      edit={fill.edit}
      alt={`Your image in position ${number}`}
    />
  );
}

/** The customer's image, with fit, focal point, and crop edits applied. */
function UserImage({
  src,
  fit,
  edit,
  alt,
}: {
  src: string;
  fit: { mode: 'cover' | 'contain'; focusX: number; focusY: number };
  edit?: PosterCropEdit;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (failed) return <Unavailable text="Image unavailable" />;

  const isCroppedPreview = Boolean(edit?.previewUrl && src === edit.previewUrl);

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="size-full bg-paper-deep"
      style={{
        objectFit: isCroppedPreview ? edit?.mode ?? 'cover' : fit.mode,
        objectPosition: isCroppedPreview ? 'center' : `${fit.focusX}% ${fit.focusY}%`,
        transform: !isCroppedPreview && edit ? `rotate(${edit.rotation}deg) scale(${edit.zoom})` : undefined,
      }}
    />
  );
}

function Unavailable({ text = 'Image unavailable' }: { text?: string }) {
  return (
    <span className="flex size-full flex-col items-center justify-center gap-1 bg-paper-deep p-1 text-center text-[10px] font-bold text-ink-soft">
      <LuImageOff aria-hidden className="size-4" />
      {text}
    </span>
  );
}
