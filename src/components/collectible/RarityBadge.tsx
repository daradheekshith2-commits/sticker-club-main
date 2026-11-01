import { LuSparkles } from 'react-icons/lu';
import { getRarity, rarityDataSource } from '../../data/rarity';
import type { RarityId } from '../../types/collectible';

/** A small rarity label. Says "demo" while rarity data isn't from real print runs. */
export function RarityBadge({ rarity, showDemo = false, className = '' }: { rarity: RarityId | undefined; showDemo?: boolean; className?: string }) {
  const tier = getRarity(rarity);
  if (!tier) return null;
  const demo = rarityDataSource === 'demo';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border-2 border-ink px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase ${className}`}
      style={{ backgroundColor: tier.bg, color: tier.fg }}
      title={demo ? `${tier.label} — demo classification` : tier.label}
    >
      {(tier.id === 'rare' || tier.id === 'limited') && <LuSparkles aria-hidden className="size-3" />}
      {tier.label}
      {showDemo && demo && <span className="font-medium normal-case opacity-80">· demo</span>}
    </span>
  );
}

/** A visible "Demo" marker for prototype data (votes, passports, codes). */
export function DemoTag({ children = 'Demo' }: { children?: string }) {
  return (
    <span className="inline-flex items-center rounded-md border-2 border-dashed border-ink bg-white px-1.5 py-0.5 text-[11px] font-bold tracking-wide uppercase">{children}</span>
  );
}

/** Frame classes for the rarity explorer — distinctive but restrained. */
export function rarityFrameClass(rarity: RarityId | undefined): string {
  switch (getRarity(rarity)?.frame) {
    case 'dashed':
      return 'border-2 border-dashed border-ink';
    case 'double':
      return 'border-[5px] border-double border-ink';
    case 'foil':
      // A soft lime-to-white sheen to suggest a special print, without claiming a real foil.
      return 'border-2 border-ink bg-[linear-gradient(135deg,#d4ff3a_0%,#ffffff_45%,#d4ff3a_100%)] p-1';
    default:
      return 'border-2 border-ink/15';
  }
}
