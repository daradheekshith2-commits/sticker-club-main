import { LuTrash2 } from 'react-icons/lu';
import { sizeSummary } from '../../data/wallLayouts';
import type { WallCartLine as WallLine } from '../../utils/cart';
import { formatPrice } from '../../utils/format';
import { isUserImage } from '../../types/wall';
import { QuantitySelector } from '../product/QuantitySelector';
import { WallCanvas } from '../wall/WallCanvas';

/** A custom wall in the cart: mini preview, what's in it, quantity and remove. */
export function WallCartLine({
  line,
  onQuantity,
  onRemove,
  compact = false,
}: {
  line: WallLine;
  onQuantity?: (n: number) => void;
  onRemove?: () => void;
  /** Checkout summary: no controls. */
  compact?: boolean;
}) {
  const { wall, layout } = line;
  const own = wall.slots.filter((s) => isUserImage(s.fill));
  const uploads = own.filter((s) => s.fill.source === 'upload').length;
  const name = `Custom wall · ${wall.layoutName}`;
  return (
    <div className="flex gap-4">
      <div className={`${compact ? 'w-14' : 'w-20'} flex shrink-0 items-center justify-center self-start rounded-xl border-2 border-ink/10 bg-[#EDE6D8] p-1.5`}>
        <WallCanvas layout={layout} fills={wall.slots.map((s) => s.fill)} detail="thumb" label={`${name} preview`} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-between gap-2">
          <p className="leading-tight font-bold">{name}</p>
          <span className="font-bold tabular-nums">{formatPrice(line.lineTotal)}</span>
        </div>
        <p className="text-sm text-ink-soft">
          {layout.slots.length} posters · {sizeSummary(layout)}
        </p>
        <p className="text-sm text-ink-soft">
          {compact ? `${line.quantity} × ` : ''}
          {formatPrice(line.unitPrice)} {compact ? '' : 'each'}
          {own.length > 0 && <span className="ml-1.5 rounded bg-ink px-1 text-[11px] font-bold text-lime">{own.length} of your images</span>}
        </p>
        {!compact && (
          <p className="mt-1 text-xs text-ink-soft">
            Custom walls aren’t saved yet{uploads > 0 ? ' (device photos are temporary)' : ''} — this one leaves the cart if you refresh the page.
          </p>
        )}
        {!compact && onQuantity && onRemove && (
          <div className="mt-auto flex items-center justify-between pt-2">
            <QuantitySelector size="sm" allowZero label={`Quantity of ${name}`} value={line.quantity} onChange={onQuantity} />
            <button type="button" onClick={onRemove} className="flex items-center gap-1 text-sm text-ink-soft hover:text-ink" aria-label={`Remove ${name}`}>
              <LuTrash2 aria-hidden className="size-4" /> Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
