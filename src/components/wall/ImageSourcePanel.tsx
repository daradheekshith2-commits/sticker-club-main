import { LuChevronLeft, LuChevronRight, LuLayoutGrid, LuTrash2, LuTriangleAlert } from 'react-icons/lu';
import { paperSizes, type WallLayout } from '../../data/wallLayouts';
import { getProductById } from '../../utils/catalogue';
import { isLowResolution, minShortSidePixels, newFit } from '../../utils/customWall';
import { isUserImage, type ImageFit, type SlotFill } from '../../types/wall';
import { CataloguePosterPicker } from './CataloguePosterPicker';
import { ImageCropControls } from './ImageCropControls';
import { ImageSourcePicker } from '../image/ImageSourcePicker';

interface Props {
  layout: WallLayout;
  index: number;
  fill: SlotFill | null;
  onSelect: (index: number) => void;
  onFill: (fill: SlotFill) => void;
  onClear: () => void;
  onFit: (fit: ImageFit) => void;
}

/** Everything for the selected wall position: what's in it, and where a new image comes from. */
export function ImageSourcePanel({ layout, index, fill, onSelect, onFill, onClear, onFit }: Props) {
  const slot = layout.slots[index];
  const size = paperSizes[slot.size];
  const total = layout.slots.length;

  const current = !fill
    ? 'Empty'
    : fill.source === 'catalogue'
      ? `Our design: ${getProductById(fill.productId)?.name ?? 'unknown'}`
      : fill.source === 'upload'
        ? `Your photo: ${fill.fileName}`
        : 'Your image from a link';
  const lowRes = isUserImage(fill) && isLowResolution(fill.width, fill.height, slot.size);

  return (
    <section aria-labelledby="slot-panel-title" className="rounded-[var(--radius-card)] border-2 border-ink bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => onSelect(index - 1)} disabled={index === 0} className="grid size-9 place-items-center rounded-full border-2 border-ink/15 disabled:opacity-30" aria-label="Previous position">
          <LuChevronLeft aria-hidden />
        </button>
        <div className="text-center">
          <h2 id="slot-panel-title" className="font-display text-xl font-extrabold">
            Position {slot.number} of {total} · {size.label}
          </h2>
          <p className="text-xs text-ink-soft">
            {size.w} × {size.h} cm
          </p>
        </div>
        <button type="button" onClick={() => onSelect(index + 1)} disabled={index === total - 1} className="grid size-9 place-items-center rounded-full border-2 border-ink/15 disabled:opacity-30" aria-label="Next position">
          <LuChevronRight aria-hidden />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-paper px-3 py-2 text-sm">
        <span className="min-w-0 truncate">
          <span className="font-bold">Now:</span> {current}
        </span>
        {fill && (
          <button type="button" onClick={onClear} className="flex shrink-0 items-center gap-1 font-bold text-ink-soft hover:text-ink">
            <LuTrash2 aria-hidden className="size-4" /> Remove
          </button>
        )}
      </div>

      {lowRes && isUserImage(fill) && (
        <p role="status" className="mt-3 flex gap-2 rounded-xl border-2 border-tomato/40 bg-tomato/10 p-3 text-sm">
          <LuTriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            This image is {fill.width} × {fill.height} px, which is small for {size.label}. It will probably look blurry when printed — try a larger image (at least{' '}
            {minShortSidePixels(slot.size)} px on the short side).
          </span>
        </p>
      )}

      {isUserImage(fill) && (
        <div className="mt-3">
          <ImageCropControls fit={fill.fit} onChange={onFit} />
        </div>
      )}

      <div className="mt-4">
        <p className="mb-2 text-sm font-bold">{fill ? 'Replace with…' : 'Fill this position with…'}</p>
        <ImageSourcePicker
          key={slot.id /* fresh tabs and inputs for each position */}
          label="Image source for this position"
          onPick={(img) => onFill({ ...img, fit: newFit() })}
          extraTabs={[
            {
              id: 'catalogue',
              label: 'Our designs',
              icon: LuLayoutGrid,
              content: (
                <CataloguePosterPicker
                  currentProductId={fill?.source === 'catalogue' ? fill.productId : undefined}
                  onPick={(productId) => onFill({ source: 'catalogue', productId })}
                />
              ),
            },
          ]}
        />
      </div>
    </section>
  );
}
