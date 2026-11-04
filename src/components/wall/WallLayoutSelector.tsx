import { LuMove, LuPlus } from 'react-icons/lu';
import { builderLayouts, sizeSummary } from '../../data/wallLayouts';
import { wallPrice } from '../../utils/customWall';
import { formatPrice } from '../../utils/format';
import { WallCanvas } from './WallCanvas';

interface WallLayoutSelectorProps {
  value: string;
  onChange: (layoutId: string) => void;
  customSlotCount?: number;
}

/** Step 1: pick a layout. Cards show preset layouts and the "Create your own wall" option. */
export function WallLayoutSelector({ value, onChange, customSlotCount }: WallLayoutSelectorProps) {
  const isCustomActive = value === 'custom';

  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">Choose a wall layout</legend>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-5">
        {builderLayouts.map((layout) => {
          const active = layout.id === value;
          return (
            <label
              key={layout.id}
              className={`relative flex w-60 shrink-0 cursor-pointer snap-start flex-col rounded-2xl border-2 bg-white p-3 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ink sm:w-auto ${
                active ? 'border-ink ring-2 ring-lime ring-offset-2 ring-offset-paper' : 'border-ink/10 hover:border-ink/50'
              }`}
            >
              <input type="radio" name="wall-layout" value={layout.id} checked={active} onChange={() => onChange(layout.id)} className="sr-only" />
              <span className="flex h-32 items-center justify-center rounded-xl bg-paper px-3">
                <WallCanvas layout={layout} fills={[]} detail="thumb" className="max-w-40" label={`${layout.name} layout preview`} />
              </span>
              <span className="mt-3 flex items-baseline justify-between gap-2">
                <span className="font-display text-lg font-extrabold">{layout.name}</span>
                <span className="text-sm font-bold">{formatPrice(wallPrice(layout))}</span>
              </span>
              <span className="text-xs font-bold text-ink-soft">
                {layout.slots.length} posters · {sizeSummary(layout)}
              </span>
              <span className="mt-1 text-sm text-ink-soft">{layout.description}</span>
            </label>
          );
        })}

        {/* 5th option: Create your own wall */}
        <label
          className={`relative flex w-60 shrink-0 cursor-pointer snap-start flex-col rounded-2xl border-2 bg-white p-3 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ink sm:w-auto ${
            isCustomActive ? 'border-ink ring-2 ring-lime ring-offset-2 ring-offset-paper' : 'border-ink/10 hover:border-ink/50'
          }`}
        >
          <input
            type="radio"
            name="wall-layout"
            value="custom"
            checked={isCustomActive}
            onChange={() => onChange('custom')}
            className="sr-only"
          />
          <span className="relative flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-ink/25 bg-lime/15 px-3">
            <span className="flex items-center gap-1.5 rounded-full border border-ink/20 bg-white px-3 py-1 text-xs font-extrabold text-ink shadow-sm">
              <LuPlus className="size-3.5 text-cinema-red" />
              <LuMove className="size-3 text-ink-soft" />
              Custom Wall
            </span>
            <span className="mt-2 text-[11px] font-bold text-ink-soft">
              Freely drag & arrange
            </span>
          </span>
          <span className="mt-3 flex items-baseline justify-between gap-2">
            <span className="font-display text-lg font-extrabold text-ink">Create your own</span>
            <span className="text-sm font-bold text-ink">From ₹90</span>
          </span>
          <span className="text-xs font-bold text-ink-soft">
            {customSlotCount && customSlotCount > 0
              ? `${customSlotCount} sheet${customSlotCount === 1 ? '' : 's'} on canvas`
              : 'Any combination · A5, A4, A3'}
          </span>
          <span className="mt-1 text-sm text-ink-soft">
            Start from scratch. Add, resize, drag to arrange, and fill each sheet.
          </span>
        </label>
      </div>
    </fieldset>
  );
}
