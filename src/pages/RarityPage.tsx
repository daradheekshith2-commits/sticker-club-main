/**
 * RARE COLLECTIONS — /rare-collections (optional ?series=S01)
 *
 * A collection explorer: every design grouped by rarity tier, filterable by
 * series. Rarity is a DEMO classification of how designs are planned to be
 * printed — not odds, not stock. No counts of copies are ever shown.
 */
import { LuInfo } from 'react-icons/lu';
import { rarityDataSource, rarityTiers, series } from '../data/rarity';
import { usePageMeta } from '../hooks/usePageMeta';
import { Link, useSearchParams } from '../router/router';
import type { Product } from '../types/product';
import { isPurchasable } from '../utils/catalogue';
import { rarityGroups } from '../utils/collectibles';
import { formatPrice } from '../utils/format';
import { ProductImage } from '../components/art/ProductArt';
import { DemoTag, RarityBadge, rarityFrameClass } from '../components/collectible/RarityBadge';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';

function CollectibleTile({ product }: { product: Product }) {
  const s = series.find((x) => x.id === product.seriesId);
  return (
    <Link to={`/product/${product.slug}`} className="group block">
      <span className={`block overflow-hidden rounded-2xl ${rarityFrameClass(product.rarity)}`}>
        <span className="block overflow-hidden rounded-xl">
          <ProductImage product={product} className="aspect-square w-full transition-transform group-hover:scale-105" />
        </span>
      </span>
      <span className="mt-2 block text-sm leading-tight font-bold group-hover:underline">{product.name}</span>
      <span className="block text-xs text-ink-soft">
        {s ? `${s.id} · ${s.name}` : ''}
        {isPurchasable(product) ? ` · ${formatPrice(product.price)}` : ' · coming later'}
      </span>
      {product.edition && !product.edition.confirmed && <span className="block text-xs text-ink-soft">Run size to be confirmed</span>}
    </Link>
  );
}

export function RarityPage() {
  usePageMeta('Rare collections', 'Browse every design by series and rarity: Common, Uncommon, Rare and Limited Edition.');
  const [params, setParams] = useSearchParams();
  const active = series.find((s) => s.id === params.get('series'))?.id ?? null;
  const groups = rarityGroups().map((g) => ({ ...g, items: g.items.filter((p) => !active || p.seriesId === active) }));

  const choose = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('series', id);
    else next.delete('series');
    setParams(next, { replace: true });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Collectibles', to: '/collectibles' }, { label: 'Rare collections' }]} />
      <h1 className="mt-4 text-4xl leading-none font-extrabold md:text-6xl">Rare sticker hunting</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">Every design belongs to a series and a rarity tier. Collect the commons, hunt the rares, and watch for limited runs.</p>
      {rarityDataSource === 'demo' && (
        <p className="mt-4 flex max-w-3xl gap-2 rounded-xl bg-white p-3 text-sm">
          <LuInfo aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong>Demo rarity data.</strong> These tiers show how designs are planned to be printed. They aren’t based on real print runs yet, and we don’t show stock counts, odds or edition numbers until those exist.
          </span>
        </p>
      )}

      {/* Tier legend */}
      <ul className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {rarityTiers.map((t) => (
          <li key={t.id} className="rounded-2xl bg-white p-4">
            <RarityBadge rarity={t.id} />
            <p className="mt-2 text-sm text-ink-soft">{t.meaning}</p>
          </li>
        ))}
      </ul>

      {/* Series filter */}
      <nav aria-label="Filter by series" className="-mx-4 mt-8 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <button type="button" onClick={() => choose(null)} aria-pressed={!active} className={`chip shrink-0 ${!active ? 'chip-active' : ''}`}>
          All series
        </button>
        {series.map((s) => (
          <button key={s.id} type="button" onClick={() => choose(s.id)} aria-pressed={active === s.id} className={`chip shrink-0 ${active === s.id ? 'chip-active' : ''}`}>
            <span aria-hidden className="size-3 rounded-full border border-ink" style={{ backgroundColor: s.color }} />
            {s.id} · {s.name}
          </button>
        ))}
      </nav>

      <div className="mt-8 space-y-12">
        {groups.map(({ tier, items }) => (
          <section key={tier.id} aria-labelledby={`tier-${tier.id}`}>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h2 id={`tier-${tier.id}`} className="text-2xl font-extrabold md:text-3xl">
                {tier.label}
              </h2>
              <span className="text-sm text-ink-soft">{items.length} design{items.length === 1 ? '' : 's'}</span>
              {rarityDataSource === 'demo' && <DemoTag>Demo tier</DemoTag>}
            </div>
            {items.length ? (
              <ul className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
                {items.map((p) => (
                  <li key={p.id}>
                    <CollectibleTile product={p} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-soft">No {tier.label.toLowerCase()} designs in this series yet.</p>
            )}
          </section>
        ))}
      </div>

      <section className="mt-16 grid gap-4 rounded-[var(--radius-card)] border border-mint/15 bg-paper-deep p-6 text-ink md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <h2 className="text-2xl font-extrabold">Hunting for something special?</h2>
          <p className="mt-1 text-ink/85">Mystery packs add a surprise sticker to five guaranteed designs. The collector passport tracks which series you’ve found.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/product/mystery-pack" className="btn-accent">
            Mystery packs
          </Link>
          <Link to="/collector-passport" className="btn-ghost">
            Collector passport
          </Link>
        </div>
      </section>
    </div>
  );
}
