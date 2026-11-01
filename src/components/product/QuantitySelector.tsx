import { LuMinus, LuPlus } from 'react-icons/lu';
import { MAX_QUANTITY_PER_ITEM } from '../../utils/cart';

interface Props {
  value: number;
  onChange: (next: number) => void;
  /** Allow going down to 0 (used in the cart, where 0 = remove). */
  allowZero?: boolean;
  size?: 'sm' | 'md';
  label: string;
}

/** − [ 2 ] + control. The buttons can never produce an invalid quantity. */
export function QuantitySelector({ value, onChange, allowZero = false, size = 'md', label }: Props) {
  const min = allowZero ? 0 : 1;
  const btn = size === 'sm' ? 'size-8' : 'size-11';
  return (
    <div role="group" aria-label={label} className="inline-flex items-center rounded-full border-2 border-ink bg-white">
      <button
        type="button"
        className={`${btn} grid place-items-center rounded-full hover:bg-paper-deep disabled:opacity-30`}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={value === 1 && allowZero ? 'Remove one (removes item)' : 'Decrease quantity'}
      >
        <LuMinus aria-hidden className="size-4" />
      </button>
      <span aria-live="polite" className={`${size === 'sm' ? 'w-7 text-sm' : 'w-10'} text-center font-bold tabular-nums`}>
        {value}
      </span>
      <button
        type="button"
        className={`${btn} grid place-items-center rounded-full hover:bg-paper-deep disabled:opacity-30`}
        onClick={() => onChange(Math.min(MAX_QUANTITY_PER_ITEM, value + 1))}
        disabled={value >= MAX_QUANTITY_PER_ITEM}
        aria-label="Increase quantity"
      >
        <LuPlus aria-hidden className="size-4" />
      </button>
    </div>
  );
}
