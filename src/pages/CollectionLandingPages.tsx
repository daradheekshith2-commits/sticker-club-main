/**
 * Landing pages for two sticker lines:
 * - /matching-duos     — coordinated pairs sold as one product
 * - /secret-messages   — message stickers with sealed message cards
 * Products come from the catalogue (productType 'duo' / 'secret').
 */
import { LuArrowRight } from 'react-icons/lu';
import { useCatalogue } from '../context/CatalogueContext';
import { messageCardSeries } from '../data/messageCards';
import { usePageMeta } from '../hooks/usePageMeta';
import { Link } from '../router/router';
import type { DuoPairing } from '../types/collectible';
import { shopUrl, sortProducts } from '../utils/catalogue';
import { pairingTitles } from '../components/collectible/ProductExtras';
import { SecretMessageRevealSection } from '../components/collectible/SecretMessageRevealSection';
import { ProductGrid } from '../components/product/ProductCard';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';

const pairingBlurbs: Record<DuoPairing, string> = {
  'two-poses': 'The same original character, doing two different things.',
  complementary: 'Two symbols that complete each other — plug and socket, chai and samosa.',
  halves: 'One illustration cut in two. It’s only whole when both halves are together.',
  'laptop-phone': 'One design in two formats, so your laptop and phone match.',
};

export function DuosPage() {
  usePageMeta('Matching duos', 'Coordinated sticker pairs, sold together as one product.');
  const { products } = useCatalogue();
  const duos = sortProducts(
    products.filter((p) => p.productType === 'duo' || p.collections.includes('duos')),
    'featured',
  );
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Collectibles', to: '/collectibles' }, { label: 'Matching duos' }]} />
      <h1 className="mt-4 text-4xl leading-none font-extrabold md:text-6xl">Matching duos</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        Two stickers designed to go together, sold as one product. Keep both, or give one to your best friend, roommate or project partner.
      </p>
      <ul className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(Object.keys(pairingTitles) as DuoPairing[]).map((k) => (
          <li key={k} className="rounded-2xl bg-white p-4">
            <h2 className="font-display text-lg leading-tight font-extrabold">{pairingTitles[k]}</h2>
            <p className="mt-1 text-sm text-ink-soft">{pairingBlurbs[k]}</p>
          </li>
        ))}
      </ul>
      <section aria-labelledby="duo-grid" className="mt-12">
        <h2 id="duo-grid" className="mb-6 text-3xl font-extrabold">
          All duos
        </h2>
        <ProductGrid products={duos} />
      </section>
    </div>
  );
}

export function SecretMessagesPage() {
  usePageMeta('Secret message stickers', 'Original message stickers, each with a sealed message card.');
  const { products } = useCatalogue();
  const items = sortProducts(
    products.filter((p) => p.productType === 'secret' || p.collections.includes('secret')),
    'featured',
  );
  const series = messageCardSeries.filter((s) => s.id !== 'mc-mixed');
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Collectibles', to: '/collectibles' }, { label: 'Secret messages' }]} />
      <SecretMessageRevealSection />

      <section aria-labelledby="card-series" className="mt-12">
        <h2 id="card-series" className="text-2xl font-extrabold">
          Message card series
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {series.map((s) => (
            <li key={s.id} className="on-light rounded-2xl border-2 border-ink p-4" style={{ backgroundColor: s.color }}>
              <h3 className="font-display text-lg font-extrabold">{s.name}</h3>
              <p className="mt-1 text-sm">{s.tone}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="secret-grid" className="mt-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <h2 id="secret-grid" className="text-3xl font-extrabold">
            Message stickers
          </h2>
          <Link to={shopUrl({ types: ['secret'] })} className="btn-ghost">
            Filter in the shop <LuArrowRight aria-hidden />
          </Link>
        </div>
        <ProductGrid products={items} />
      </section>
    </div>
  );
}
