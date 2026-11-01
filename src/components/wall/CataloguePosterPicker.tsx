import { useMemo, useState } from 'react';
import { LuSearch } from 'react-icons/lu';
import { collections } from '../../data/collections';
import { products } from '../../data/products';
import { useCatalogue } from '../../context/CatalogueContext';
import type { CollectionId } from '../../types/product';
import { isPurchasable } from '../../utils/catalogue';
import { ProductImage } from '../art/ProductArt';

export function CataloguePosterPicker({ currentProductId, onPick }: { currentProductId?: string; onPick: (productId: string) => void }) {
  const { products: catalogueProducts, isPurchasable: checkPurchasable } = useCatalogue();
  const [query, setQuery] = useState('');
  const [vibe, setVibe] = useState<CollectionId | null>(null);

  const designs = useMemo(() => {
    return catalogueProducts.length
      ? catalogueProducts.filter((p) => (p.category === 'posters' || p.productType === 'poster') && checkPurchasable(p))
      : products.filter((p) => p.productType === 'poster' && isPurchasable(p));
  }, [catalogueProducts, checkPurchasable]);

  const vibes = collections.filter((c) => designs.some((p) => p.collections.includes(c.id)));
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return designs.filter(
      (p) =>
        (!vibe || p.collections.includes(vibe)) &&
        (!q || [p.name, p.shortDescription, ...p.tags].join(' ').toLowerCase().includes(q)),
    );
  }, [designs, query, vibe]);

  return (
    <div>
      <div className="relative">
        <label htmlFor="wall-design-search" className="sr-only">
          Search our poster designs
        </label>
        <LuSearch aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-soft" />
        <input
          id="wall-design-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search designs…"
          className="w-full rounded-full border-2 border-ink/20 bg-white py-2 pr-3 pl-9 text-sm outline-none focus:border-ink"
        />
      </div>
      <div className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter designs by vibe">
        <button type="button" aria-pressed={vibe === null} onClick={() => setVibe(null)} className={`chip shrink-0 py-1 text-xs ${vibe === null ? 'chip-active' : ''}`}>
          All
        </button>
        {vibes.map((c) => (
          <button key={c.id} type="button" aria-pressed={vibe === c.id} onClick={() => setVibe(vibe === c.id ? null : c.id)} className={`chip shrink-0 py-1 text-xs ${vibe === c.id ? 'chip-active' : ''}`}>
            {c.name}
          </button>
        ))}
      </div>
      {list.length ? (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {list.map((p) => {
            const chosen = p.id === currentProductId;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onPick(p.id)}
                  aria-pressed={chosen}
                  aria-label={`Use ${p.name}`}
                  className={`block w-full overflow-hidden rounded-lg border-2 bg-white text-left transition-colors ${chosen ? 'border-ink' : 'border-transparent hover:border-ink/40'}`}
                >
                  <div className="aspect-[1/1.414] w-full overflow-hidden bg-paper-deep">
                    <ProductImage product={p} className="size-full object-cover object-center" />
                  </div>
                  <span className="block truncate px-1.5 py-1 text-[11px] font-bold">{p.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink-soft">No designs match. Try another word or vibe.</p>
      )}
    </div>
  );
}
