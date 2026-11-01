/**
 * POSTER SHOP SECTIONS — the merchandising shown on /shop?category=posters
 * before the full catalogue: hero, shop by interest, three shopping paths,
 * ready-made wall packs, the wall-builder promo, a split-poster concept and
 * the buying guide. All content comes from the catalogue and layout data.
 */
import { useEffect, useState } from 'react';
import { LuArrowRight, LuCheck, LuPlus } from 'react-icons/lu';
import { collections } from '../../data/collections';
import { posterSizes, products } from '../../data/products';
import { builderLayouts, getLayout, paperSizes, sizeSummary, type PaperSizeId } from '../../data/wallLayouts';
import { useCart } from '../../context/CartContext';
import { Link } from '../../router/router';
import type { PosterDesign, Product } from '../../types/product';
import type { DisplayFill } from '../../types/wall';
import { isPurchasable, shopUrl } from '../../utils/catalogue';
import { packSavings } from '../../utils/customWall';
import { formatPrice, pluralise } from '../../utils/format';
import { PosterFaceSvg } from '../art/ProductArt';
import { WallCanvas } from '../wall/WallCanvas';
import { WallPackPreview } from '../wall/WallPackPreview';

const singlePosters = products.filter((p) => p.productType === 'poster' && isPurchasable(p));
const wallPacks = products.filter((p) => p.productType === 'poster-set' && p.wallLayoutId);
const designOf = (p: Product): PosterDesign | undefined => (p.art.kind === 'poster' ? p.art.poster : undefined);
const designFills = (slugs: string[]): DisplayFill[] =>
  slugs.flatMap((slug) => {
    const d = products.find((p) => p.slug === slug);
    const design = d && designOf(d);
    return design ? [{ source: 'design' as const, design }] : [];
  });

/** Stand-in artwork for "your photo" in illustrations (clearly labelled, not a product). */
const yourPhoto: DisplayFill = {
  source: 'design',
  design: { title: 'YOUR\nPHOTO', bg: '#E9E3D6', fg: '#121212', accent: '#FF5B2E', motif: 'smiley', pattern: 'dots' },
};

// ---------------------------------------------------------------------------

/** Posters above a desk: an original scene built from our own designs. */
function DeskScene() {
  const layout = getLayout('compact')!;
  const fills = designFills(['one-more-chapter-poster', 'ship-it-poster', 'chai-o-clock-poster', 'press-start-poster', 'side-a-poster']);
  return (
    <div aria-hidden className="relative overflow-hidden rounded-[var(--radius-card)] border-2 border-ink bg-[#EDE6D8]">
      <div className="px-[10%] pt-[8%] pb-[22%]">
        <WallCanvas layout={layout} fills={fills} detail="thumb" />
      </div>
      {/* desk, laptop, lamp and plant */}
      <svg viewBox="0 0 400 90" className="absolute inset-x-0 bottom-0 w-full" preserveAspectRatio="none">
        <rect x="0" y="52" width="400" height="38" fill="#C9A57A" />
        <rect x="0" y="48" width="400" height="8" fill="#121212" />
      </svg>
      <svg viewBox="0 0 400 120" className="absolute inset-x-0 bottom-[6%] w-full">
        <g transform="translate(150 50)">
          <rect x="0" y="0" width="100" height="56" rx="6" fill="#2B2B30" />
          <rect x="-10" y="56" width="120" height="8" rx="3" fill="#3A3A40" />
          <circle cx="50" cy="28" r="9" fill="#D4FF3A" />
        </g>
        <g transform="translate(40 30)">
          <path d="M10 84 L22 20" stroke="#121212" strokeWidth="5" />
          <path d="M0 26 L34 6 L40 26 Z" fill="#FF5B2E" />
          <rect x="0" y="82" width="30" height="6" rx="3" fill="#121212" />
        </g>
        <g transform="translate(320 52)">
          <path d="M6 30 h28 l-4 34 h-20 z" fill="#FF5B2E" />
          <path d="M20 30 C10 10 2 12 0 0 C14 4 18 14 20 30 C22 10 30 4 40 2 C36 16 28 18 20 30" fill="#7FE0B5" stroke="#121212" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

export function PosterShopHero() {
  const from = Math.min(...singlePosters.map((p) => p.price));
  return (
    <section aria-labelledby="shop-title" className="on-light mt-4 grid items-center gap-6 rounded-[var(--radius-card)] border-2 border-ink bg-sky p-5 sm:p-8 lg:grid-cols-[1fr_minmax(0,460px)] lg:py-7">
      <div>
        <p className="eyebrow text-ink">The poster shop</p>
        <h1 id="shop-title" className="mt-2 text-[2.6rem] leading-[0.95] font-extrabold sm:text-6xl">
          Your wall.
          <br />
          Your vibe.
        </h1>
        <p className="mt-3 max-w-md">
          Pick single prints in A5, A4 or A3, grab a ready-made wall pack, or build your own collage from our designs and your photos. Prints from{' '}
          <strong>{formatPrice(from)}</strong>.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/build-your-wall" className="btn-primary">
            Build your own wall <LuArrowRight aria-hidden />
          </Link>
          <Link to={shopUrl({ category: 'posters', types: ['poster-set'] })} className="btn-ghost bg-white">
            Shop wall packs
          </Link>
        </div>
      </div>
      <div className="hidden sm:block">
        <DeskScene />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

export function PosterInterestTiles() {
  const tiles = collections
    .map((c) => ({ c, items: singlePosters.filter((p) => p.collections.includes(c.id)) }))
    .filter((t) => t.items.length > 0);
  return (
    <section aria-labelledby="poster-interests" className="mt-10">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 id="poster-interests" className="text-2xl font-extrabold md:text-3xl">
          Shop by interest
        </h2>
        <Link to="/vibes" className="flex items-center gap-1 text-sm font-bold underline underline-offset-4">
          All vibes <LuArrowRight aria-hidden className="size-3.5" />
        </Link>
      </div>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0 lg:grid-cols-9">
        {tiles.map(({ c, items }) => {
          const design = designOf(items[0]);
          return (
            <li key={c.id} className="w-32 shrink-0 snap-start sm:w-auto">
              <Link to={shopUrl({ category: 'posters', collections: [c.id] })} className="group block">
                <span className="block overflow-hidden rounded-xl border-2 border-ink/10 p-2.5 transition-colors group-hover:border-ink" style={{ backgroundColor: c.color }}>
                  {design && <PosterFaceSvg poster={design} className="mx-auto aspect-[1/1.414] w-3/4 shadow-[0_3px_8px_rgba(42,32,22,0.25)] transition-transform group-hover:-rotate-2" />}
                </span>
                <span className="mt-2 block text-sm leading-tight font-bold">{c.name}</span>
                <span className="text-xs text-ink-soft">{pluralise(items.length, 'poster')}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------

function MixMatchArt() {
  const picks = designFills(['redline-poster', 'soft-days-poster', 'tiny-sparks-poster']);
  const sizes: PaperSizeId[] = ['a5', 'a4', 'a3'];
  return (
    <div aria-hidden className="flex h-full items-end justify-center gap-[4%] px-[8%] pb-[10%]">
      {picks.map((fill, i) =>
        fill.source === 'design' ? (
          <div key={i} className="relative bg-white p-[2%] shadow-[0_3px_8px_rgba(42,32,22,0.2)]" style={{ width: `${(paperSizes[sizes[i]].w / 70) * 100}%` }}>
            <PosterFaceSvg poster={fill.design} className="aspect-[1/1.414] w-full" />
            <span className="absolute -top-2 -right-2 rounded bg-ink px-1 text-[10px] font-bold text-lime">{paperSizes[sizes[i]].label}</span>
          </div>
        ) : null,
      )}
    </div>
  );
}

export function PosterShoppingPaths() {
  const pack = wallPacks.find((p) => p.slug === 'desk-wall-pack') ?? wallPacks[0];
  const classic = getLayout('classic')!;
  const buildFills: DisplayFill[] = [
    ...designFills(['press-start-poster']),
    yourPhoto,
    ...designFills(['last-lap-poster', 'soft-days-poster']),
    yourPhoto,
    ...designFills(['tiny-sparks-poster', 'side-a-poster']),
    yourPhoto,
  ];
  const paths = [
    {
      title: 'Ready-made wall packs',
      body: 'Matching prints chosen to hang together. One pick, a finished wall.',
      cta: 'Shop wall packs',
      to: shopUrl({ category: 'posters', types: ['poster-set'] }),
      art: pack ? <WallPackPreview product={pack} className="size-full" /> : null,
      bg: '#D6F0FF',
    },
    {
      title: 'Build your own wall',
      body: 'Choose a layout, then mix our designs with your own photos. See the price as you go.',
      cta: 'Start building',
      to: '/build-your-wall',
      art: (
        <div className="flex size-full items-center px-[10%]">
          <WallCanvas layout={classic} fills={buildFills} detail="thumb" label="Example custom wall mixing our designs and your photos" />
        </div>
      ),
      bg: '#EEFFC2',
    },
    {
      title: 'Mix and match',
      body: `Pick any single print in ${posterSizes.map((s) => s.label).join(', ')} and build your own set.`,
      cta: 'Browse single posters',
      to: shopUrl({ category: 'posters', types: ['poster'] }),
      art: <MixMatchArt />,
      bg: '#FFE0EC',
    },
  ];
  return (
    <section aria-labelledby="poster-paths" className="mt-12">
      <h2 id="poster-paths" className="text-2xl font-extrabold md:text-3xl">
        Three ways to fill a wall
      </h2>
      <ul className="mt-4 grid gap-4 md:grid-cols-3">
        {paths.map((p) => (
          <li key={p.title}>
            <Link to={p.to} className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border-2 border-ink bg-white transition-transform hover:-translate-y-1">
              <span className="block aspect-[16/10] overflow-hidden" style={{ backgroundColor: p.bg }}>
                {p.art}
              </span>
              <span className="flex flex-1 flex-col p-5">
                <span className="font-display text-2xl font-extrabold">{p.title}</span>
                <span className="mt-1 text-ink-soft">{p.body}</span>
                <span className="mt-auto inline-flex items-center gap-1 pt-4 font-bold group-hover:underline">
                  {p.cta} <LuArrowRight aria-hidden />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------

/** One ready-made pack: the arrangement is the hero image. */
export function WallPackCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const layout = product.wallLayoutId ? getLayout(product.wallLayoutId) : undefined;
  const savings = packSavings(product);
  const url = `/product/${product.slug}`;
  useEffect(() => {
    if (!added) return;
    const t = window.setTimeout(() => setAdded(false), 1600);
    return () => window.clearTimeout(t);
  }, [added]);
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border-2 border-ink bg-white">
      <WallPackPreview product={product} className="aspect-[4/3]" />
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-2xl font-extrabold">
          <Link to={url} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {product.name}
          </Link>
        </h3>
        {layout && (
          <p className="text-sm font-bold text-ink-soft">
            {layout.slots.length} posters · {sizeSummary(layout)}
          </p>
        )}
        <p className="mt-2 text-sm text-ink-soft">{product.shortDescription}</p>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
          <div>
            <p className="font-display text-2xl font-extrabold">{formatPrice(product.price)}</p>
            {savings && (
              <p className="text-xs text-ink-soft">
                {formatPrice(savings.saving)} less than the same prints bought singly ({formatPrice(savings.singlesTotal)}) · test prices
              </p>
            )}
          </div>
          {isPurchasable(product) && (
            <button
              type="button"
              onClick={() => {
                addItem(product.id, 1);
                setAdded(true);
              }}
              className={`relative z-10 inline-flex h-11 items-center gap-1.5 rounded-full border-2 border-ink px-4 text-sm font-bold ${added ? 'bg-ink text-lime' : 'bg-lime hover:bg-ink hover:text-lime'}`}
              aria-label={added ? `${product.name} added to cart` : `Add ${product.name} to cart`}
            >
              {added ? <LuCheck aria-hidden /> : <LuPlus aria-hidden />} {added ? 'Added' : 'Add pack'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function WallPacksSection() {
  if (!wallPacks.length) return null;
  return (
    <section aria-labelledby="wall-packs" className="mt-14">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="eyebrow">Ready-made</p>
          <h2 id="wall-packs" className="text-2xl font-extrabold md:text-3xl">
            Wall packs
          </h2>
        </div>
        <Link to={shopUrl({ category: 'posters', types: ['poster-set'] })} className="flex items-center gap-1 text-sm font-bold underline underline-offset-4">
          See all packs <LuArrowRight aria-hidden className="size-3.5" />
        </Link>
      </div>
      <ul className="grid gap-5 md:grid-cols-2">
        {wallPacks.map((p) => (
          <li key={p.id}>
            <WallPackCard product={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------

export function BuildWallPromo() {
  const layout = builderLayouts.find((l) => l.id === 'classic')!;
  const fills: DisplayFill[] = [
    yourPhoto,
    ...designFills(['one-more-chapter-poster']),
    yourPhoto,
    ...designFills(['chai-o-clock-poster', 'redline-poster']),
    yourPhoto,
    ...designFills(['do-it-scared-poster', 'soft-days-poster']),
  ];
  const steps = ['Choose a layout — 5 to 15 posters', 'Fill each spot with our designs, your photos or an image link', 'Check the preview and price, then add it to your cart'];
  return (
    <section aria-labelledby="build-promo" className="mt-14 grid items-center gap-8 rounded-[var(--radius-card)] border border-mint/15 bg-paper-deep p-6 text-ink md:grid-cols-[1fr_1.1fr] md:p-10">
      <div>
        <p className="text-xs font-bold tracking-[0.18em] text-cinema-red uppercase">New · Build your own wall</p>
        <h2 id="build-promo" className="mt-2 text-4xl leading-[1] font-extrabold md:text-5xl">
          Your pictures. Your posters. Your wall.
        </h2>
        <ol className="mt-6 space-y-3">
          {steps.map((s, i) => (
            <li key={s} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-lime text-sm font-bold text-ink">{i + 1}</span>
              <span className="pt-0.5">{s}</span>
            </li>
          ))}
        </ol>
        <Link to="/build-your-wall" className="btn mt-7 bg-lime text-ink hover:-translate-y-0.5">
          Start building <LuArrowRight aria-hidden />
        </Link>
      </div>
      <div className="rounded-2xl bg-[#EDE6D8] px-[6%] pt-[7%] pb-[5%]">
        <WallCanvas layout={layout} fills={fills} detail="thumb" label="Example wall mixing our designs with your photos" />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

/** One wide artwork split across three panels. Concept only — no split products exist yet. */
function SplitArt() {
  return (
    <svg viewBox="0 0 330 150" className="w-full" aria-hidden>
      <defs>
        <clipPath id="split-panels">
          <rect x="0" y="0" width="104" height="150" />
          <rect x="113" y="0" width="104" height="150" />
          <rect x="226" y="0" width="104" height="150" />
        </clipPath>
      </defs>
      <g clipPath="url(#split-panels)">
        <rect width="330" height="150" fill="#8FD3FF" />
        <circle cx="165" cy="96" r="58" fill="#FFD447" />
        {Array.from({ length: 6 }, (_, i) => (
          <rect key={i} x="0" y={98 + i * 9} width="330" height="4.5" fill="#FF5B2E" opacity={0.85 - i * 0.1} />
        ))}
        <path d="M0 150 L70 92 L120 128 L190 70 L260 120 L330 84 V150 Z" fill="#121212" />
        <text x="18" y="34" fontSize="22" fontWeight="800" fill="#121212" style={{ fontFamily: 'var(--font-display)' }}>
          GOLDEN HOUR
        </text>
      </g>
    </svg>
  );
}

export function SplitPosterSection() {
  const splits = products.filter((p) => p.tags.includes('split poster') && isPurchasable(p));
  return (
    <section aria-labelledby="split-posters" className="mt-14 grid items-center gap-6 rounded-[var(--radius-card)] border-2 border-dashed border-ink/30 p-6 md:grid-cols-[1fr_1.2fr] md:p-8">
      <div>
        <p className="eyebrow">{splits.length ? 'Three-piece' : 'Concept preview'}</p>
        <h2 id="split-posters" className="mt-1 text-2xl font-extrabold md:text-3xl">
          Three-piece split posters
        </h2>
        <p className="mt-2 text-ink-soft">
          One big artwork printed across three panels, hung side by side.{' '}
          {splits.length ? '' : 'We don’t sell these yet — this is a demo of the idea. Tell us if you’d hang one.'}
        </p>
        <Link to={splits.length ? shopUrl({ category: 'posters', query: 'split poster' }) : '/contact'} className="btn-ghost mt-4">
          {splits.length ? 'Shop split posters' : 'Tell us you’re interested'}
        </Link>
      </div>
      <div className="relative rounded-2xl bg-[#EDE6D8] p-6">
        {!splits.length && <span className="absolute top-3 left-3 rounded-full border-2 border-ink bg-white px-2.5 py-0.5 text-[11px] font-bold uppercase">Demo artwork</span>}
        <div className="mx-auto max-w-sm pt-4 drop-shadow-[0_4px_6px_rgba(42,32,22,0.25)]">
          <SplitArt />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

export function PosterBuyingGuide() {
  return (
    <section aria-labelledby="poster-guide" className="mt-20 border-t-2 border-ink pt-10">
      <p className="eyebrow mb-2">Buying guide</p>
      <h2 id="poster-guide" className="text-3xl font-extrabold md:text-4xl">
        Sizes, packs and what’s still being confirmed
      </h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-[var(--radius-card)] bg-white p-5">
          <h3 className="text-lg font-extrabold">Poster sizes</h3>
          <table className="mt-3 w-full text-sm">
            <caption className="sr-only">Poster sizes and test prices</caption>
            <thead>
              <tr className="text-left text-ink-soft">
                <th className="pb-1 font-bold">Size</th>
                <th className="pb-1 font-bold">cm</th>
                <th className="pb-1 text-right font-bold">Test price</th>
              </tr>
            </thead>
            <tbody>
              {posterSizes.map((s) => {
                const p = paperSizes[s.id as PaperSizeId];
                return (
                  <tr key={s.id} className="border-t border-ink/10">
                    <td className="py-1.5 font-bold">{s.label}</td>
                    <td className="py-1.5">{p ? `${p.w} × ${p.h}` : s.detail}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatPrice(s.price)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-ink-soft">A5 suits desks and small gaps, A4 is the all-rounder, A3 makes a centrepiece.</p>
        </div>
        <div className="rounded-[var(--radius-card)] bg-white p-5">
          <h3 className="text-lg font-extrabold">Wall packs & custom walls</h3>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-soft">
            <li>Wall packs are matching prints sold together, at one price.</li>
            <li>Custom walls cost the sum of each poster’s size price — no hidden extras, no bundle discount yet.</li>
            <li>Removable mounting putty or tape is usually kindest to hostel and PG walls.</li>
          </ul>
        </div>
        <div className="rounded-[var(--radius-card)] bg-white p-5">
          <h3 className="text-lg font-extrabold">Still to be confirmed</h3>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-soft">
            <li>Paper type, weight and finish — we’re testing printer samples first.</li>
            <li>Final prices, delivery and pickup details.</li>
            <li>How we’ll receive your photos for custom walls. Nothing is uploaded in this prototype.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
