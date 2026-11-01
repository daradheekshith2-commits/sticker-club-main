import { useEffect, useState } from 'react';
import { LuArrowLeft, LuArrowRight, LuHeart, LuMail, LuPackage, LuStamp } from 'react-icons/lu';
import { useCatalogue } from '../context/CatalogueContext';
import { usePageMeta } from '../hooks/usePageMeta';
import { Link } from '../router/router';
import type { Category, Product } from '../types/product';
import { isPurchasable, shopUrl } from '../utils/catalogue';
import { formatPrice } from '../utils/format';
import { ProductGrid } from '../components/product/ProductCard';
import { SectionHeading } from '../components/ui/SectionHeading';
import { ShopByVibe } from '../components/vibes/ShopByVibe';
import { AnimatedStickerHero } from '../components/home/AnimatedStickerHero';

const orderable = (products: Product[], category: Category) => products.filter((p) => p.category === category && isPurchasable(p));
const categoryPriceSummary = (products: Product[], category: Category) => {
  const items = orderable(products, category);
  if (!items.length) return null;
  const lowest = Math.min(...items.map((p) => p.price));
  return `${items.length} designs · from ${formatPrice(lowest)}`;
};

function CategoryCardImage({ cardId, title }: { cardId: string; title: string }) {
  const [failed, setFailed] = useState(false);
  const base = import.meta.env.BASE_URL.replace(/\/$/, '') + '/';

  if (failed) {
    return (
      <div className="flex size-full items-center justify-center rounded-lg bg-black/5 p-4 text-center">
        <span className="font-display text-xs font-bold tracking-wider text-[#111]/60 uppercase">{title}</span>
      </div>
    );
  }

  const dimensions = cardId === 'custom'
    ? { width: 640, height: 512 }
    : cardId === 'posters'
      ? { width: 640, height: 466 }
      : { width: 640, height: 467 };

  return (
    <img
      src={`${base}category-art/${cardId}-640.webp`}
      srcSet={`${base}category-art/${cardId}-640.webp 640w, ${base}category-art/${cardId}-1024.webp 1024w`}
      sizes="(min-width: 768px) 33vw, 100vw"
      width={dimensions.width}
      height={dimensions.height}
      alt=""
      decoding="async"
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-full w-full object-contain drop-shadow-[0_5px_5px_rgba(0,0,0,.18)] transition-transform duration-200 motion-reduce:transition-none group-hover:scale-[1.035] group-hover:motion-reduce:scale-100"
    />
  );
}

// ---------- Shop categories ----------
function CategoryDoors() {
  const { products } = useCatalogue();
  const cards = [
    {
      id: 'stickers',
      eyebrow: 'STICKER ESSENTIALS',
      title: 'Stickers',
      description: 'Mini designs, sheets and themed packs for your everyday things.',
      cta: 'SHOP STICKERS',
      to: shopUrl({ category: 'stickers' }),
      category: 'stickers' as const,
      color: '#FFE16B',
    },
    {
      id: 'posters',
      eyebrow: 'WALL ART',
      title: 'Posters',
      description: 'Give your room, hostel or workspace a little more personality.',
      cta: 'SHOP POSTERS',
      to: shopUrl({ category: 'posters' }),
      category: 'posters' as const,
      color: '#A6DFF4',
    },
    {
      id: 'custom',
      eyebrow: 'MAKE IT PERSONAL',
      title: 'Shop Your Own',
      description: 'Turn your own photo, drawing or idea into a custom sticker.',
      cta: 'START CREATING',
      to: '/create-your-stickers',
      category: null,
      color: '#A8E8C4',
    },
  ];

  return (
    <section className="category-showcase relative isolate overflow-hidden bg-[#06483D] py-8 sm:py-10" aria-label="Shop categories">
      <div aria-hidden="true" className="cinema-grain pointer-events-none absolute inset-0 opacity-[0.07]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_12%_25%,rgba(25,115,96,0.42),transparent_55%),radial-gradient(ellipse_at_85%_85%,rgba(0,23,20,0.5),transparent_48%)]" />
      <ul className="relative mx-auto grid max-w-[1040px] grid-cols-1 gap-6 px-4 sm:px-7 md:grid-cols-3 md:gap-6">
        {cards.map((card) => {
          const countText = card.category ? categoryPriceSummary(products, card.category) : null;
          return (
            <li key={card.id} className="min-w-0 flex">
              <Link
                to={card.to}
                style={{ backgroundColor: card.color }}
                className="on-light group relative flex w-full min-h-[340px] sm:min-h-[380px] flex-col overflow-hidden rounded-[14px] border border-[#14231D]/85 p-4 sm:p-5 shadow-[0_8px_18px_rgba(0,0,0,.25)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_15px_28px_rgba(0,0,0,.28)] motion-reduce:hover:translate-y-0 focus-visible:outline-4 focus-visible:outline-white focus-visible:outline-offset-2"
              >
                <div className="relative z-10 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-extrabold tracking-[0.08em] text-[#121212] uppercase">{card.eyebrow}</span>
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#101312] text-white transition-transform group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0">
                    <LuArrowRight aria-hidden="true" className="size-4" />
                  </span>
                </div>
                <div className="relative my-3 flex min-h-[140px] sm:min-h-[160px] flex-1 items-center justify-center overflow-visible" aria-hidden="true">
                  <CategoryCardImage cardId={card.id} title={card.title} />
                </div>
                <div className="relative z-10 mt-auto flex flex-col pt-1">
                  {countText && <p className="text-[10px] font-bold tracking-wide text-[#111]/80">{countText}</p>}
                  <h2 className="mt-0.5 font-display text-[22px] font-extrabold leading-tight tracking-tight text-[#111]">{card.title}</h2>
                  <p className="mt-1 text-xs leading-[1.3] text-[#111]/85">{card.description}</p>
                  <div className="mt-3">
                    <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-[#101312] px-4 py-1.5 text-[10px] font-extrabold tracking-[0.04em] text-white transition-colors group-hover:bg-[#263B35]">
                      {card.cta}
                      <LuArrowRight aria-hidden="true" className="size-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Collectibles: the two main pack purchases get real space; the other ideas
 * are a quiet row of links so the homepage doesn't turn into eight banners.
 */
function Collect() {
  const features = [
    {
      to: '/matching-duos',
      eyebrow: 'BETTER TOGETHER',
      title: 'Matching Duos',
      description: 'Two original sticker designs made to go together. Keep both or share one with someone.',
      cta: 'EXPLORE DUOS',
      Icon: LuHeart,
      accent: '#A8F0DC',
    },
    {
      to: '/secret-messages',
      eyebrow: 'A LITTLE MYSTERY',
      title: 'Secret Messages',
      description: 'Pick a message sticker and discover the personal note sealed inside.',
      cta: 'OPEN THE SECRET',
      Icon: LuMail,
      accent: '#D90A1F',
    },
    {
      to: '/collector-passport',
      eyebrow: 'YOUR COLLECTION JOURNEY',
      title: 'Collector Passport',
      description: 'Preview the stamp-card idea and see how your Sticker Club collection could grow.',
      cta: 'VIEW PASSPORT',
      Icon: LuStamp,
      accent: '#8FD3FF',
    },
    {
      to: '/product/mystery-pack',
      eyebrow: 'SURPRISE INSIDE',
      title: 'Mystery Shop',
      description: 'Choose a series, get five themed stickers you know, plus one extra mystery pick.',
      cta: 'SHOP MYSTERY PACK',
      Icon: LuPackage,
      accent: '#FFD447',
    },
  ];

  return (
    <section aria-labelledby="collect-title" className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
      <SectionHeading
        id="collect-title"
        eyebrow="MORE TO EXPLORE"
        title="Little things worth discovering."
      />
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {features.map((feature) => {
          const isMystery = feature.to === '/product/mystery-pack';
          const isPassport = feature.to === '/collector-passport';
          return (
            <li key={feature.to} className="min-w-0">
              <Link
                to={feature.to}
                className="group relative flex h-full min-h-[270px] flex-col rounded-[var(--radius-card)] border border-[#315e53] bg-[#071b18] p-6 transition duration-200 hover:-translate-y-1 hover:border-[#a8f0dc] hover:shadow-[0_14px_30px_rgba(0,0,0,0.22)] holo-shimmer"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-14 place-items-center rounded-2xl border border-[#f4f0e8]/15 shadow-sm" style={{ backgroundColor: feature.accent }}>
                    <feature.Icon aria-hidden className={`size-7 ${feature.accent === '#D90A1F' ? 'text-[#F4F0E8]' : 'text-[#03110f]'}`} strokeWidth={1.8} />
                  </span>
                  <div className="flex items-center gap-2">
                    {isMystery && (
                      <span className="rubber-stamp text-[10px] py-0.5 px-2">5 + 1 ?</span>
                    )}
                    {isPassport && (
                      <span className="rounded border border-dashed border-mint/40 px-2 py-0.5 font-mono text-[9px] text-mint">STAMP CARD</span>
                    )}
                    <span className="grid size-9 place-items-center rounded-full border border-[#315e53] text-[#a8f0dc] transition-all group-hover:border-[#a8f0dc] group-hover:bg-[#a8f0dc] group-hover:text-[#03110f]">
                      <LuArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
                {isMystery && (
                  <div className="my-3 border-t border-dashed border-ink/20 relative">
                    <span className="absolute -top-2 right-2 bg-[#071b18] px-1.5 text-[8px] font-mono tracking-widest text-ink-soft">TEAR HERE ▶</span>
                  </div>
                )}
                <p className="mt-4 text-[10px] font-extrabold tracking-[0.16em]" style={{ color: feature.accent }}>{feature.eyebrow}</p>
                <h3 className="mt-1 font-display text-2xl font-extrabold text-[#F4F0E8]">{feature.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[#B5C7C1]">{feature.description}</p>
                <span className="mt-6 inline-flex w-fit items-center gap-2 text-xs font-extrabold tracking-[0.08em] text-[#a8f0dc] transition-colors group-hover:text-[#F4F0E8]">
                  {feature.cta} <LuArrowRight aria-hidden className="size-4" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function shuffleItems<T,>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const EXCLUDED_SLUGS = new Set([
  'campus-survival-sheet',
  'desk-setup-sheet',
  'tea-stall-sheet',
  'dev-terminal-pack',
  'sht-001',
  'sht-002',
  'sht-003',
  'pck-001',
  'pck-002',
  'pck-003',
]);

function getRandomDiverseProducts(
  allProducts: Product[],
  category: Category,
  count = 4,
  excludeIds: Set<string> = new Set()
): Product[] {
  const candidates = allProducts.filter(
    (p) =>
      p.category === category &&
      isPurchasable(p) &&
      (category === 'stickers' ? p.productType === 'single' : true) &&
      !EXCLUDED_SLUGS.has(p.slug) &&
      !EXCLUDED_SLUGS.has(p.id) &&
      !excludeIds.has(p.id)
  );

  if (candidates.length <= count) return shuffleItems(candidates);

  // Group by collection/category to ensure cross-category diversity
  const groups = new Map<string, Product[]>();
  for (const p of candidates) {
    const coll = p.collections[0] || p.productType || 'other';
    if (!groups.has(coll)) groups.set(coll, []);
    groups.get(coll)!.push(p);
  }

  // Shuffle categories so we pick across different ones
  const categoryKeys = shuffleItems(Array.from(groups.keys()));
  const chosen: Product[] = [];
  const chosenIds = new Set<string>();

  for (const cat of categoryKeys) {
    if (chosen.length >= count) break;
    const itemsInCat = shuffleItems(groups.get(cat)!.filter((p) => !chosenIds.has(p.id)));
    if (itemsInCat.length > 0) {
      chosen.push(itemsInCat[0]);
      chosenIds.add(itemsInCat[0].id);
    }
  }

  // If we still need more, fill randomly from remaining
  if (chosen.length < count) {
    const remaining = shuffleItems(candidates.filter((p) => !chosenIds.has(p.id)));
    for (const p of remaining) {
      if (chosen.length >= count) break;
      chosen.push(p);
      chosenIds.add(p.id);
    }
  }

  return shuffleItems(chosen);
}

function FeaturedRow({ category, eyebrow, title, linkLabel }: { category: Category; eyebrow: string; title: string; linkLabel: string }) {
  const { products } = useCatalogue();
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    if (products.length > 0) {
      setItems(getRandomDiverseProducts(products, category, 4));
    }
  }, [products, category]);

  const itemLabel = category === 'stickers' ? 'stickers' : 'posters';
  const availableCount = products.filter(
    (p) => p.category === category && isPurchasable(p) && (category === 'stickers' ? p.productType === 'single' : true)
  ).length;

  const showRandomItems = () => {
    const currentIds = new Set(items.map((p) => p.id));
    const nextItems = getRandomDiverseProducts(products, category, 4, currentIds);
    if (nextItems.length > 0) {
      setItems(nextItems);
    } else {
      setItems(getRandomDiverseProducts(products, category, 4));
    }
  };

  const action = (
    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
      <div
        className="inline-flex items-center gap-1 rounded-full border border-[#315e53] bg-[#071b18] p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
        aria-label={`Discover featured ${itemLabel}`}
      >
        <span className="hidden px-2 text-[10px] font-extrabold tracking-[0.16em] text-[#a8f0dc] sm:inline">DISCOVER</span>
        <button
          type="button"
          onClick={showRandomItems}
          disabled={availableCount <= 4}
          className="grid size-10 place-items-center rounded-full border border-[#315e53] bg-[#0b2420] text-[#a8f0dc] transition duration-200 hover:border-[#a8f0dc] hover:bg-[#a8f0dc] hover:text-[#03110f] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Show a random selection of ${itemLabel}`}
          title={`Discover random ${itemLabel}`}
        >
          <LuArrowLeft aria-hidden className="size-[18px]" />
        </button>
        <button
          type="button"
          onClick={showRandomItems}
          disabled={availableCount <= 4}
          className="grid size-10 place-items-center rounded-full border border-[#d90a1f] bg-[#d90a1f] text-[#f4f0e8] shadow-[0_3px_12px_rgba(217,10,31,0.24)] transition duration-200 hover:border-[#a8f0dc] hover:bg-[#a8f0dc] hover:text-[#03110f] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Show another random selection of ${itemLabel}`}
          title={`Discover more ${itemLabel}`}
        >
          <LuArrowRight aria-hidden className="size-[18px]" />
        </button>
      </div>
      <Link
        to={category === 'stickers' ? shopUrl({ category: 'stickers', types: ['single'] }) : shopUrl({ category })}
        className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#5d9d8f] px-5 py-3 text-sm font-bold text-[#a8f0dc] transition hover:border-[#a8f0dc] hover:bg-[#a8f0dc] hover:text-[#03110f]"
      >
        {linkLabel} <LuArrowRight aria-hidden />
      </Link>
    </div>
  );

  return (
    <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6" aria-labelledby={`featured-${category}`}>
      <SectionHeading
        id={`featured-${category}`}
        eyebrow={eyebrow}
        title={title}
        action={action}
      />
      <ProductGrid products={items} />
    </section>
  );
}

export function HomePage() {
  usePageMeta(null);
  return (
    <>
      <AnimatedStickerHero />
      <CategoryDoors />
      <Collect />
      <ShopByVibe />
      <FeaturedRow category="stickers" eyebrow="Featured stickers" title="Start small. Collect them all." linkLabel="All stickers" />
      <FeaturedRow category="posters" eyebrow="Featured posters" title="Walls deserve personality too." linkLabel="All posters" />
    </>
  );
}
