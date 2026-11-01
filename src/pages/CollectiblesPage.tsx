/**
 * COLLECTIBLES — /collectibles
 * The hub for the collectible ideas: mystery packs and build-your-own packs
 * first (the main purchases), then duos, secret messages, rarity, passport,
 * voting and the planned bonus gift.
 */
import { LuArrowRight, LuCheck, LuMinus } from 'react-icons/lu';
import { bonusGift } from '../config/bonusGift';
import { packSizes, packSurprise } from '../data/packBuilder';
import { usePageMeta } from '../hooks/usePageMeta';
import { Link } from '../router/router';
import { getProductBySlug } from '../utils/catalogue';
import { formatPrice } from '../utils/format';
import { ProductImage } from '../components/art/ProductArt';
import { StickerSvg } from '../components/art/Sticker';
import { UnboxingPreview } from '../components/collectible/BonusGift';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { SectionHeading } from '../components/ui/SectionHeading';
import type { StickerDesign } from '../types/product';

const tray: StickerDesign[] = [
  { name: 'a', motif: 'chai', shape: 'circle', bg: '#FFD447', fg: '#121212', accent: '#FF5B2E' },
  { name: 'b', motif: 'code', shape: 'rounded', bg: '#8FD3FF', fg: '#121212', accent: '#FF5B2E' },
  { name: 'c', motif: 'cloud', shape: 'blob', bg: '#FFB3D1', fg: '#FFFFFF', accent: '#FF5B2E' },
  { name: 'd', motif: 'car', shape: 'pill', bg: '#8FD3FF', fg: '#121212', accent: '#FF5B2E' },
  { name: 'e', motif: 'pixelHeart', shape: 'rounded', bg: '#8A6CFF', fg: '#FF5B2E', accent: '#FFFFFF' },
];

export function CollectiblesPage() {
  usePageMeta('Collectibles', 'Mystery packs, build-your-own packs, matching duos, secret messages, rare designs and more.');
  const mystery = getProductBySlug('mystery-pack');
  const tiles = [
    { to: '/matching-duos', title: 'Matching duos', body: 'Two coordinated stickers, one product.', slug: 'window-cat-day-and-night' },
    { to: '/secret-messages', title: 'Secret messages', body: 'A message sticker plus a sealed card.', slug: 'main-character-energy' },
    { to: '/rare-collections', title: 'Rare collections', body: 'Every design by series and rarity.', slug: 'midnight-chai' },
    { to: '/collector-passport', title: 'Collector passport', body: 'Stamps per order, a reward for a full card.', slug: null },
  ];
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Collectibles' }]} />
      <h1 className="mt-4 text-5xl leading-[0.95] font-extrabold md:text-7xl">
        Collect them <span className="bg-lime px-1">all.</span>
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-soft">Packs with a surprise, pairs to share, sealed messages and series to complete — all original designs.</p>

      {/* The two main purchases */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {mystery && (
          <Link to="/product/mystery-pack" className="group grid overflow-hidden rounded-[var(--radius-card)] border-2 border-ink bg-white sm:grid-cols-[1fr_1fr]">
            <ProductImage product={mystery} className="aspect-square w-full transition-transform group-hover:scale-[1.03]" />
            <span className="flex flex-col p-5">
              <span className="eyebrow">Mystery sticker pack</span>
              <span className="mt-2 font-display text-3xl leading-none font-extrabold">5 guaranteed + 1 mystery</span>
              <span className="mt-2 text-sm text-ink-soft">Choose a series theme. Five designs come from that theme; the sixth is a surprise.</span>
              <span className="mt-auto pt-4 font-bold">
                {formatPrice(mystery.price)} · <span className="underline underline-offset-4 group-hover:no-underline">Choose a theme</span>
              </span>
            </span>
          </Link>
        )}
        <Link to="/build-your-pack" className="group flex flex-col rounded-[var(--radius-card)] border-2 border-ink bg-lime p-5">
          <span className="eyebrow">Build your own pack</span>
          <span className="mt-2 font-display text-3xl leading-none font-extrabold">Pick exactly what you want</span>
          <span className="mt-2 text-sm">
            Choose {packSizes.map((s) => s.count).join(' or ')} designs, and we add {packSurprise.count} surprise sticker on top.
          </span>
          <span aria-hidden className="mt-5 grid grid-cols-6 gap-2">
            {tray.map((d) => (
              <span key={d.name} className="rounded-xl bg-white/70 p-1">
                <StickerSvg design={d} className="h-auto w-full" />
              </span>
            ))}
            <span className="grid place-items-center rounded-xl bg-ink font-display text-lg font-extrabold text-lime">+?</span>
          </span>
          <span className="mt-auto pt-4 font-bold">
            From {formatPrice(Math.min(...packSizes.map((s) => s.price)))} · <span className="underline underline-offset-4 group-hover:no-underline">Start building</span>
          </span>
        </Link>
      </div>

      {/* Secondary ideas */}
      <ul className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => {
          const product = t.slug ? getProductBySlug(t.slug) : undefined;
          return (
            <li key={t.to}>
              <Link to={t.to} className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border-2 border-ink/10 bg-white transition-colors hover:border-ink">
                {product ? (
                  <ProductImage product={product} className="aspect-square w-full" />
                ) : (
                  <span aria-hidden className="grid aspect-square place-items-center bg-paper-deep">
                    <span className="w-[62%] rotate-[-4deg] rounded-lg border-2 border-ink bg-paper p-2">
                      <span className="block text-[9px] font-bold tracking-widest uppercase">Collector passport</span>
                      <span className="mt-1.5 grid grid-cols-4 gap-1">
                        {Array.from({ length: 8 }, (_, i) => (
                          <span key={i} className={`aspect-square rounded-full border-2 ${i < 3 ? 'border-ink bg-lime' : 'border-dashed border-ink/40'}`} />
                        ))}
                      </span>
                    </span>
                  </span>
                )}
                <span className="flex flex-1 flex-col p-4">
                  <span className="font-display text-lg leading-tight font-extrabold group-hover:underline">{t.title}</span>
                  <span className="mt-1 text-sm text-ink-soft">{t.body}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Vote */}
      <Link to="/vote-next-drop" className="group mt-4 flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-card)] border border-lime/40 bg-paper-deep p-5 text-ink shadow-[inset_0_0_60px_rgba(255,16,38,0.12)] sm:p-6">
        <span>
          <span className="eyebrow text-cinema-red">Let customers design the next drop</span>
          <span className="mt-1 block font-display text-2xl font-extrabold md:text-3xl">Vote on next month’s theme</span>
          <span className="mt-1 block text-sm text-ink/80">Automotive, campus humour, cute art, tech or gaming-inspired — and send us your own idea.</span>
        </span>
        <span className="btn-accent">
          Vote now <LuArrowRight aria-hidden />
        </span>
      </Link>

      {/* The Unexpected Gift */}
      <section aria-labelledby="gift-title" className="mt-20 grid items-center gap-8 md:grid-cols-[1fr_1fr]">
        <UnboxingPreview />
        <div>
          <SectionHeading id="gift-title" eyebrow="The unexpected gift" title={bonusGift.headline} />
          <p className="-mt-2 text-ink-soft">
            {bonusGift.status === 'planned' ? 'Planned for when we start packing real orders' : 'Included today'} · eligible orders: {bonusGift.eligibility.toLowerCase()}
          </p>
          <ul className="mt-4 space-y-2">
            {bonusGift.components.map((c) => (
              <li key={c.id} className={`flex gap-3 rounded-xl p-3 text-sm ${c.active ? 'bg-white' : 'border-2 border-dashed border-ink/15'}`}>
                {c.active ? <LuCheck aria-hidden className="mt-0.5 size-4 shrink-0" /> : <LuMinus aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-soft" />}
                <span>
                  <strong>{c.label}</strong>
                  {c.active ? <span className="text-ink-soft"> — {c.description}</span> : <span className="text-ink-soft"> — not offered: {c.inactiveReason}</span>}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-ink-soft">Extras are kept small so every order still covers its costs. Nothing here is a discount or a coupon.</p>
        </div>
      </section>
    </div>
  );
}
