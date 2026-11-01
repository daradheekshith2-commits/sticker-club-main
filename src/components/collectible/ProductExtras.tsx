/**
 * Extra product-page sections for collectible formats: what's inside a
 * Mystery Pack, how a Matching Duo pairs up, and what a Secret Message
 * product contains. All wording comes from the product's own data.
 */
import { useId } from 'react';
import { LuCircleHelp, LuLock, LuMail, LuPackage } from 'react-icons/lu';
import { getMessageSeries, messageCardSeries, sampleMessageCard } from '../../data/messageCards';
import { getRarity, getSeries, rarityDataSource } from '../../data/rarity';
import { Link } from '../../router/router';
import type { Product, StickerDesign } from '../../types/product';
import type { DuoPairing } from '../../types/collectible';
import { demoPackCode, designOf, mysteryPool, seriesIdForVariant } from '../../utils/collectibles';
import { StickerGroup, StickerSvg } from '../art/Sticker';
import { DemoTag, RarityBadge } from './RarityBadge';

// ---------------------------------------------------------------------------
// Mystery Pack
// ---------------------------------------------------------------------------

export function MysteryPackDetails({ product, variantId }: { product: Product; variantId?: string }) {
  const m = product.mystery;
  if (!m) return null;
  const seriesId = seriesIdForVariant(variantId);
  const theme = getSeries(seriesId);
  const pool = seriesId ? mysteryPool(seriesId) : [];
  const total = m.guaranteedCount + m.mysteryCount;
  return (
    <section aria-labelledby="mystery-inside" className="mt-8 space-y-5">
      <div>
        <h2 id="mystery-inside" className="text-xl font-extrabold">
          What you’re paying for: {total} stickers
        </h2>
        <ol className="mt-3 grid grid-cols-6 gap-1.5 sm:gap-2" aria-label={`${m.guaranteedCount} guaranteed stickers and ${m.mysteryCount} mystery sticker`}>
          {Array.from({ length: total }, (_, i) => {
            const mystery = i >= m.guaranteedCount;
            return (
              <li
                key={i}
                className={`flex aspect-[3/4] flex-col items-center justify-center rounded-xl border-2 text-center ${mystery ? 'border-ink bg-ink text-lime' : 'border-ink/15 bg-white'}`}
              >
                <span className="font-display text-xl font-extrabold sm:text-2xl">{mystery ? '?' : i + 1}</span>
                <span className="mt-0.5 px-0.5 text-[9px] leading-tight font-bold uppercase sm:text-[10px]">{mystery ? 'Mystery' : 'Guaranteed'}</span>
              </li>
            );
          })}
        </ol>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="font-bold">
              {m.guaranteedCount} guaranteed {theme ? `· ${theme.name}` : ''}
            </dt>
            <dd className="text-ink-soft">{m.guaranteedRule}</dd>
          </div>
          <div>
            <dt className="font-bold">{m.mysteryCount} mystery sticker</dt>
            <dd className="text-ink-soft">{m.mysteryRule}</dd>
          </div>
        </dl>
      </div>

      {theme && (
        <div className="rounded-2xl bg-white p-4">
          <h3 className="font-bold">
            {pool.length > m.guaranteedCount
              ? `Your five come from these ${pool.length} ${theme.name} designs`
              : `Your five guaranteed ${theme.name} designs`}
          </h3>
          <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
            {pool.map((p) => {
              const design = designOf(p);
              return (
                <li key={p.id} className="text-center">
                  <Link to={`/product/${p.slug}`} className="group block">
                    {design && <StickerSvg design={design} className="mx-auto h-auto w-full max-w-16" />}
                    <span className="mt-1 block text-[11px] leading-tight font-bold group-hover:underline">{p.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {pool.length > m.guaranteedCount && (
            <p className="mt-3 text-xs text-ink-soft">Which five of these you get is chosen when the pack is put together. You won’t get the same design twice within the five.</p>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border-2 border-ink/10 p-4 text-sm">
          <p className="flex items-center gap-2 font-bold">
            <LuPackage aria-hidden /> Packaging & series code
          </p>
          <p className="mt-1 text-ink-soft">{m.packaging}</p>
          <p className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded bg-paper px-1.5 py-0.5 text-xs font-bold">{demoPackCode(seriesId ?? 'S0X')}</code>
            <DemoTag>Demo number</DemoTag>
          </p>
          <p className="mt-2 text-xs text-ink-soft">
            This pack number is a demo. Real numbers will be pre-printed on production envelopes — the website doesn’t generate them, so they can’t be presented as unique yet.
          </p>
        </div>
        <div className="rounded-2xl border-2 border-ink/10 p-4 text-sm">
          <p className="flex items-center gap-2 font-bold">
            <LuCircleHelp aria-hidden /> Special designs
          </p>
          <ul className="mt-1 space-y-1 text-ink-soft">
            {m.specialVariants.map((v) =>
              v.inventoryConfirmed ? (
                <li key={v.id}>{v.name}: may appear — see the odds below.</li>
              ) : (
                <li key={v.id}>
                  <strong className="text-ink">Not included yet:</strong> {v.name}. We don’t have this stock, so there’s no chance of getting one in this pack.
                </li>
              ),
            )}
          </ul>
        </div>
      </div>

      <OddsDisclosure product={product} />
    </section>
  );
}

/** The odds table: real when configured, otherwise an explicitly-labelled empty example. */
function OddsDisclosure({ product }: { product: Product }) {
  const m = product.mystery!;
  if (m.odds) {
    return (
      <div className="rounded-2xl border-2 border-ink p-4 text-sm">
        <h3 className="font-bold">Odds</h3>
        <table className="mt-2 w-full">
          <tbody>
            {m.odds.map((o) => (
              <tr key={o.label} className="border-t border-ink/10">
                <td className="py-1.5">{o.label}</td>
                <td className="py-1.5 text-right font-bold">{o.chance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border-2 border-dashed border-ink/40 p-4 text-sm">
      <p className="flex flex-wrap items-center gap-2 font-bold">
        Odds disclosure <DemoTag>Example layout — not configured</DemoTag>
      </p>
      <p className="mt-1 text-ink-soft">
        No odds are published because no special stock exists yet. If we ever add special designs, real odds based on the actual print run will appear here before those packs go on sale.
      </p>
      <table className="mt-3 w-full text-ink-soft">
        <caption className="sr-only">Example of the future odds table, with no values</caption>
        <thead>
          <tr className="text-left text-xs uppercase">
            <th className="pb-1 font-bold">Item</th>
            <th className="pb-1 text-right font-bold">Chance per pack</th>
          </tr>
        </thead>
        <tbody>
          {m.specialVariants.map((v) => (
            <tr key={v.id} className="border-t border-ink/10">
              <td className="py-1.5">{v.name}</td>
              <td className="py-1.5 text-right">— not configured</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Matching Duo
// ---------------------------------------------------------------------------

export const pairingTitles: Record<DuoPairing, string> = {
  'two-poses': 'One character, two poses',
  complementary: 'Complementary symbols',
  halves: 'Two halves of one illustration',
  'laptop-phone': 'Laptop + phone-case set',
};

/** Draws the left or right half of a sticker design. */
function HalfSticker({ design, side }: { design: StickerDesign; side: 'left' | 'right' }) {
  const clip = 'h' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <svg viewBox="-6 -6 112 112" className="h-auto w-full" aria-hidden>
      <defs>
        <clipPath id={clip}>
          <rect x={side === 'left' ? -10 : 50} y={-10} width={60} height={120} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <StickerGroup design={design} />
      </g>
    </svg>
  );
}

export function DuoDetails({ product }: { product: Product }) {
  if (!product.duo) return null;
  const pairing = (product.art.kind === 'duo' ? product.art.pairing : product.duo.pairing) || 'complementary';
  const designs = product.art.kind === 'duo' ? product.art.designs : undefined;
  const parts = [
    { name: product.duo.partA, design: designs?.[0], image: product.images?.[0], side: 'left' as const },
    { name: product.duo.partB, design: designs?.[1], image: product.images?.[1], side: 'right' as const },
  ];
  return (
    <section aria-labelledby="duo-pair" className="mt-8 rounded-2xl bg-white p-4">
      <p className="eyebrow">Matching duo</p>
      <h2 id="duo-pair" className="mt-1 text-xl font-extrabold">
        {pairingTitles[pairing]}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">{product.duo.pairNote}</p>
      <ul className="mt-4 grid grid-cols-2 gap-3">
        {parts.map((part) => (
          <li key={part.name} className="rounded-xl bg-paper p-3 text-center">
            <div className="mx-auto w-24 min-h-[96px] flex items-center justify-center">
              {part.image ? (
                <img
                  src={part.image.src}
                  alt={part.name}
                  className="max-h-24 w-auto object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.15)]"
                />
              ) : part.design ? (
                pairing === 'halves' ? <HalfSticker design={part.design} side={part.side} /> : <StickerSvg design={part.design} className="h-auto w-full" />
              ) : null}
            </div>
            <p className="mt-2 text-sm font-bold">{part.name}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm">
        <strong>Sold as one product:</strong> both stickers come together, so you don’t need to buy the halves separately.
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Secret Message
// ---------------------------------------------------------------------------

export function SecretMessageDetails({ product }: { product: Product }) {
  const card = getMessageSeries(product.messageCardId);
  if (!card) return null;
  const mixed = card.id === 'mc-mixed';
  const shown = mixed ? messageCardSeries.filter((s) => s.id !== 'mc-mixed') : [card];
  return (
    <section aria-labelledby="secret-card" className="mt-8 space-y-4">
      <div className="rounded-2xl bg-white p-4">
        <p className="flex items-center gap-2 eyebrow">
          <LuLock aria-hidden /> Secret message
        </p>
        <h2 id="secret-card" className="mt-1 text-xl font-extrabold">
          {product.messageCardCount ?? 1} sealed message card{(product.messageCardCount ?? 1) === 1 ? '' : 's'} inside
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Each card is sealed in a small envelope. We don’t show the messages online so they stay a surprise — but you know exactly which series you’re getting and what kind of message to expect.
        </p>
        <ul className="mt-3 space-y-2">
          {shown.map((s) => (
            <li key={s.id} className="flex gap-3 rounded-xl bg-paper p-3 text-sm">
              <span aria-hidden className="mt-0.5 size-4 shrink-0 rounded-full border-2 border-ink" style={{ backgroundColor: s.color }} />
              <span>
                <strong>{s.name} series.</strong> <span className="text-ink-soft">{s.tone}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <SampleMessageCard />
    </section>
  );
}

/** The one example card shown on the site — clearly marked as a sample. */
export function SampleMessageCard() {
  return (
    <figure className="grid gap-3 rounded-2xl border-2 border-dashed border-ink/30 p-4 sm:grid-cols-[auto_1fr] sm:items-center">
      <div className="mx-auto w-48 rotate-[-3deg] rounded-lg border-2 border-ink bg-paper p-4 shadow-[0_8px_14px_rgba(42,32,22,0.18)]">
        <p className="flex items-center justify-between text-[10px] font-bold tracking-widest uppercase">
          <span className="flex items-center gap-1">
            <LuMail aria-hidden /> Sticker Club
          </span>
          <span>Sample</span>
        </p>
        <p className="mt-3 font-display text-lg leading-tight font-extrabold">“{sampleMessageCard.message}”</p>
      </div>
      <figcaption className="text-sm">
        <span className="flex items-center gap-2 font-bold">
          {sampleMessageCard.heading} <DemoTag>Sample</DemoTag>
        </span>
        <span className="mt-1 block text-ink-soft">{sampleMessageCard.note}</span>
      </figcaption>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Rarity, series and edition rows for the product spec list
// ---------------------------------------------------------------------------

export function CollectibleRows({ product }: { product: Product }) {
  const tier = getRarity(product.rarity);
  const s = getSeries(product.seriesId);
  if (!tier && !s) return null;
  return (
    <>
      {tier && (
        <div className="flex justify-between gap-4 py-3">
          <dt className="font-bold">Rarity</dt>
          <dd className="text-right">
            <RarityBadge rarity={product.rarity} />
            <span className="mt-1 block text-xs text-ink-soft">
              {tier.meaning}
              {rarityDataSource === 'demo' && ' Demo classification — not yet based on real print runs.'}
            </span>
          </dd>
        </div>
      )}
      {s && (
        <div className="flex justify-between gap-4 py-3">
          <dt className="font-bold">Series</dt>
          <dd className="text-right">
            <Link to={`/rare-collections?series=${s.id}`} className="font-bold underline underline-offset-4">
              {s.id} · {s.name}
            </Link>
          </dd>
        </div>
      )}
      {product.edition && (
        <div className="flex justify-between gap-4 py-3">
          <dt className="font-bold">Edition</dt>
          <dd className="text-right text-ink-soft">
            {product.edition.confirmed && product.edition.runSize
              ? `One run of ${product.edition.runSize}, individually numbered`
              : 'Run size to be confirmed — edition numbers appear only once the run is confirmed'}
          </dd>
        </div>
      )}
    </>
  );
}
