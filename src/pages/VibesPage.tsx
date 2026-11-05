import { useMemo } from 'react';
import { collections } from '../data/collections';
import { useCatalogue } from '../context/CatalogueContext';
import { usePageMeta } from '../hooks/usePageMeta';
import { Link } from '../router/router';
import { isPurchasable, shopUrl } from '../utils/catalogue';
import { motifs } from '../components/art/motifs';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { pluralise } from '../utils/format';

/** Every "Shop by vibe" collection on one page. */
export function VibesPage() {
  usePageMeta('Shop by vibe', 'Find stickers by interest: anime, movies, life quotes, superheroes, cute, gaming-inspired and more.');
  const { products } = useCatalogue();

  // Pre-calculate design counts per collection in a single O(N) pass instead of O(collections * products) filters
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of collections) {
      map[c.id] = 0;
    }
    for (const p of products) {
      if (isPurchasable(p)) {
        for (const coll of p.collections) {
          if (map[coll] !== undefined) {
            map[coll] += 1;
          }
        }
      }
    }
    return map;
  }, [products]);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Vibes' }]} />
      <h1 className="mt-4 text-5xl font-extrabold md:text-7xl">Shop by vibe</h1>
      <p className="mt-3 max-w-xl text-lg text-ink-soft">Pick what you’re into and we’ll show you the stickers that match.</p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((c) => {
          const Motif = motifs[c.motif];
          const count = counts[c.id] ?? 0;
          return (
            <li key={c.id}>
              <Link
                to={shopUrl({ collections: [c.id] })}
                className="on-light group relative flex min-h-48 flex-col justify-end overflow-hidden rounded-[var(--radius-card)] border-2 border-ink p-6 transition-transform hover:-translate-y-1"
                style={{ backgroundColor: c.color }}
              >
                <svg viewBox="0 0 100 100" className="absolute top-4 right-4 size-24 transition-transform group-hover:rotate-6" aria-hidden>
                  <Motif fg="#121212" bg={c.color} accent="#FFFFFF" />
                </svg>
                <h2 className="text-3xl font-extrabold">{c.name}</h2>
                <p className="mt-1 max-w-[80%]">{c.blurb}</p>
                {c.note && <p className="mt-2 max-w-[80%] text-xs font-bold">{c.note}</p>}
                <p className="mt-3 text-sm font-bold">{pluralise(count, 'design')} →</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
