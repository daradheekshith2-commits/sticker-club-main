import { useId } from 'react';
import { LuShoppingBag } from 'react-icons/lu';
import type { WallLayout } from '../../data/wallLayouts';
import { priceBreakdown, wallPrice } from '../../utils/customWall';
import { formatPrice } from '../../utils/format';

interface Props {
  layout: WallLayout;
  filled: number;
  usesOwnImages: boolean;
  rightsConfirmed: boolean;
  onRightsChange: (v: boolean) => void;
  onAdd: () => void;
}

/** Price breakdown from central price data, image-rights confirmation and the add-to-cart button. */
export function WallPriceSummary({ layout, filled, usesOwnImages, rightsConfirmed, onRightsChange, onAdd }: Props) {
  const id = useId();
  const total = layout.slots.length;
  const complete = filled === total;
  const blocked = !complete ? `Fill all ${total} positions to continue (${total - filled} to go).` : usesOwnImages && !rightsConfirmed ? 'Please confirm you have the rights to your images.' : null;

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-[var(--radius-card)] border-2 border-ink bg-white p-4 sm:p-5">
      <div className="flex items-baseline justify-between">
        <h2 id={`${id}-title`} className="font-display text-xl font-extrabold">
          Your wall
        </h2>
        <p className="text-sm font-bold" aria-live="polite">
          {filled} of {total} filled
        </p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-deep" aria-hidden>
        <div className="h-full rounded-full bg-ink transition-[width]" style={{ width: `${(filled / total) * 100}%` }} />
      </div>

      <dl className="mt-4 space-y-1.5 text-sm">
        {priceBreakdown(layout).map((row) => (
          <div key={row.size} className="flex justify-between">
            <dt>
              {row.count} × {row.label} poster{row.count === 1 ? '' : 's'} <span className="text-ink-soft">@ {formatPrice(row.unit)}</span>
            </dt>
            <dd className="tabular-nums">{formatPrice(row.total)}</dd>
          </div>
        ))}
        <div className="flex justify-between border-t-2 border-ink pt-2 text-base">
          <dt className="font-bold">Total</dt>
          <dd className="font-display text-2xl font-extrabold tabular-nums">{formatPrice(wallPrice(layout))}</dd>
        </div>
      </dl>
      <p className="mt-1 text-xs text-ink-soft">Prototype prices — the sum of each poster’s current test price, awaiting supplier quotes. No bundle discount is applied.</p>

      {usesOwnImages && (
        <div className="mt-4 rounded-xl bg-paper p-3">
          <label className="flex cursor-pointer gap-2.5 text-sm">
            <input type="checkbox" checked={rightsConfirmed} onChange={(e) => onRightsChange(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-ink" />
            <span className="font-bold">I confirm that I own this image or have permission to reproduce it.</span>
          </label>
          <p className="mt-2 text-xs text-ink-soft">
            Finding an image on Pinterest, Google or social media doesn’t give you permission to print it — that usually belongs to the photographer or artist. Your own
            photos are always fine.
          </p>
        </div>
      )}

      <button type="button" onClick={onAdd} disabled={Boolean(blocked)} className="btn-primary mt-4 w-full py-4 text-base" aria-describedby={blocked ? `${id}-blocked` : undefined}>
        <LuShoppingBag aria-hidden /> Add wall to cart · {formatPrice(wallPrice(layout))}
      </button>
      {blocked && (
        <p id={`${id}-blocked`} className="mt-2 text-center text-sm text-ink-soft">
          {blocked}
        </p>
      )}
      <p className="mt-3 text-xs text-ink-soft">
        This is a prototype: adding to the cart doesn’t send an order or your images anywhere. The preview shows the arrangement, not final print quality.
      </p>
    </section>
  );
}
