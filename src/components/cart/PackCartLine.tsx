import { LuTrash2 } from 'react-icons/lu';
import type { PackCartLine as PackLine } from '../../utils/cart';
import { getPackFinish, packLabel } from '../../utils/customPack';
import { designOf } from '../../utils/collectibles';
import { formatPrice } from '../../utils/format';
import { StickerSvg } from '../art/Sticker';
import { QuantitySelector } from '../product/QuantitySelector';

/** A Build Your Own Pack in the cart: the chosen designs, the surprise, finish, quantity and remove. */
export function PackCartLine({ line, onQuantity, onRemove, compact = false }: { line: PackLine; onQuantity?: (n: number) => void; onRemove?: () => void; compact?: boolean }) {
  const { pack, designs } = line;
  const label = packLabel(pack);
  return (
    <div>
      <div className="flex justify-between gap-2">
        <p className="leading-tight font-bold">{label}</p>
        <span className="font-bold tabular-nums">{formatPrice(line.lineTotal)}</span>
      </div>
      <ul className="mt-2 flex flex-wrap gap-1" aria-label="Designs in this pack">
        {designs.map((p) => {
          const design = designOf(p);
          return (
            <li key={p.id} className={compact ? 'w-7' : 'w-9'} title={p.name}>
              {design && <StickerSvg design={design} title={p.name} className="h-auto w-full" />}
            </li>
          );
        })}
        <li className={`${compact ? 'size-7 text-xs' : 'size-9 text-sm'} grid place-items-center rounded-full bg-ink font-extrabold text-lime`} title="Surprise sticker">
          <span aria-hidden>+?</span>
          <span className="sr-only">plus {pack.surprise.count} surprise sticker</span>
        </li>
      </ul>
      <p className="mt-1 text-sm text-ink-soft">
        {getPackFinish(pack.finishId)?.label ?? pack.finishId} finish · {compact ? `${line.quantity} × ` : ''}
        {formatPrice(line.unitPrice)} {compact ? '' : 'per pack'}
      </p>
      {!compact && onQuantity && onRemove && (
        <div className="mt-2 flex items-center justify-between">
          <QuantitySelector size="sm" allowZero label={`Quantity of ${label}`} value={line.quantity} onChange={onQuantity} />
          <button type="button" onClick={onRemove} className="flex items-center gap-1 text-sm text-ink-soft hover:text-ink" aria-label={`Remove ${label}`}>
            <LuTrash2 aria-hidden className="size-4" /> Remove
          </button>
        </div>
      )}
    </div>
  );
}
