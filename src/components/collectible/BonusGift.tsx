import { LuGift } from 'react-icons/lu';
import { activeBonusComponents, bonusGift } from '../../config/bonusGift';
import type { StickerDesign } from '../../types/product';
import { StickerSvg } from '../art/Sticker';

/** "a bonus mini sticker and a small thank-you card" */
function describe(): string {
  const parts = activeBonusComponents().map((c) => c.label.toLowerCase());
  return parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/**
 * The planned "little extra" message, read from src/config/bonusGift.ts.
 * While the policy is 'planned', it says plainly that nothing is packed yet.
 */
export function BonusGiftNote({ compact = false }: { compact?: boolean }) {
  if (!activeBonusComponents().length) return null;
  const planned = bonusGift.status === 'planned';
  return (
    <p className={`flex gap-2 rounded-xl border-2 border-dashed border-ink/25 bg-white ${compact ? 'p-2.5 text-xs' : 'p-3 text-sm'}`}>
      <LuGift aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>
        <strong>{planned ? 'Planned:' : 'Included:'}</strong> {describe()} in every eligible order.
        {planned && ' Not active in this prototype — no real orders are packed yet.'}
      </span>
    </p>
  );
}

const bonusSticker: StickerDesign = { name: 'Bonus', motif: 'sparkle', shape: 'circle', bg: '#121212', fg: '#F5F0E6', accent: '#D4FF3A' };

/** An illustrated, clearly-labelled demonstration of the intended unboxing. */
export function UnboxingPreview() {
  return (
    <figure className="on-light overflow-hidden rounded-[var(--radius-card)] border-2 border-ink bg-[#E9D3AE]">
      <div className="relative aspect-[4/3]">
        {/* the order (a pack) */}
        <div className="absolute top-[14%] left-[8%] w-[40%] -rotate-6 rounded-2xl border-2 border-ink bg-kraft p-3 shadow-[0_10px_18px_rgba(42,32,22,0.25)]">
          <p className="font-display text-sm leading-none font-extrabold sm:text-lg">YOUR ORDER</p>
          <p className="mt-1 text-[10px] font-bold opacity-70 sm:text-xs">Stickers you chose</p>
          <div className="mt-3 h-14 rounded-lg bg-white/60 sm:h-24" />
        </div>
        {/* thank-you card */}
        <div className="absolute top-[22%] right-[8%] w-[38%] rotate-3 rounded-lg border-2 border-ink bg-paper p-3 shadow-[0_10px_18px_rgba(42,32,22,0.25)]">
          <p className="font-display text-sm leading-tight font-extrabold sm:text-xl">Thank you!</p>
          <p className="mt-1 text-[10px] text-ink-soft sm:text-xs">A small handwritten-style note</p>
          <div className="mt-2 space-y-1.5" aria-hidden>
            <span className="block h-1 w-full rounded bg-ink/15" />
            <span className="block h-1 w-4/5 rounded bg-ink/15" />
          </div>
        </div>
        {/* bonus sticker */}
        <div className="absolute bottom-[8%] left-[44%] w-[24%] rotate-12 drop-shadow-[0_8px_8px_rgba(42,32,22,0.3)]">
          <StickerSvg design={bonusSticker} className="h-auto w-full" />
        </div>
        <span className="absolute top-3 left-3 rounded-md border-2 border-dashed border-ink bg-white px-2 py-0.5 text-[11px] font-bold uppercase">Demonstration</span>
      </div>
      <figcaption className="border-t-2 border-ink bg-white p-3 text-sm text-ink-soft">
        How a package is meant to look: your order, a thank-you card and one bonus mini sticker. Illustration only — not a photo of a real package.
      </figcaption>
    </figure>
  );
}
