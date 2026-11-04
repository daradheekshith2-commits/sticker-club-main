import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { LuArrowRight, LuChevronDown, LuPackage, LuSearch, LuSlidersHorizontal, LuX } from 'react-icons/lu';
import { brand } from '../config/brand';
import { useCatalogue } from '../context/CatalogueContext';
import { collections, getCollection, productTypeLabels } from '../data/collections';
import { usePageMeta } from '../hooks/usePageMeta';
import { Link, useSearchParams } from '../router/router';
import type { Category, CollectionId, Product, ProductType, StickerDesign } from '../types/product';
import {
  allSizes,
  emptyFilters,
  facetCount,
  filterAndSort,
  filtersFromParams,
  getPackQuantity,
  getProductBySlug,
  getStartingPrice,
  isPurchasable,
  paramsFromFilters,
  priceBands,
  shopUrl,
  sortOptions,
  type CatalogueFilters,
  type PriceBand,
  type SortKey,
} from '../utils/catalogue';
import { formatPrice, pluralise } from '../utils/format';
import { ProductImage } from '../components/art/ProductArt';
import { StickerSvg } from '../components/art/Sticker';
import { motifs } from '../components/art/motifs';
import { ProductGrid } from '../components/product/ProductCard';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { EmptyState } from '../components/ui/EmptyState';
import {
  BuildWallPromo,
  PosterBuyingGuide,
  PosterInterestTiles,
  PosterShopHero,
  SplitPosterSection,
} from '../components/posters/PosterShopSections';

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Works out a heading from the active filters, e.g. "Tech & Coding stickers" or "Sticker sheets". */
function titleFor(f: CatalogueFilters): string {
  if (f.collections.length === 1 && !f.types.length && !f.category) return getCollection(f.collections[0])?.name ?? 'Shop';
  if (f.types.length === 1 && !f.collections.length) return productTypeLabels[f.types[0]].plural;
  if (f.types.length > 1 && f.types.every((t) => t === 'pack' || t === 'mystery' || t === 'sheet')) return 'Packs & bundles';
  if (f.category === 'posters' && f.sizes.length === 1 && !f.types.length && !f.collections.length) return `${f.sizes[0]} posters`;
  if (f.category === 'posters' && f.collections.length === 1) return `${getCollection(f.collections[0])?.name} posters`;
  if (f.category === 'stickers' && f.collections.length === 1) return `${getCollection(f.collections[0])?.name} stickers`;
  if (f.category === 'posters') return 'All posters';
  if (f.category === 'stickers') return 'All stickers';
  return 'Shop everything';
}

// ---------------------------------------------------------------------------
// Intro (sticker page only)
// ---------------------------------------------------------------------------

/** Takes a sticker design from the catalogue so the intro art always matches real products. */
function designOf(slug: string): StickerDesign | undefined {
  const art = getProductBySlug(slug)?.art;
  return art?.kind === 'single' ? art.design : undefined;
}

const introStickers = [
  { slug: 'seventy-five-percent-club', className: 'left-[2%] top-[6%] w-[34%] -rotate-12' },
  { slug: 'works-on-my-machine', className: 'right-[0%] top-[0%] w-[46%] rotate-6' },
  { slug: 'chai-first', className: 'left-[30%] top-[34%] w-[34%] rotate-3' },
  { slug: 'sleepy-cloud', className: 'right-[4%] bottom-[2%] w-[28%] rotate-12' },
  { slug: 'pixel-heart', className: 'left-[6%] bottom-[4%] w-[24%] -rotate-6' },
];

function StickerIntro() {
  const from = getStartingPrice('single');
  return (
    <section aria-labelledby="shop-title" className="panel-glow relative mt-4 overflow-hidden rounded-[var(--radius-card)]">
      <div className="grid items-center gap-4 p-5 sm:p-8 lg:grid-cols-[1fr_340px] lg:py-6">
        <div>
          <p className="eyebrow">The sticker shop</p>
          <h1 id="shop-title" className="mt-2 text-[2.6rem] leading-[0.95] font-extrabold sm:text-6xl">
            Tiny stickers.
            <br />
            Big personality.
          </h1>
          <p className="mt-3 max-w-md">
            Original mini stickers, sheets and themed packs for laptops, notebooks and everything you carry.
            {from && <> Minis from <strong>{formatPrice(from)}</strong>.</>}
          </p>
          <Link to="/create-your-stickers" className="btn-primary mt-4">
            Create your own stickers <LuArrowRight aria-hidden />
          </Link>
        </div>
        {/* Illustration: hidden on small screens so the catalogue stays close to the top. */}
        <div className="relative hidden aspect-[4/3] w-full lg:block" aria-hidden>
          {introStickers.map((s) => {
            const design = designOf(s.slug);
            return design ? (
              <div key={s.slug} className={`absolute ${s.className} drop-shadow-[0_6px_6px_rgba(18,18,18,0.18)]`}>
                <StickerSvg design={design} className="h-auto w-full" />
              </div>
            ) : null;
          })}
        </div>
      </div>
    </section>
  );
}

/** Sticker landing: invitation to the custom sticker configurator. */
function CreateYourOwnBanner() {
  return (
    <Link
      to="/create-your-stickers"
      className="group mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-card)] border-2 border-ink bg-white p-4 sm:flex-nowrap sm:p-5"
    >
      <span className="flex items-center gap-4">
        <span aria-hidden className="block w-16 shrink-0 -rotate-6 rounded-[22%] bg-[#fff] p-1 shadow-[0_5px_10px_rgba(42,32,22,0.25)] transition-transform group-hover:rotate-0">
          <span className="grid aspect-square place-items-center rounded-[20%] bg-[repeating-linear-gradient(45deg,#FFB3D1_0_8px,#FFE0EC_8px_16px)] font-display text-[10px] leading-tight font-extrabold text-on-light">
            YOU
          </span>
        </span>
        <span>
          <span className="block font-display text-xl font-extrabold">Got your own design? Make it a sticker.</span>
          <span className="block text-sm text-ink-soft">Upload an image or paste a link, pick a size and see it as a die-cut sticker.</span>
        </span>
      </span>
      <span className="btn-accent shrink-0 px-4 py-2">
        Create your own <LuArrowRight aria-hidden />
      </span>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Category switch, shop by format, shop by vibe
// ---------------------------------------------------------------------------

/** Stickers / Posters / Everything. Links (not buttons) so back/forward and sharing work. */
function CategorySwitch({ f }: { f: CatalogueFilters }) {
  const options: { value: Category | null; label: string }[] = [
    { value: 'stickers', label: 'Stickers' },
    ...(brand.features.showPosters ? [{ value: 'posters' as Category, label: 'Posters' }] : []),
    { value: null, label: 'Everything' },
  ];
  return (
    <nav aria-label="Product category" className="inline-flex rounded-full border-2 border-ink bg-white p-1">
      {options.map((o) => {
        const active = f.category === o.value;
        return (
          <Link
            key={o.label}
            // Keep the search text and sort order; drop filters that may not apply to the other category.
            to={shopUrl({ category: o.value, query: f.query, sort: f.sort })}
            aria-current={active ? 'page' : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors sm:px-4 ${active ? 'bg-ink text-paper' : 'hover:bg-paper-deep'}`}
          >
            {o.label}
          </Link>
        );
      })}
    </nav>
  );
}

const formatRepresentatives: Partial<Record<ProductType, string>> = {
  single: 'chai-first',
  sheet: 'campus-survival-sheet',
  pack: 'garage-pack',
  mystery: 'mystery-pack',
  duo: 'window-cat-day-and-night',
  secret: 'main-character-energy',
  poster: 'redline-poster',
  'poster-set': 'desk-wall-pack',
};

function ShopByVibe({ f }: { f: CatalogueFilters }) {
  const { products, isPurchasable } = useCatalogue();
  const category = f.category ?? 'stickers';
  const vibes = collections
    .map((c) => ({
      c,
      count: products.filter((p) => p.category === category && isPurchasable(p) && p.collections.includes(c.id)).length,
    }))
    .filter((v) => v.count > 0);
  return (
    <section aria-labelledby="by-vibe" className="mt-6">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 id="by-vibe" className="eyebrow">
          Shop by theme
        </h2>
        <Link to="/vibes" className="flex items-center gap-1 text-sm font-bold underline underline-offset-4">
          Explore all themes <LuArrowRight aria-hidden className="size-3.5" />
        </Link>
      </div>
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {vibes.map(({ c }) => {
          const Motif = motifs[c.motif];
          const active = f.collections.length === 1 && f.collections[0] === c.id;
          return (
            <li key={c.id} className="shrink-0">
              <Link
                to={active ? shopUrl({ category, sort: f.sort }) : shopUrl({ category, collections: [c.id], sort: f.sort })}
                aria-current={active ? 'true' : undefined}
                className={`flex items-center gap-2 rounded-full border-2 py-1 pr-4 pl-1 text-sm font-bold transition-colors ${active ? 'border-ink bg-ink text-paper' : 'border-ink/10 bg-white hover:border-ink'}`}
              >
                <span className="grid size-8 place-items-center rounded-full" style={{ backgroundColor: c.color }} aria-hidden>
                  <svg viewBox="0 0 100 100" className="size-6">
                    <Motif fg="#121212" bg={c.color} accent="#FFFFFF" />
                  </svg>
                </span>
                <span className="pr-1">{c.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MysteryShopBanner() {
  return (
    <aside
      aria-label="Mystery Shop"
      className="mt-6 overflow-hidden rounded-[var(--radius-card)] border border-[#315E53] bg-[#071B18] p-5 shadow-xl transition-all duration-300 hover:border-mint/50 sm:p-7"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4 sm:gap-5">
          <div className="grid size-13 shrink-0 place-items-center rounded-2xl border border-sun/30 bg-sun/10 text-sun sm:size-15">
            <LuPackage className="size-7 sm:size-8" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold tracking-widest text-mint uppercase">
                SURPRISE INSIDE
              </span>
              <span className="rounded-full border border-dashed border-cinema-red bg-cinema-red/10 px-2 py-0.5 text-[11px] font-mono font-bold text-danger">
                5 + 1 ?
              </span>
            </div>
            <h2 className="mt-1 font-display text-2xl font-extrabold text-ink sm:text-3xl">
              Mystery Shop
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-soft sm:text-base">
              Choose a series, get five themed stickers you know, plus one extra mystery pick.
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <Link
            to="/product/mystery-pack"
            className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-cinema-red px-6 py-3 font-display text-sm font-bold tracking-wide text-white transition-all hover:bg-cinema-red/90 hover:shadow-[0_0_20px_rgba(255,16,38,0.4)]"
          >
            SHOP MYSTERY PACK <LuArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Filters (logic unchanged; presentation calmer)
// ---------------------------------------------------------------------------

/** Collapsible filter group. Less-used groups start closed unless they're in use. */
function FilterGroup({
  title, activeCount, onReset, defaultOpen = true, children,
}: { title: string; activeCount: number; onReset: () => void; defaultOpen?: boolean; children: ReactNode }) {
  return (
    <details open={defaultOpen || activeCount > 0} className="group/f border-b-2 border-ink/10 pb-3">
      <summary className="flex cursor-pointer list-none items-center justify-between py-2.5 text-sm font-bold">
        <span>
          {title}
          {activeCount > 0 && <span className="ml-2 rounded-full bg-ink px-1.5 text-[11px] text-paper">{activeCount}</span>}
        </span>
        <LuChevronDown aria-hidden className="size-4 transition-transform group-open/f:rotate-180" />
      </summary>
      <div className="flex flex-col gap-0.5 pb-1">{children}</div>
      {activeCount > 0 && (
        <button type="button" onClick={onReset} className="mt-1 text-sm font-bold underline underline-offset-4">
          Reset
        </button>
      )}
    </details>
  );
}

/** A checkbox-style row: label on the left, result count on the right. */
function FilterOption({ active, onClick, count, showCount = true, children }: { active: boolean; onClick: () => void; count: number; showCount?: boolean; children: ReactNode }) {
  const disabled = count === 0 && !active;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={active}
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left text-sm hover:bg-paper-deep disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <span aria-hidden className={`grid size-4 shrink-0 place-items-center rounded border-2 ${active ? 'border-ink bg-ink' : 'border-ink/40 bg-white'}`}>
        {active && <span className="size-1.5 rounded-sm bg-lime" />}
      </span>
      <span className={`flex-1 ${active ? 'font-bold' : ''}`}>{children}</span>
      {showCount && <span className="text-xs text-ink-soft tabular-nums">{count}</span>}
    </button>
  );
}

const VIBES_SHOWN = 8;

function Filters({ f, update }: { f: CatalogueFilters; update: (next: Partial<CatalogueFilters>) => void }) {
  const { products } = useCatalogue();
  const [allVibes, setAllVibes] = useState(false);
  // Selected vibes always stay visible, even when the list is collapsed.
  const vibeList = allVibes ? collections : collections.filter((c, i) => i < VIBES_SHOWN || f.collections.includes(c.id));
  // Each count = how many products you'd see if you ticked that option.
  return (
    <div>
      {f.category === 'posters' && (
        <FilterGroup title="Poster size" activeCount={f.sizes.length} onReset={() => update({ sizes: [] })}>
          {allSizes(products).map((size) => (
            <FilterOption
              key={size}
              active={f.sizes.includes(size)}
              count={facetCount(f, { sizes: f.sizes.includes(size) ? f.sizes : [...f.sizes, size] }, products)}
              onClick={() => update({ sizes: toggle(f.sizes, size) })}
            >
              {size}
            </FilterOption>
          ))}
        </FilterGroup>
      )}
      <FilterGroup title="Theme" activeCount={f.collections.length} onReset={() => update({ collections: [] })}>
        {vibeList.map((c) => (
          <FilterOption
            key={c.id}
            active={f.collections.includes(c.id)}
            count={facetCount(f, { collections: f.collections.includes(c.id) ? f.collections : [...f.collections, c.id] }, products)}
            showCount={false}
            onClick={() => update({ collections: toggle<CollectionId>(f.collections, c.id) })}
          >
            {c.name}
          </FilterOption>
        ))}
        {collections.length > VIBES_SHOWN && (
          <button type="button" onClick={() => setAllVibes((v) => !v)} aria-expanded={allVibes} className="mt-1 self-start px-1.5 text-sm font-bold underline underline-offset-4">
            {allVibes ? 'Show fewer' : `Show all ${collections.length}`}
          </button>
        )}
      </FilterGroup>
      <FilterGroup title="Price" activeCount={f.price ? 1 : 0} defaultOpen={false} onReset={() => update({ price: null })}>
        {priceBands.map((b) => (
          <FilterOption
            key={b.value}
            active={f.price === b.value}
            count={facetCount(f, { price: b.value as PriceBand }, products)}
            onClick={() => update({ price: f.price === b.value ? null : (b.value as PriceBand) })}
          >
            {b.label}
          </FilterOption>
        ))}
      </FilterGroup>
    </div>
  );
}

// ---------------------------------------------------------------------------
// "Choose your sticker style" + poster guide
// ---------------------------------------------------------------------------

/** "6–8 stickers" style range, worked out from the catalogue for a format. */
function quantityRange(products: Product[], type: ProductType): string | null {
  const qtys = products.filter((p) => p.productType === type && isPurchasable(p)).map(getPackQuantity).filter((q): q is number => q !== undefined);
  if (!qtys.length) return null;
  const min = Math.min(...qtys);
  const max = Math.max(...qtys);
  return min === max ? `${min} stickers` : `${min}–${max} stickers`;
}

const styleGuide: { type: ProductType; what: string; goodFor: string }[] = [
  { type: 'single', what: 'One design, cut to its shape. Pick exactly the ones you like.', goodFor: 'Filling gaps, starting a collection, small surfaces like phone cases.' },
  { type: 'sheet', what: 'Several small stickers on one backing sheet — peel them off one at a time.', goodFor: 'Journals and notebooks, or keeping a set together until you need it.' },
  { type: 'pack', what: 'Separate stickers curated around one theme, sold together.', goodFor: 'Covering a laptop in one go, or an easy gift for a roommate.' },
];

function StickerStyleGuide() {
  const { products, getProductBySlug } = useCatalogue();
  return (
    <section aria-labelledby="style-guide" className="mt-20 border-t-2 border-ink pt-10">
      <p className="eyebrow mb-2">Not sure which to pick?</p>
      <h2 id="style-guide" className="text-3xl font-extrabold md:text-4xl">
        Choose your sticker style
      </h2>
      <ul className="mt-6 grid gap-4 md:grid-cols-3">
        {styleGuide.map((g) => {
          const sample = getProductBySlug(formatRepresentatives[g.type] ?? '');
          const from = getStartingPrice(g.type, products);
          const range = g.type === 'single' ? '1 sticker' : quantityRange(products, g.type);
          return (
            <li key={g.type} className="flex gap-4 rounded-[var(--radius-card)] bg-white p-4">
              {sample && (
                <span className="block size-20 shrink-0 overflow-hidden rounded-xl">
                  <ProductImage product={sample} className="size-full" />
                </span>
              )}
              <div className="min-w-0">
                <h3 className="text-lg font-extrabold">{productTypeLabels[g.type].plural}</h3>
                <p className="text-sm text-ink-soft">
                  {[range, from ? `from ${formatPrice(from)}` : null].filter(Boolean).join(' · ')}
                </p>
                <p className="mt-2 text-sm">{g.what}</p>
                <p className="mt-1 text-sm text-ink-soft">
                  <strong className="text-ink">Good for:</strong> {g.goodFor}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-sm text-ink-soft">
        Sizes, material and finish will be listed once we’ve tested printer samples — we won’t claim things like waterproofing until we’ve checked them.
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ShopPage() {
  const { products, loading, error, refresh } = useCatalogue();
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => filtersFromParams(params), [params]);
  const results = useMemo(() => filterAndSort(filters, products), [filters, products]);
  const PAGE_SIZE = 36;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset pagination whenever filters or search parameters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [params]);

  const visibleResults = useMemo(() => results.slice(0, visibleCount), [results, visibleCount]);
  const [query, setQuery] = useState(filters.query);
  const [sheetOpen, setSheetOpen] = useState(false);
  const title = titleFor(filters);
  const isStickerShop = filters.category === 'stickers';
  // The big intro only shows on the sticker landing view; once a format or vibe is chosen, a compact title takes over.
  const showIntro = isStickerShop && !filters.types.length && !filters.collections.length;
  const isPosterShop = filters.category === 'posters';
  // The poster landing view (merchandising sections) shows until the shopper narrows things down.
  const showPosterLanding =
    isPosterShop && !filters.types.length && !filters.collections.length && !filters.sizes.length && !filters.query && !filters.price;
  usePageMeta(
    showIntro ? 'Stickers' : showPosterLanding ? 'Posters' : title,
    isPosterShop
      ? `Posters in A5, A4 and A3, ready-made wall packs and a build-your-own wall from ${brand.displayName}.`
      : isStickerShop
      ? `Original mini stickers, sticker sheets and themed packs from ${brand.displayName}.`
      : `Browse ${title.toLowerCase()} — original stickers and posters from ${brand.displayName}.`,
  );

  // Filter clicks replace the URL (so Back doesn't step through every tick);
  // format/vibe/category tiles are links, which add history entries.
  const update = (next: Partial<CatalogueFilters>) => setParams(paramsFromFilters({ ...filters, ...next }), { replace: true });

  // Keep the search box in sync if the URL changes (e.g. header search, back button).
  useEffect(() => setQuery(filters.query), [filters.query]);

  // Update results shortly after typing stops.
  useEffect(() => {
    if (query === filters.query) return;
    const t = window.setTimeout(() => update({ query }), 250);
    return () => window.clearTimeout(t);
  }, [query]);

  // Lock page scroll while the mobile filter sheet is open; Escape closes it.
  useEffect(() => {
    if (!sheetOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSheetOpen(false);
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [sheetOpen]);

  // The category is shown by the Stickers/Posters/Everything switch, so it isn't repeated as a chip.
  const activeChips: { label: string; clear: () => void }[] = [
    ...(filters.query ? [{ label: `“${filters.query}”`, clear: () => update({ query: '' }) }] : []),
    ...filters.types.map((t) => ({ label: productTypeLabels[t].plural, clear: () => update({ types: filters.types.filter((x) => x !== t) }) })),
    ...filters.collections.map((c) => ({ label: getCollection(c)?.name ?? c, clear: () => update({ collections: filters.collections.filter((x) => x !== c) }) })),
    ...filters.sizes.map((size) => ({ label: size, clear: () => update({ sizes: filters.sizes.filter((x) => x !== size) }) })),
    ...(filters.price ? [{ label: priceBands.find((b) => b.value === filters.price)!.label, clear: () => update({ price: null }) }] : []),
  ];
  const activeCount = activeChips.length;
  // "Clear all" keeps you in the same category (and sort order).
  const reset = () => setParams(paramsFromFilters({ ...emptyFilters, category: filters.category, sort: filters.sort }), { replace: true });

  const crumbs = [
    { label: 'Home', to: '/' },
    { label: 'Shop', to: filters.category || activeCount ? '/shop' : undefined },
    ...(filters.category ? [{ label: filters.category === 'stickers' ? 'Stickers' : 'Posters', to: activeCount ? shopUrl({ category: filters.category }) : undefined }] : []),
    ...(activeCount && title !== 'All stickers' && title !== 'All posters' ? [{ label: title }] : []),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <Breadcrumbs items={crumbs} />

      {showIntro ? (
        <StickerIntro />
      ) : showPosterLanding ? (
        <>
          <PosterShopHero />
          <PosterInterestTiles />
          <BuildWallPromo />
          <SplitPosterSection />
          <h2 id="all-posters" className="mt-16 text-3xl font-extrabold md:text-4xl">
            All posters
          </h2>
        </>
      ) : (
        <div className="mt-4">
          <h1 id="shop-title" className="text-4xl leading-none font-extrabold md:text-6xl">
            {title}
          </h1>
        </div>
      )}

      {/* Collection notes, e.g. the Marvel licensing disclaimer, whenever that collection is filtered. */}
      {filters.collections.map((c) => getCollection(c)?.note).filter(Boolean).map((n) => (
        <p key={n} role="note" className="mt-4 max-w-3xl rounded-xl border-2 border-dashed border-ink/30 bg-white p-3 text-sm">
          {n}
        </p>
      ))}

      {filters.category !== null && !showPosterLanding && <ShopByVibe f={filters} />}
      {filters.category !== 'posters' && !showPosterLanding && <MysteryShopBanner />}
      {showIntro && <CreateYourOwnBanner />}

      {/* Toolbar: category switch, search, sort, mobile filter button. Sticks under the header from tablet width up (on phones it would take too much of the screen). */}
      <div className={`z-30 -mx-4 ${showPosterLanding ? 'mt-4' : 'mt-8'} flex md:sticky md:top-16 flex-wrap items-center gap-x-3 gap-y-2 border-y-2 border-ink/10 bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6`}>
        <CategorySwitch f={filters} />
        <div className="relative order-last min-w-0 flex-1 basis-full md:order-none md:basis-56">
          <label htmlFor="shop-search" className="sr-only">
            Search products
          </label>
          <LuSearch aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-soft" />
          <input
            id="shop-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isStickerShop ? 'Search stickers: chai, coding, cars…' : isPosterShop ? 'Search posters: cars, chai, A3…' : 'Search designs, themes, sizes…'}
            className="w-full rounded-full border-2 border-ink/20 bg-white py-2.5 pr-4 pl-11 outline-none focus:border-ink"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => setSheetOpen(true)} className="chip py-2 lg:hidden" aria-haspopup="dialog">
            <LuSlidersHorizontal aria-hidden /> Filters{activeCount ? ` (${activeCount})` : ''}
          </button>
          <label className="flex items-center gap-2 text-sm font-bold">
            <span className="hidden sm:inline">Sort</span>
            <select
              value={filters.sort}
              onChange={(e) => update({ sort: e.target.value as SortKey })}
              className="rounded-full border-2 border-ink/20 bg-white px-3 py-2 font-medium outline-none focus:border-ink"
              aria-label="Sort products"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-4 flex min-h-8 flex-wrap items-center gap-2">
        <p className="mr-2 text-sm text-ink-soft" aria-live="polite">
          {pluralise(results.length, isStickerShop ? 'sticker product' : isPosterShop ? 'poster product' : 'product')}
        </p>
        {activeChips.map((c) => (
          <button key={c.label} type="button" onClick={c.clear} className="chip chip-active py-1" aria-label={`Remove filter ${c.label}`}>
            {c.label} <LuX aria-hidden className="size-3.5" />
          </button>
        ))}
        {activeCount > 0 && (
          <button type="button" onClick={reset} className="ml-1 text-sm font-bold underline underline-offset-4">
            Clear all
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-10 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-40 max-h-[calc(100vh-11rem)] overflow-y-auto pr-2">
            <Filters f={filters} update={update} />
          </div>
        </aside>

        <section aria-label="Products">
          {loading && !products.length ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" role="status" aria-busy="true" aria-label="Loading products">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="h-64 rounded-2xl border border-ink/10 bg-paper/50 animate-pulse" />
              ))}
            </div>
          ) : error && !products.length ? (
            <div role="alert" className="rounded-2xl border-2 border-danger/30 bg-danger/10 p-6 text-center">
              <h3 className="text-lg font-bold text-danger">Unable to load catalogue</h3>
              <p className="mt-1 text-sm text-ink-soft">{error}</p>
              <button type="button" className="btn-primary mt-4" onClick={() => void refresh()}>
                Try again
              </button>
            </div>
          ) : results.length ? (
            <div className="flex flex-col">
              <ProductGrid products={visibleResults} headingLevel="h2" layout="beside-filters" />
              {visibleCount < results.length && (
                <div className="mt-12 flex flex-col items-center justify-center gap-3 py-6 border-t border-ink/10">
                  <p className="text-sm font-bold text-ink-soft">
                    Showing {visibleResults.length} of {results.length} designs
                  </p>
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, results.length))}
                    className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-white px-8 py-3.5 text-base font-extrabold text-ink transition-all hover:bg-ink hover:text-paper active:scale-95 shadow-sm"
                  >
                    Load more designs ({Math.min(PAGE_SIZE, results.length - visibleCount)} more)
                  </button>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              title="Nothing matches that (yet)."
              body={<p>Try a different word or remove a filter. If there’s a design you wish we made, tell us — that’s exactly what we want to hear.</p>}
              action={
                <button type="button" className="btn-primary" onClick={reset}>
                  Reset filters
                </button>
              }
            />
          )}
        </section>
      </div>

      {filters.category !== 'posters' && <StickerStyleGuide />}
      {filters.category !== 'stickers' && brand.features.showPosters && <PosterBuyingGuide />}

      {/* Mobile filter sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="fade-in absolute inset-0 bg-black/65" onClick={() => setSheetOpen(false)} aria-hidden />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-3xl border-t-2 border-ink bg-paper">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="text-2xl font-extrabold">Filters</h2>
              <button type="button" onClick={() => setSheetOpen(false)} className="grid size-10 place-items-center rounded-full hover:bg-paper-deep" aria-label="Close filters">
                <LuX aria-hidden className="size-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 pb-4">
              <Filters f={filters} update={update} />
            </div>
            <div className="flex gap-3 border-t-2 border-ink/10 px-5 py-4">
              <button type="button" onClick={reset} className="btn-ghost flex-1">
                Clear
              </button>
              <button type="button" onClick={() => setSheetOpen(false)} className="btn-primary flex-[2]">
                Show {pluralise(results.length, 'result')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
