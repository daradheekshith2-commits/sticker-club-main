import { useId } from 'react';
import { LuShoppingBag, LuTriangleAlert } from 'react-icons/lu';
import type { WallLayout } from '../../data/wallLayouts';
import { priceBreakdown, wallPrice } from '../../utils/customWall';
import { formatPrice } from '../../utils/format';

interface Props {
  layout: WallLayout;
  filled: number;
  usesOwnImages: boolean;
  rightsConfirmed: boolean;
  hasOverlaps?: boolean;
  onRightsChange: (v: boolean) => void;
  onAdd: () => void;
}

/** Price breakdown from central price data, image-rights confirmation and the add-to-cart button. */
export function WallPriceSummary({
  layout,
  filled,
  usesOwnImages,
  rightsConfirmed,
  hasOverlaps,
  onRightsChange,
  onAdd,
}: Props) {
  const id = useId();
  const total = layout.slots.length;
  const complete = total > 0 && filled === total;
  const breakdown = priceBreakdown(layout);
  const subtotal = wallPrice(layout);

  const blocked =
    total === 0
      ? 'Add at least one sheet to your wall.'
      : hasOverlaps
        ? 'Some sheets are overlapping. Please move them apart or click Auto-arrange before adding to cart.'
        : !complete
          ? `Fill all ${total} positions to continue (${total - filled} to go).`
          : usesOwnImages && !rightsConfirmed
            ? 'Please confirm you have the rights to your images.'
            : null;

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-[var(--radius-card)] border-2 border-ink bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h2 id={`${id}-title`} className="font-display text-xl font-extrabold text-ink">
          {layout.isCustom ? 'Custom wall' : 'Your wall'}
        </h2>
        <p className="text-sm font-bold text-ink" aria-live="polite">
          {total === 0 ? 'Empty wall' : `${filled} of ${total} filled`}
        </p>
      </div>

      {total > 0 && (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-deep" aria-hidden>
          <div
            className={`h-full rounded-full transition-[width] ${complete ? 'bg-mint' : 'bg-ink'}`}
            style={{ width: `${Math.min(100, (filled / total) * 100)}%` }}
          />
        </div>
      )}

      {hasOverlaps && (
        <p role="alert" className="mt-3 flex items-start gap-1.5 rounded-lg border border-tomato/40 bg-tomato/10 p-2.5 text-xs font-bold text-tomato">
          <LuTriangleAlert className="size-4 shrink-0 mt-0.5" />
          Overlapping sheets detected. Adjust layout to enable checkout.
        </p>
      )}

      <dl className="mt-4 space-y-1.5 text-sm">
        {breakdown.length === 0 ? (
          <p className="text-sm text-ink-soft italic">No sheets added yet.</p>
        ) : (
          breakdown.map((row) => (
            <div key={row.size} className="flex justify-between">
              <dt className="text-ink">
                {row.count} × {row.label} poster{row.count === 1 ? '' : 's'} <span className="text-ink-soft">at {formatPrice(row.unit)}</span>
              </dt>
              <dd className="tabular-nums font-bold text-ink">{formatPrice(row.total)}</dd>
            </div>
          ))
        )}
        <div className="flex justify-between border-t-2 border-ink pt-2 text-base">
          <dt className="font-bold text-ink">Wall subtotal</dt>
          <dd className="font-display text-2xl font-extrabold tabular-nums text-ink">{formatPrice(subtotal)}</dd>
        </div>
      </dl>
      <p className="mt-1 text-xs text-ink-soft">
        Per-sheet pricing: A5 = ₹90 · A4 = ₹120 · A3 = ₹150. High-resolution print layout.
      </p>

      {usesOwnImages && (
        <div className="mt-4 rounded-xl bg-paper p-3">
          <label className="flex cursor-pointer gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={rightsConfirmed}
              onChange={(e) => onRightsChange(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-ink"
            />
            <span className="font-bold text-ink">I confirm that I own this image or have permission to reproduce it.</span>
          </label>
          <p className="mt-2 text-xs text-ink-soft">
            Finding an image on Pinterest, Google or social media doesn’t give you permission to print it. Your own photos are always fine.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={onAdd}
        disabled={Boolean(blocked)}
        className="btn-primary mt-4 w-full py-4 text-base"
        aria-describedby={blocked ? `${id}-blocked` : undefined}
      >
        <LuShoppingBag aria-hidden /> Add wall to cart · {formatPrice(subtotal)}
      </button>
      {blocked && (
        <p id={`${id}-blocked`} className="mt-2 text-center text-sm font-medium text-ink-soft">
          {blocked}
        </p>
      )}
      <p className="mt-3 text-xs text-ink-soft">
        The preview displays your high-resolution layout arrangement ready for print.
      </p>
    </section>
  );
}
