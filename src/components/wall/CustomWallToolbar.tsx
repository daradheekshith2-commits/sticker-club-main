import { LuArrowDown, LuArrowLeft, LuArrowRight, LuArrowUp, LuCopy, LuLayoutGrid, LuPlus, LuRotateCw, LuTrash2, LuTriangleAlert } from 'react-icons/lu';
import { paperSizes, type PaperSizeId, type WallSlot } from '../../data/wallLayouts';
import { MAX_CUSTOM_SHEETS } from '../../utils/customLayoutBuilder';
import { sizePrice } from '../../utils/customWall';
import { formatPrice } from '../../utils/format';

interface CustomWallToolbarProps {
  slots: WallSlot[];
  selectedIndex: number;
  overlappingIds: Set<string>;
  onAddSheet: (size: PaperSizeId) => void;
  onRemoveSlot: (index: number) => void;
  onDuplicateSlot: (index: number) => void;
  onChangeSize: (index: number, newSize: PaperSizeId) => void;
  onToggleOrientation: (index: number) => void;
  onNudge: (index: number, dx: number, dy: number) => void;
  onAutoArrange: () => void;
  onClearAll: () => void;
}

export function CustomWallToolbar({
  slots,
  selectedIndex,
  overlappingIds,
  onAddSheet,
  onRemoveSlot,
  onDuplicateSlot,
  onChangeSize,
  onToggleOrientation,
  onNudge,
  onAutoArrange,
  onClearAll,
}: CustomWallToolbarProps) {
  const selectedSlot = slots[selectedIndex] as WallSlot | undefined;
  const isAtMax = slots.length >= MAX_CUSTOM_SHEETS;
  const hasOverlaps = overlappingIds.size > 0;

  return (
    <div className="space-y-4 rounded-[var(--radius-card)] border-2 border-ink bg-white p-4 shadow-sm sm:p-5">
      {/* 1. Add Sheet Controls with Prices */}
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-base font-extrabold text-ink sm:text-lg">
            Add sheets to your wall
          </h3>
          <span className="text-xs font-bold text-ink-soft">
            {slots.length} of {MAX_CUSTOM_SHEETS} max
          </span>
        </div>
        <p className="mt-0.5 text-xs text-ink-soft">
          Choose any size. Mix and match freely on your wall.
        </p>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(['a5', 'a4', 'a3'] as PaperSizeId[]).map((size) => {
            const p = paperSizes[size];
            const price = sizePrice(size);
            return (
              <button
                key={size}
                type="button"
                onClick={() => onAddSheet(size)}
                disabled={isAtMax}
                aria-label={`Add ${p.label} sheet at ${formatPrice(price)}`}
                className="group flex flex-col items-center justify-center rounded-xl border-2 border-ink/20 bg-paper-deep/60 p-2.5 text-center transition-all hover:border-ink hover:bg-lime disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="flex items-center gap-1 font-display text-base font-extrabold text-ink">
                  <LuPlus aria-hidden className="size-4 transition-transform group-hover:scale-125" />
                  {p.label}
                </span>
                <span className="text-xs font-bold text-ink-soft">
                  {p.w} × {p.h} cm
                </span>
                <span className="mt-1 rounded-full bg-ink px-2 py-0.5 text-xs font-extrabold text-lime">
                  {formatPrice(price)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Overlap Notice */}
      {hasOverlaps && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border-2 border-tomato/50 bg-tomato/10 p-3 text-sm text-ink"
        >
          <LuTriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-tomato" />
          <div className="flex-1">
            <p className="font-extrabold text-tomato">Some sheets are overlapping</p>
            <p className="text-xs text-ink-soft">
              Drag them apart, use the nudge buttons, or click Auto-arrange below to align them without overlaps.
            </p>
          </div>
          <button
            type="button"
            onClick={onAutoArrange}
            className="btn-ghost shrink-0 border border-tomato/40 bg-white py-1 text-xs font-bold text-tomato hover:bg-tomato hover:text-white"
          >
            Fix overlaps
          </button>
        </div>
      )}

      {/* 3. Selected Sheet Actions (when a sheet is selected) */}
      {selectedSlot && (
        <div className="rounded-xl border border-ink/15 bg-paper p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 pb-2">
            <div>
              <span className="font-display text-sm font-extrabold text-ink">
                Selected: Sheet #{selectedSlot.number} · {paperSizes[selectedSlot.size].label} ({selectedSlot.orientation ?? 'portrait'})
              </span>
              <span className="ml-2 text-xs font-bold text-ink-soft">
                {formatPrice(sizePrice(selectedSlot.size))}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onDuplicateSlot(selectedIndex)}
                disabled={isAtMax}
                title="Duplicate this sheet"
                className="flex items-center gap-1 rounded-lg border border-ink/20 bg-white px-2.5 py-1 text-xs font-bold hover:border-ink hover:bg-lime disabled:opacity-40"
              >
                <LuCopy aria-hidden className="size-3.5" /> Duplicate
              </button>
              <button
                type="button"
                onClick={() => onRemoveSlot(selectedIndex)}
                title="Remove this sheet"
                className="flex items-center gap-1 rounded-lg border border-tomato/30 bg-white px-2.5 py-1 text-xs font-bold text-tomato hover:border-tomato hover:bg-tomato hover:text-white"
              >
                <LuTrash2 aria-hidden className="size-3.5" /> Remove
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Change Size */}
            <div>
              <p className="mb-1 text-xs font-bold text-ink-soft">Change size:</p>
              <div className="flex gap-1.5" role="group" aria-label="Change sheet size">
                {(['a5', 'a4', 'a3'] as PaperSizeId[]).map((size) => {
                  const active = selectedSlot.size === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => onChangeSize(selectedIndex, size)}
                      aria-pressed={active}
                      className={`flex-1 rounded-lg border py-1 text-xs font-extrabold transition-colors ${
                        active
                          ? 'border-ink bg-ink text-lime'
                          : 'border-ink/20 bg-white text-ink hover:border-ink'
                      }`}
                    >
                      {paperSizes[size].label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Toggle Orientation */}
            <div>
              <p className="mb-1 text-xs font-bold text-ink-soft">Orientation:</p>
              <button
                type="button"
                onClick={() => onToggleOrientation(selectedIndex)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-ink/20 bg-white py-1 text-xs font-extrabold text-ink hover:border-ink hover:bg-lime"
              >
                <LuRotateCw aria-hidden className="size-3.5" />
                Switch to {selectedSlot.orientation === 'landscape' ? 'Portrait' : 'Landscape'}
              </button>
            </div>
          </div>

          {/* Directional Nudge (Accessible non-drag alternative) */}
          <div className="mt-3 border-t border-ink/10 pt-2.5">
            <p className="mb-1.5 text-xs font-bold text-ink-soft">
              Nudge position (alternative to dragging):
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => onNudge(selectedIndex, 0, -3)}
                aria-label="Move sheet up"
                className="flex items-center gap-1 rounded-lg border border-ink/20 bg-white px-2.5 py-1 text-xs font-bold hover:border-ink hover:bg-paper-deep"
              >
                <LuArrowUp aria-hidden /> Up
              </button>
              <button
                type="button"
                onClick={() => onNudge(selectedIndex, 0, 3)}
                aria-label="Move sheet down"
                className="flex items-center gap-1 rounded-lg border border-ink/20 bg-white px-2.5 py-1 text-xs font-bold hover:border-ink hover:bg-paper-deep"
              >
                <LuArrowDown aria-hidden /> Down
              </button>
              <button
                type="button"
                onClick={() => onNudge(selectedIndex, -3, 0)}
                aria-label="Move sheet left"
                className="flex items-center gap-1 rounded-lg border border-ink/20 bg-white px-2.5 py-1 text-xs font-bold hover:border-ink hover:bg-paper-deep"
              >
                <LuArrowLeft aria-hidden /> Left
              </button>
              <button
                type="button"
                onClick={() => onNudge(selectedIndex, 3, 0)}
                aria-label="Move sheet right"
                className="flex items-center gap-1 rounded-lg border border-ink/20 bg-white px-2.5 py-1 text-xs font-bold hover:border-ink hover:bg-paper-deep"
              >
                <LuArrowRight aria-hidden /> Right
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Canvas-wide actions: Auto-arrange & Clear */}
      {slots.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink/10 pt-3">
          <button
            type="button"
            onClick={onAutoArrange}
            className="flex items-center gap-1.5 rounded-full border-2 border-ink/20 bg-white px-3.5 py-1.5 text-xs font-bold text-ink transition-colors hover:border-ink hover:bg-lime"
          >
            <LuLayoutGrid aria-hidden className="size-4" /> Auto-arrange grid
          </button>
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-bold text-ink-soft underline underline-offset-2 hover:text-tomato"
          >
            Clear all sheets
          </button>
        </div>
      )}
    </div>
  );
}
