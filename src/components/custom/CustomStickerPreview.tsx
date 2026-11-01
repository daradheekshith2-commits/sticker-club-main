/**
 * Live preview of a custom sticker: the customer's image with a simulated
 * white die-cut border and a soft shadow.
 *
 * Done purely with CSS (border/padding for shapes, stacked drop-shadow filters
 * for "follow the shape"), so it works for images from other websites too —
 * nothing reads the image's pixels (no canvas), which cross-origin images
 * wouldn't allow. This is an illustration, NOT a production cut path.
 */
import { useEffect, useState } from 'react';
import { LuImageOff } from 'react-icons/lu';
import type { CustomStickerShape } from '../../data/customStickerOptions';
import { imageSrc, type PickedImage } from '../../types/image';

/** Several hard white shadows in a ring = an outline that follows transparent edges. */
const contourFilter = (px: number) =>
  [0, 45, 90, 135, 180, 225, 270, 315]
    .map((deg) => {
      const r = (deg * Math.PI) / 180;
      return `drop-shadow(${(Math.cos(r) * px).toFixed(1)}px ${(Math.sin(r) * px).toFixed(1)}px 0 #fff)`;
    })
    .join(' ') + ' drop-shadow(0 6px 8px rgba(42,32,22,0.28))';

interface Props {
  image: PickedImage | null;
  shape: CustomStickerShape;
  /** 0–1, relative size (Small/Medium/Large). */
  scale?: number;
  /** 'full' = big configurator preview; 'thumb' = cart thumbnail. */
  variant?: 'full' | 'thumb';
  surface?: 'laptop' | 'plain';
}

export function CustomStickerPreview({ image, shape, scale = 1, variant = 'full', surface = 'plain' }: Props) {
  const [failed, setFailed] = useState(false);
  const src = image ? imageSrc(image) : null;
  useEffect(() => setFailed(false), [src]);
  const full = variant === 'full';
  const border = full ? 10 : 3;

  let sticker;
  if (!src) {
    sticker = (
      <div className="grid aspect-square w-full place-items-center rounded-[22%] border-4 border-dashed border-ink/25 bg-white/60 p-4 text-center text-sm font-bold text-ink-soft">
        {full ? 'Your image appears here' : ''}
      </div>
    );
  } else if (failed) {
    sticker = (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-[22%] bg-paper-deep p-3 text-center text-xs font-bold text-ink-soft">
        <LuImageOff aria-hidden className="size-5" />
        {full ? 'This image can’t be shown any more. Try uploading the file.' : 'Unavailable'}
      </div>
    );
  } else if (shape === 'contour') {
    sticker = (
      <img
        src={src}
        alt={full ? 'Your sticker design' : ''}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="aspect-square w-full object-contain"
        style={{ filter: contourFilter(full ? 6 : 1.5) }}
      />
    );
  } else {
    const radius = shape === 'circle' ? '9999px' : '22%';
    sticker = (
      <div
        className="aspect-square w-full bg-white shadow-[0_8px_14px_rgba(42,32,22,0.25)]"
        style={{ borderRadius: radius, padding: border }}
      >
        <img
          src={src}
          alt={full ? 'Your sticker design' : ''}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-full object-cover"
          style={{ borderRadius: shape === 'circle' ? '9999px' : `calc(22% - ${border / 2}px)` }}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative grid aspect-square w-full place-items-center overflow-hidden ${full ? 'rounded-[var(--radius-card)]' : 'rounded-lg'} ${
        surface === 'laptop' ? 'bg-[#2B2B30]' : 'bg-[#EDE6D8]'
      }`}
    >
      {surface === 'laptop' && full && <div aria-hidden className="absolute inset-x-0 bottom-0 h-[6%] bg-[#3A3A40]" />}
      <div className="-rotate-3 transition-[width] duration-200" style={{ width: `${Math.round(scale * (full ? 62 : 74))}%` }}>
        {sticker}
      </div>
    </div>
  );
}
