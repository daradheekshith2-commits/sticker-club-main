/**
 * HOMEPAGE "SHOP BY VIBE"
 *
 * Five cards: one large card on the left and four smaller ones (2×2 on desktop).
 * Anime, Movies, Cars & Bikes and Marvel use layered sticker compositions built
 * from the catalogue's own original artwork. The Cute & Aesthetic card keeps
 * its original markup exactly (see CuteCard).
 *
 * Motion (all in src/index.css, all switched off for prefers-reduced-motion):
 * - .reveal-item   — cards fade/rise in once, staggered, when the section is first seen
 * - .sticker-float — selected stickers bob gently, each with its own timing
 * - .twinkle       — small stars/marks pulse softly
 * - hover          — the card lifts with a hard shadow and the artwork nudges up
 */
import type { CSSProperties, ReactNode } from 'react';
import { LuArrowRight } from 'react-icons/lu';
import { collections, type Collection } from '../../data/collections';
import { useCatalogue } from '../../context/CatalogueContext';
import { useReveal } from '../../hooks/useReveal';
import { Link } from '../../router/router';
import type { CollectionId, Product, StickerDesign } from '../../types/product';
import { getProductBySlug, shopUrl } from '../../utils/catalogue';
import { designOf } from '../../utils/collectibles';
import { vibeCountLabel, vibeCounts } from '../../utils/vibes';
import { motifs } from '../art/motifs';
import { StickerSvg } from '../art/Sticker';
import { SectionHeading } from '../ui/SectionHeading';

// ---------------------------------------------------------------------------
// Art building blocks
// ---------------------------------------------------------------------------

/** The artwork of a catalogue product, so the cards always match what's on sale. */
const art = (slug: string): StickerDesign | undefined => {
  const p = getProductBySlug(slug);
  return p ? designOf(p) : undefined;
};

type Float = { dur: number; delay?: number; y?: number; r?: number };

/** One die-cut sticker placed in a composition. `className` sets position, width (in cqmin) and rotation. */
function Piece({ slug, className, float }: { slug: string; className: string; float?: Float }) {
  const design = art(slug);
  if (!design) return null;
  const style = float
    ? ({ '--float-dur': `${float.dur}s`, '--float-delay': `${float.delay ?? 0}s`, '--float-y': `${float.y ?? -6}px`, '--float-r': `${float.r ?? 1.5}deg` } as CSSProperties)
    : undefined;
  return (
    <span className={`absolute block ${className}`}>
      <span className={`block ${float ? 'sticker-float' : ''}`} style={style}>
        <StickerSvg design={design} className="h-auto w-full drop-shadow-[0_5px_0_rgba(18,18,18,0.14)]" />
      </span>
    </span>
  );
}

/** A small four-point star that twinkles. */
function Twinkle({ className, delay = 0, color = '#121212' }: { className: string; delay?: number; color?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={`absolute twinkle ${className}`} style={{ animationDelay: `${delay}s` }} aria-hidden>
      <path d="M10 0 C11 8 12 9 20 10 C12 11 11 12 10 20 C9 12 8 11 0 10 C8 9 9 8 10 0 Z" fill={color} />
    </svg>
  );
}

/** Comic-style motion marks. */
function Marks({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <svg viewBox="0 0 30 30" className={`absolute twinkle ${className}`} style={{ animationDelay: `${delay}s` }} aria-hidden>
      <path d="M4 26 L12 18 M2 14 L11 12 M14 4 L16 12" stroke="#121212" strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

/** A box whose children size themselves in cqmin, so compositions scale with the card. */
function ArtBox({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span aria-hidden className={`pointer-events-none block [container-type:size] transition-transform duration-300 ease-out group-hover:-translate-y-1.5 ${className}`}>
      {children}
    </span>
  );
}

function AnimeArt() {
  return (
    <>
      <Piece slug="sparkle-eyes" className="top-[4%] left-[4%] w-[60cqmin] -rotate-6" float={{ dur: 6, y: -7 }} />
      <Piece slug="plot-twist" className="top-[2%] right-[3%] w-[40cqmin] rotate-[9deg]" float={{ dur: 5.2, delay: -1.5, r: -2 }} />
      <Piece slug="speed-star" className="right-[16%] bottom-[2%] w-[33cqmin] -rotate-[10deg]" float={{ dur: 4.6, delay: -0.8, y: -5 }} />
      <Piece slug="ramen-break" className="bottom-0 left-[38%] w-[29cqmin] rotate-[7deg]" />
      <Twinkle className="top-[58%] left-[2%] w-[8cqmin]" />
      <Twinkle className="top-[44%] right-[2%] w-[6cqmin]" delay={0.9} color="#FFFFFF" />
      <Twinkle className="bottom-[8%] left-[24%] w-[5cqmin]" delay={1.6} />
      <Marks className="top-[0%] left-[58%] w-[10cqmin]" delay={0.4} />
    </>
  );
}

function MoviesArt() {
  return (
    <>
      <Piece slug="popcorn-hour" className="top-0 right-[2%] w-[40cqmin] rotate-[8deg]" />
      <Piece slug="take-one" className="top-[12%] left-0 w-[60cqmin] -rotate-[8deg]" float={{ dur: 5.6, y: -6 }} />
      <Piece slug="admit-one" className="right-0 bottom-[4%] w-[62cqmin] rotate-[10deg]" float={{ dur: 4.8, delay: -1.2, r: -1.5 }} />
      <Twinkle className="top-[4%] left-[8%] w-[9cqmin]" delay={0.5} color="#FFFFFF" />
    </>
  );
}

function AutomotiveArt() {
  return (
    <>
      <Piece slug="redline-coupe" className="top-[0%] left-[0%] w-[60cqmin] -rotate-[9deg]" float={{ dur: 6, y: -5 }} />
      <Piece slug="lid-on" className="right-[0%] bottom-[2%] w-[44cqmin] rotate-[11deg]" float={{ dur: 5.2, delay: -1.2, r: -2 }} />
      <Piece slug="apex-flag" className="right-[1%] top-[0%] w-[29cqmin] rotate-[8deg]" />
      <Marks className="bottom-[0%] left-[8%] w-[9cqmin]" />
    </>
  );
}

function MarvelArt() {
  return (
    <>
      <Piece slug="hero-emblem" className="top-0 right-[4%] w-[34cqmin] rotate-[10deg]" />
      <Piece slug="cape-mode" className="top-[8%] left-[2%] w-[60cqmin] -rotate-[6deg]" float={{ dur: 5.4, y: -8 }} />
      <Piece slug="ka-pow" className="right-0 bottom-0 w-[50cqmin] rotate-[12deg]" float={{ dur: 4.4, delay: -1, r: 2.5 }} />
      <Marks className="top-[2%] left-[58%] w-[12cqmin]" />
      <Marks className="bottom-[10%] left-[2%] w-[10cqmin] rotate-180" delay={1.1} />
    </>
  );
}

const smallArt: Partial<Record<CollectionId, () => ReactNode>> = { movies: MoviesArt, quotes: AutomotiveArt, marvel: MarvelArt };

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

const cardBase =
  'on-light group relative flex h-full overflow-hidden rounded-[var(--radius-card)] border-2 border-ink p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_6px_0_0_#121212]';

/** The large left card (Anime): artwork fills the upper part, text stays below it — never on top of it. */
function LargeCard({ c, products }: { c: Collection; products: Product[] }) {
  return (
    <Link to={shopUrl({ collections: [c.id] })} className={`${cardBase} min-h-[22rem] flex-col md:min-h-[30rem]`} style={{ backgroundColor: c.color }}>
      <span className="relative z-10 text-xs font-bold tracking-widest uppercase">{vibeCountLabel(vibeCounts(c.id, products))}</span>
      {/* The flexible spacer takes the free height; the art layer fills it absolutely, which gives the cqmin units a definite size. */}
      <span className="relative mt-3 block min-h-48 flex-1">
        <ArtBox className="absolute inset-0">
          <AnimeArt />
        </ArtBox>
      </span>
      <span className="relative z-10 mt-4 block">
        <span className="block font-display text-3xl leading-none font-extrabold md:text-4xl">{c.name}</span>
        <span className="mt-2 block max-w-sm text-sm">{c.blurb}</span>
      </span>
    </Link>
  );
}

/** A smaller card: text on the left (max 55%), artwork in a square on the right (40%), so they can't overlap. */
function SmallCard({ c, products }: { c: Collection; products: Product[] }) {
  const Art = smallArt[c.id];
  return (
    <Link to={shopUrl({ collections: [c.id] })} className={`${cardBase} min-h-40 flex-col justify-between`} style={{ backgroundColor: c.color }}>
      {Art && (
        <ArtBox className="absolute right-2 bottom-2 aspect-square w-[40%] max-w-44">
          <Art />
        </ArtBox>
      )}
      <span className="relative z-10 text-xs font-bold tracking-widest uppercase">{vibeCountLabel(vibeCounts(c.id, products))}</span>
      <span className="relative z-10 mt-8 block max-w-[55%]">
        <span className="block font-display text-2xl leading-none font-extrabold md:text-3xl">{c.name}</span>
        <span className="mt-2 hidden text-sm sm:block">{c.blurb}</span>
      </span>
    </Link>
  );
}

/** Cute & Aesthetic — the original card, unchanged (only the count wording uses the shared grammar helper). */
function CuteCard({ c, products }: { c: Collection; products: Product[] }) {
  const Motif = motifs[c.motif];
  return (
    <Link
      to={shopUrl({ collections: [c.id] })}
      className="on-light group relative flex h-full min-h-40 flex-col justify-between overflow-hidden rounded-[var(--radius-card)] border-2 border-ink p-5 transition-transform hover:-translate-y-1"
      style={{ backgroundColor: c.color }}
    >
      <svg viewBox="0 0 100 100" className="absolute -right-3 -bottom-3 size-20 opacity-90 transition-transform group-hover:rotate-6 sm:size-28 md:size-40" aria-hidden>
        <Motif fg="#121212" bg={c.color} accent="#FFFFFF" />
      </svg>
      <span className="relative text-xs font-bold tracking-widest uppercase">{vibeCountLabel(vibeCounts(c.id, products))}</span>
      <span className="relative mt-8 max-w-[70%]">
        <span className="block font-display text-2xl leading-none font-extrabold md:text-3xl">{c.name}</span>
        <span className="mt-2 hidden text-sm sm:block">{c.blurb}</span>
      </span>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

export function ShopByVibe() {
  const { products } = useCatalogue();
  const featured = collections.filter((c) => c.featured);
  const [ref, reveal] = useReveal<HTMLUListElement>();
  return (
    <section id="vibes" className="mx-auto max-w-7xl px-4 pt-20 sm:px-6" aria-labelledby="vibes-title">
      <SectionHeading
        id="vibes-title"
        eyebrow="Shop by vibe"
        title="Find your thing — on a sticker or a wall."
        action={
          <Link to="/vibes" className="btn-ghost">
            All vibes <LuArrowRight aria-hidden />
          </Link>
        }
      />
      <ul ref={ref} data-reveal={reveal} className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
        {featured.map((c, i) => (
          <li key={c.id} className={`reveal-item ${i === 0 ? 'sm:col-span-2 md:col-span-1 md:row-span-2' : ''}`} style={{ '--reveal-i': i } as CSSProperties}>
            {c.id === 'cute' ? <CuteCard c={c} products={products} /> : i === 0 ? <LargeCard c={c} products={products} /> : <SmallCard c={c} products={products} />}
          </li>
        ))}
        <li className="reveal-item sm:col-span-2 md:col-span-3" style={{ '--reveal-i': featured.length } as CSSProperties}>
          <Link
            to="/vibes"
            className="flex h-full min-h-24 items-center justify-between gap-4 rounded-[var(--radius-card)] border-2 border-ink bg-white p-5 transition-transform hover:-translate-y-1"
          >
            <span className="font-display text-2xl leading-none font-extrabold md:text-3xl">Gaming, BTS, music, minimal & more</span>
            <LuArrowRight aria-hidden className="size-6 shrink-0" />
          </Link>
        </li>
      </ul>
    </section>
  );
}
