import { LuTrash2 } from 'react-icons/lu';
import { customStickerShapes, customStickerSizes } from '../../data/customStickerOptions';
import type { StickerCartLine as StickerLine } from '../../utils/cart';
import { formatPrice } from '../../utils/format';
import { QuantitySelector } from '../product/QuantitySelector';
import { CustomStickerPreview } from '../custom/CustomStickerPreview';

/** A custom sticker in the cart: preview, configuration, quantity and remove. */
export function StickerCartLine({
  line,
  onQuantity,
  onRemove,
  compact = false,
}: {
  line: StickerLine;
  onQuantity?: (n: number) => void;
  onRemove?: () => void;
  compact?: boolean;
}) {
  const { sticker } = line;
  const shape = customStickerShapes.find((s) => s.id === sticker.shape)?.label ?? sticker.shape;
  const size = customStickerSizes.find((s) => s.id === sticker.sizeId);
  return (
    <div className="flex gap-4">
      <div className={`${compact ? 'w-14' : 'w-20'} shrink-0 self-start`}>
        <CustomStickerPreview image={sticker.image} shape={sticker.shape} variant="thumb" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-between gap-2">
          <p className="leading-tight font-bold">{sticker.label}</p>
          <span className="font-bold tabular-nums">{formatPrice(line.lineTotal)}</span>
        </div>
        <p className="text-sm text-ink-soft">
          {shape} · {size?.dimensions ?? 'size to be confirmed'} · {sticker.image.source === 'upload' ? 'your upload' : 'image link'}
        </p>
        <p className="text-sm text-ink-soft">
          {compact ? `${line.quantity} × ` : ''}
          {formatPrice(line.unitPrice)} {compact ? '' : 'each'}
        </p>
        {!compact && (
          <p className="mt-1 text-xs text-ink-soft">
            Custom stickers aren’t saved yet{sticker.image.source === 'upload' ? ' (your upload is temporary)' : ''} — this one leaves the cart if you refresh the page.
          </p>
        )}
        {!compact && onQuantity && onRemove && (
          <div className="mt-auto flex items-center justify-between pt-2">
            <QuantitySelector size="sm" allowZero label={`Quantity of ${sticker.label}`} value={line.quantity} onChange={onQuantity} />
            <button type="button" onClick={onRemove} className="flex items-center gap-1 text-sm text-ink-soft hover:text-ink" aria-label={`Remove ${sticker.label}`}>
              <LuTrash2 aria-hidden className="size-4" /> Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
