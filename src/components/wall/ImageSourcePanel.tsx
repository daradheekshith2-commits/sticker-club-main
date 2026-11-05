import { useContext, useState } from 'react';
import {
  LuChevronLeft,
  LuChevronRight,
  LuCrop,
  LuLayoutGrid,
  LuTrash2,
  LuTriangleAlert,
} from 'react-icons/lu';
import { paperSizes, type WallLayout } from '../../data/wallLayouts';
import { getProductById } from '../../utils/catalogue';
import { CatalogueContext } from '../../context/CatalogueContext';
import { apiUrl } from '../../context/AuthContext';
import { isLowResolution, minShortSidePixels, newFit, sizePrice } from '../../utils/customWall';
import { formatPrice } from '../../utils/format';
import { isUserImage, type ImageFit, type PosterCropEdit, type SlotFill } from '../../types/wall';
import { CataloguePosterPicker } from './CataloguePosterPicker';
import { ImageCropControls } from './ImageCropControls';
import { ImageSourcePicker } from '../image/ImageSourcePicker';
import { PosterCropModal } from './PosterCropModal';
import { ProductImage } from '../art/ProductArt';

interface Props {
  layout: WallLayout;
  index: number;
  fill: SlotFill | null;
  onSelect: (index: number) => void;
  onFill: (fill: SlotFill) => void;
  onClear: () => void;
  onFit: (fit: ImageFit) => void;
  onEdit?: (edit: PosterCropEdit) => void;
}

/** Everything for the selected wall position: what's in it, and where a new image comes from. */
export function ImageSourcePanel({
  layout,
  index,
  fill,
  onSelect,
  onFill,
  onClear,
  onFit,
  onEdit,
}: Props) {
  const slot = layout.slots[index];
  const total = layout.slots.length;
  const catalogueCtx = useContext(CatalogueContext);
  const [cropModalOpen, setCropModalOpen] = useState(false);

  if (!slot || total === 0) {
    return (
      <section
        aria-labelledby="slot-panel-title"
        className="rounded-[var(--radius-card)] border-2 border-dashed border-ink/25 bg-white p-6 text-center"
      >
        <h2 id="slot-panel-title" className="font-display text-lg font-extrabold text-ink">
          No sheet selected
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Add sheets to your wall using the toolbar above, then select one to fill it with artwork.
        </p>
      </section>
    );
  }

  const size = paperSizes[slot.size];
  const orientation = slot.orientation ?? 'portrait';
  const price = sizePrice(slot.size);

  const product =
    fill?.source === 'catalogue'
      ? catalogueCtx?.getProductById(fill.productId) ?? getProductById(fill.productId)
      : undefined;

  const current = !fill
    ? 'Empty'
    : fill.source === 'catalogue'
      ? `Our design: ${product?.name ?? 'Poster Design'}`
      : fill.source === 'upload'
        ? `Your photo: ${fill.fileName}`
        : 'Your image from a link';

  const lowRes = isUserImage(fill) && isLowResolution(fill.width, fill.height, slot.size);

  // Determine source image URL for editing
  let activeImageSrc = '';
  if (fill) {
    if (fill.source === 'upload') {
      activeImageSrc = fill.objectUrl;
    } else if (fill.source === 'url') {
      activeImageSrc = fill.url;
    } else if (fill.source === 'catalogue' && product) {
      if (product.images?.[0]?.src) {
        const raw = product.images[0].src;
        activeImageSrc = raw.startsWith('http') || !apiUrl ? raw : `${apiUrl}${raw.startsWith('/') ? '' : '/'}${raw}`;
      }
    }
  }

  return (
    <section
      aria-labelledby="slot-panel-title"
      className="rounded-[var(--radius-card)] border-2 border-ink bg-white p-4 sm:p-5 shadow-sm"
    >
      {/* Position Header and Navigation */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onSelect(index - 1)}
          disabled={index === 0}
          className="grid size-9 place-items-center rounded-full border-2 border-ink/15 disabled:opacity-30 hover:border-ink transition-colors"
          aria-label="Previous position"
        >
          <LuChevronLeft aria-hidden />
        </button>
        <div className="text-center">
          <h2 id="slot-panel-title" className="font-display text-xl font-extrabold text-ink">
            Position {slot.number} of {total} · {size.label}
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-ink-soft">
            <span>
              {slot.w} × {slot.h} cm
            </span>
            <span>·</span>
            <span className="capitalize">{orientation}</span>
            <span>·</span>
            <span className="font-bold text-ink">{formatPrice(price)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onSelect(index + 1)}
          disabled={index === total - 1}
          className="grid size-9 place-items-center rounded-full border-2 border-ink/15 disabled:opacity-30 hover:border-ink transition-colors"
          aria-label="Next position"
        >
          <LuChevronRight aria-hidden />
        </button>
      </div>

      {/* Current Selection Bar */}
      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-paper px-3 py-2 text-sm">
        <span className="min-w-0 truncate text-ink">
          <span className="font-bold">Now:</span> {current}
        </span>
        {fill && (
          <button
            type="button"
            onClick={onClear}
            className="flex shrink-0 items-center gap-1 font-bold text-ink-soft hover:text-danger transition-colors"
          >
            <LuTrash2 aria-hidden className="size-4" /> Remove
          </button>
        )}
      </div>

      {/* Active Poster Preview & Crop Callout */}
      {fill && (
        <div className="mt-3 overflow-hidden rounded-xl border-2 border-ink/15 bg-paper p-3">
          <div className="flex items-center gap-3">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-ink/20 bg-white">
              {fill.edit?.previewUrl ? (
                <img
                  src={fill.edit.previewUrl}
                  alt={current}
                  className="size-full object-cover"
                />
              ) : fill.source === 'catalogue' && product ? (
                <ProductImage product={product} className="size-full object-cover" />
              ) : (
                <img
                  src={fill.source === 'upload' ? fill.objectUrl : (fill as any).url}
                  alt={current}
                  className="size-full object-cover"
                  style={{
                    objectFit: fill.fit?.mode ?? 'cover',
                    objectPosition: `${fill.fit?.focusX ?? 50}% ${fill.fit?.focusY ?? 50}%`,
                  }}
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-sm font-bold truncate text-ink">
                  {fill.source === 'catalogue'
                    ? product?.name ?? 'Catalogue Design'
                    : fill.source === 'upload'
                      ? fill.fileName
                      : 'Linked Image'}
                </span>
              </div>
              <p className="text-xs text-ink-soft">
                {fill.edit
                  ? `Custom ${fill.edit.aspectMode ?? 'sheet'} crop · ${Math.round(fill.edit.zoom * 100)}% zoom`
                  : `Default fit (${fill.fit?.mode ?? 'fill'})`}
              </p>
            </div>

            {/* Prominent Edit / Crop Button */}
            {activeImageSrc && (
              <button
                type="button"
                onClick={() => setCropModalOpen(true)}
                className="btn border-2 border-ink bg-white font-bold text-ink shadow-sm hover:bg-lime hover:text-white transition-colors text-xs py-2 px-3 flex items-center gap-1.5"
              >
                <LuCrop className="size-4" />
                <span>Edit / Crop</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Low Resolution Warning */}
      {lowRes && isUserImage(fill) && (
        <p
          role="status"
          className="mt-3 flex gap-2 rounded-xl border-2 border-tomato/40 bg-tomato/10 p-3 text-sm text-ink"
        >
          <LuTriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-tomato" />
          <span>
            This image is {fill.width} × {fill.height} px, which is small for {size.label}. It will probably look blurry when printed — try a larger image (at least{' '}
            {minShortSidePixels(slot.size)} px on the short side).
          </span>
        </p>
      )}

      {/* Quick In-Place Fit Controls */}
      {isUserImage(fill) && !fill.edit?.previewUrl && (
        <div className="mt-3">
          <ImageCropControls fit={fill.fit} onChange={onFit} />
        </div>
      )}

      {/* Image Source Selection Tabs */}
      <div className="mt-4">
        <p className="mb-2 text-sm font-bold text-ink">
          {fill ? 'Replace with…' : 'Fill this position with…'}
        </p>
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
                  onPick={(productId) =>
                    onFill({
                      source: 'catalogue',
                      productId,
                      fit: newFit(),
                    })
                  }
                />
              ),
            },
          ]}
        />
      </div>

      {/* Crop & Image Editing Modal */}
      {cropModalOpen && fill && activeImageSrc && (
        <PosterCropModal
          isOpen={cropModalOpen}
          onClose={() => setCropModalOpen(false)}
          fill={fill}
          slot={slot}
          imageSrc={activeImageSrc}
          imageAlt={current}
          onApply={(edit) => {
            onEdit?.(edit);
          }}
        />
      )}
    </section>
  );
}
