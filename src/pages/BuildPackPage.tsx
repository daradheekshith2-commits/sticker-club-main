/**
 * BUILD YOUR OWN PACK — /build-your-pack
 *
 * Theme → pack size (5 or 10) → pick exactly that many designs → finish →
 * review → cart. All prices and rules come from src/data/packBuilder.ts via
 * src/utils/customPack.ts; this page only displays them.
 */
import { useId, useMemo, useState, type ReactNode } from 'react';
import { LuCheck, LuInfo, LuSearch, LuShoppingBag, LuX } from 'react-icons/lu';
import { useCart } from '../context/CartContext';
import { packFinishes, packSizes, packSurprise } from '../data/packBuilder';
import { getSeries, series } from '../data/rarity';
import { usePageMeta } from '../hooks/usePageMeta';
import { shopUrl } from '../utils/catalogue';
import { designOf, packEligibleProducts } from '../utils/collectibles';
import { canAddDesign, defaultFinishId, getPackFinish, packPrice, packProblem, toPackConfig, type PackCount } from '../utils/customPack';
import { formatPrice } from '../utils/format';
import { StickerSvg } from '../components/art/Sticker';
import { BonusGiftNote } from '../components/collectible/BonusGift';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';

function Step({ n, title, hint, children }: { n: number; title: string; hint?: ReactNode; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="min-w-0 rounded-[var(--radius-card)] border-2 border-ink/10 bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-baseline gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-lime">{n}</span>
        <div className="min-w-0">
          <h2 id={id} className="font-display text-xl font-extrabold">
            {title}
          </h2>
          {hint && <p className="text-sm text-ink-soft">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

type Filter = 'theme' | 'all' | string; // a series id

export function BuildPackPage() {
  usePageMeta('Build your own sticker pack', 'Choose a theme, pick 5 or 10 designs and get a surprise sticker on top.');
  const { addCustomPack, openCart } = useCart();
  const eligible = useMemo(() => packEligibleProducts(), []);
  const eligibleIds = useMemo(() => new Set(eligible.map((p) => p.id)), [eligible]);

  const [seriesId, setSeriesId] = useState<string | null>(null);
  const [size, setSize] = useState<PackCount>(5);
  const [designIds, setDesignIds] = useState<string[]>([]);
  const [finishId, setFinishId] = useState(defaultFinishId());
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  const draft = { seriesId, size, designIds, finishId };
  const problem = packProblem(draft, eligibleIds);
  const price = packPrice(size, finishId);
  const theme = getSeries(seriesId ?? undefined);
  const full = !canAddDesign(draft);
  const over = designIds.length > size;

  const visible = eligible.filter((p) => {
    if (filter === 'theme' && seriesId && p.seriesId !== seriesId) return false;
    if (filter !== 'theme' && filter !== 'all' && p.seriesId !== filter) return false;
    const q = query.trim().toLowerCase();
    return !q || [p.name, ...p.tags].join(' ').toLowerCase().includes(q);
  });

  const chooseTheme = (id: string) => {
    setSeriesId(id);
    setFilter('theme');
    setMessage(null);
  };

  const toggle = (id: string) => {
    setAdded(null);
    if (designIds.includes(id)) {
      setDesignIds(designIds.filter((x) => x !== id));
      setMessage(null);
      return;
    }
    if (full) {
      setMessage(`Your ${size}-sticker pack is full. Remove a design from the tray to swap it for this one.`);
      return;
    }
    setDesignIds([...designIds, id]);
    setMessage(null);
  };

  const add = () => {
    const config = toPackConfig(draft, eligibleIds);
    addCustomPack(config, 1);
    setAdded(`Added a ${config.size}-sticker ${theme?.name ?? ''} pack (+${config.surprise.count} surprise) to your cart.`);
    setDesignIds([]);
    openCart();
  };

  const filters: { id: Filter; label: string }[] = [
    ...(theme ? [{ id: 'theme', label: `${theme.name} only` }] : []),
    { id: 'all', label: 'All designs' },
    ...series.filter((s) => s.id !== seriesId).map((s) => ({ id: s.id, label: s.name })),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Stickers', to: shopUrl({ category: 'stickers' }) }, { label: 'Build your own pack' }]} />
      <h1 className="mt-4 text-4xl leading-none font-extrabold md:text-6xl">Build your own pack</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        Choose a theme, pick exactly 5 or 10 designs you love, and we add {packSurprise.count} surprise sticker on top.
      </p>
      <p className="mt-4 flex max-w-3xl gap-2 rounded-xl bg-white p-3 text-sm">
        <LuInfo aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>
          <strong>Prototype.</strong> Prices are provisional and no real order is placed. Only Common and Uncommon designs can be picked — rare designs stay rare.
        </span>
      </p>
      {added && (
        <p role="status" className="mt-3 max-w-3xl rounded-xl note-success p-3 text-sm font-bold">
          {added} You can build another one below.
        </p>
      )}

      <div className="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-8">
        <div className="min-w-0 space-y-4">
          <Step n={1} title="Pick a theme" hint="Sets the pack’s card and the theme of your surprise sticker.">
            <div role="radiogroup" aria-label="Pack theme" className="grid grid-cols-2 gap-2">
              {series.map((s) => (
                <label
                  key={s.id}
                  className={`relative flex cursor-pointer gap-2.5 rounded-xl border-2 p-3 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ink ${seriesId === s.id ? 'border-ink bg-paper' : 'border-ink/15 hover:border-ink/40'}`}
                >
                  <input type="radio" name="pack-theme" className="sr-only" checked={seriesId === s.id} onChange={() => chooseTheme(s.id)} />
                  <span aria-hidden className="mt-0.5 size-5 shrink-0 rounded-full border-2 border-ink" style={{ backgroundColor: s.color }} />
                  <span className="min-w-0">
                    <span className="block leading-tight font-bold">{s.name}</span>
                    <span className="block text-xs text-ink-soft">{s.blurb}</span>
                  </span>
                </label>
              ))}
            </div>
          </Step>

          <Step n={2} title="Choose a pack size">
            <div role="radiogroup" aria-label="Pack size" className="grid grid-cols-2 gap-2">
              {packSizes.map((o) => (
                <label
                  key={o.count}
                  className={`relative cursor-pointer rounded-xl border-2 p-3 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ink ${size === o.count ? 'border-ink bg-lime' : 'border-ink/15 hover:border-ink/40'}`}
                >
                  <input type="radio" name="pack-size" className="sr-only" checked={size === o.count} onChange={() => setSize(o.count)} />
                  <span className="block font-display text-2xl font-extrabold">{o.label}</span>
                  <span className="block text-sm">
                    + {packSurprise.count} surprise · <strong>{formatPrice(o.price)}</strong>
                  </span>
                </label>
              ))}
            </div>
          </Step>

          <Step n={3} title="Pick your designs" hint={`Choose exactly ${size}. Tap a design again to remove it.`}>
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative min-w-0 flex-1 basis-48">
                <span className="sr-only">Search designs</span>
                <LuSearch aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-soft" />
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search designs" className="field-input py-2 pl-9" />
              </label>
              <p className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-sm font-bold text-paper tabular-nums" aria-live="polite">
                {designIds.length} / {size} chosen
              </p>
            </div>
            <div className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter designs">
              {filters.map((f) => (
                <button key={f.id} type="button" onClick={() => setFilter(f.id)} aria-pressed={filter === f.id} className={`chip shrink-0 py-1 text-xs ${filter === f.id ? 'chip-active' : ''}`}>
                  {f.label}
                </button>
              ))}
            </div>
            {message && (
              <p role="alert" className="mt-3 rounded-xl border-2 border-tomato/50 bg-tomato/10 p-2.5 text-sm font-bold">
                {message}
              </p>
            )}
            {visible.length === 0 ? (
              <p className="mt-6 text-center text-sm text-ink-soft">No designs match. Try another filter or search.</p>
            ) : (
              <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
                {visible.map((p) => {
                  const design = designOf(p);
                  const index = designIds.indexOf(p.id);
                  const selected = index >= 0;
                  const blocked = !selected && full;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => toggle(p.id)}
                        aria-pressed={selected}
                        aria-label={`${p.name}${selected ? ', chosen' : ''}`}
                        className={`relative flex w-full flex-col items-center rounded-xl border-2 p-2 text-center transition-colors ${
                          selected ? 'border-ink bg-lime' : blocked ? 'border-ink/10 opacity-50' : 'border-ink/10 hover:border-ink'
                        }`}
                      >
                        {selected && (
                          <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-ink text-[11px] font-bold text-lime">{index + 1}</span>
                        )}
                        {design && <StickerSvg design={design} className="h-auto w-full max-w-20" />}
                        <span className="mt-1 text-xs leading-tight font-bold">{p.name}</span>
                        <span className="text-[10px] text-ink-soft">{getSeries(p.seriesId)?.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Step>

          <Step n={4} title="Finish" hint="Only finishes our printer has confirmed can be chosen.">
            <div role="radiogroup" aria-label="Finish" className="grid grid-cols-2 gap-2">
              {packFinishes.map((f) => (
                <label
                  key={f.id}
                  className={`relative rounded-xl border-2 p-3 text-sm has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ink ${
                    !f.available ? 'cursor-not-allowed border-dashed border-ink/20 text-ink-soft' : finishId === f.id ? 'cursor-pointer border-ink bg-lime' : 'cursor-pointer border-ink/15 hover:border-ink/40'
                  }`}
                >
                  <input type="radio" name="pack-finish" className="sr-only" disabled={!f.available} checked={finishId === f.id} onChange={() => setFinishId(f.id)} />
                  <span className="block font-bold">{f.label}</span>
                  <span className="block text-xs">{f.description}</span>
                  <span className="mt-1 block font-bold">
                    {!f.available ? 'Not available yet' : f.surchargePerSticker ? `+${formatPrice(f.surchargePerSticker)} per sticker` : 'No extra cost'}
                  </span>
                </label>
              ))}
            </div>
          </Step>

          <Step n={5} title={packSurprise.title} hint="Included with every built pack — nothing to choose.">
            <p className="text-sm">{packSurprise.description}</p>
          </Step>
        </div>

        {/* Tray + summary */}
        <aside className="min-w-0 lg:sticky lg:top-24" aria-labelledby="pack-summary">
          <div className="rounded-[var(--radius-card)] border-2 border-ink bg-white p-4 sm:p-5">
            <h2 id="pack-summary" className="font-display text-xl font-extrabold">
              Your pack
            </h2>
            <p className="text-sm text-ink-soft">{theme ? `${theme.id} · ${theme.name}` : 'No theme chosen yet'}</p>
            <ol className="mt-3 grid grid-cols-6 gap-1.5" aria-label="Chosen designs">
              {Array.from({ length: Math.max(size, designIds.length) }, (_, i) => {
                const p = eligible.find((x) => x.id === designIds[i]);
                const design = p && designOf(p);
                const extra = i >= size;
                return (
                  <li key={i} className={`relative aspect-square rounded-xl ${p ? (extra ? 'bg-tomato/20 ring-2 ring-tomato' : 'bg-paper') : 'border-2 border-dashed border-ink/25'}`}>
                    {p && design ? (
                      <>
                        <StickerSvg design={design} title={p.name} className="size-full p-0.5" />
                        <button
                          type="button"
                          onClick={() => toggle(p.id)}
                          className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full border-2 border-ink bg-white"
                          aria-label={`Remove ${p.name} from pack`}
                        >
                          <LuX aria-hidden className="size-3" />
                        </button>
                      </>
                    ) : (
                      <span className="grid size-full place-items-center text-xs font-bold text-ink-soft">{i + 1}</span>
                    )}
                  </li>
                );
              })}
              <li className="grid aspect-square place-items-center rounded-xl bg-ink font-display text-lg font-extrabold text-lime" title="Surprise sticker">
                <span aria-hidden>+?</span>
                <span className="sr-only">plus one surprise sticker</span>
              </li>
            </ol>

            <dl className="mt-4 space-y-1.5 text-sm">
              {[
                ['Theme', theme?.name ?? '—'],
                ['Pack size', `${size} chosen + ${packSurprise.count} surprise`],
                ['Designs chosen', `${designIds.length} of ${size}`],
                ['Finish', getPackFinish(finishId)?.label ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-ink-soft">{k}</dt>
                  <dd className={`text-right font-bold ${k === 'Designs chosen' && over ? 'text-danger' : ''}`}>{v}</dd>
                </div>
              ))}
              <div className="flex justify-between border-t-2 border-ink pt-2 text-base">
                <dt className="font-bold">Pack price</dt>
                <dd className="font-display text-2xl font-extrabold tabular-nums" aria-live="polite">
                  {price !== null ? formatPrice(price) : '—'}
                </dd>
              </div>
            </dl>
            <p className="mt-1 text-xs text-ink-soft">Provisional price. No delivery charges or discounts are included.</p>

            <button type="button" onClick={add} disabled={Boolean(problem)} aria-describedby="pack-problem" className="btn-primary mt-4 w-full py-4 text-base">
              {problem ? (
                'Add to cart'
              ) : (
                <>
                  <LuShoppingBag aria-hidden /> Add pack to cart · {price !== null ? formatPrice(price) : ''}
                </>
              )}
            </button>
            <p id="pack-problem" className={`mt-2 text-center text-sm ${over ? 'font-bold text-danger' : 'text-ink-soft'}`}>
              {problem ?? (
                <span className="inline-flex items-center gap-1 font-bold text-ink">
                  <LuCheck aria-hidden /> Ready — {size} designs + {packSurprise.count} surprise.
                </span>
              )}
            </p>
            <div className="mt-3">
              <BonusGiftNote compact />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
