import { LuInstagram, LuMail, LuMessageCircle } from 'react-icons/lu';
import { brand, whatsappLink } from '../../config/brand';
import { collections } from '../../data/collections';
import { Link } from '../../router/router';
import { shopUrl } from '../../utils/catalogue';
import { Placeholder } from '../ui/Placeholder';

function Column({ title, links }: { title: string; links: { label: string; to: string }[] }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-bold tracking-[0.16em] text-ink/60 uppercase">{title}</h2>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <Link to={l.to} className="text-ink/90 underline-offset-4 hover:text-cinema-red hover:underline">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const { email, instagramUrl, instagramHandle, otherSocials } = brand.contact;
  const wa = whatsappLink();
  const year = new Date().getFullYear();

  const shopLinks = [
    { label: 'All stickers', to: shopUrl({ category: 'stickers' }) },
    { label: 'Sticker sheets & packs', to: shopUrl({ types: ['sheet', 'pack'] }) },
    ...(brand.features.showPosters
      ? [
          { label: 'All posters', to: shopUrl({ category: 'posters' }) },
          { label: 'Wall packs & sets', to: shopUrl({ types: ['poster-set'] }) },
        ]
      : []),
    { label: 'Shop everything', to: '/shop' },
  ];
  const collectLinks = [
    { label: 'Collectibles', to: '/collectibles' },
    { label: 'Mystery packs', to: '/product/mystery-pack' },
    { label: 'Build your own pack', to: '/build-your-pack' },
    { label: 'Matching duos', to: '/matching-duos' },
    { label: 'Secret messages', to: '/secret-messages' },
    { label: 'Rare collections', to: '/rare-collections' },
    { label: 'Collector passport', to: '/collector-passport' },
    { label: 'Vote for the next drop', to: '/vote-next-drop' },
  ];
  const vibeLinks = collections.slice(0, 6).map((c) => ({ label: c.name, to: shopUrl({ collections: [c.id] }) }));
  const helpLinks = [
    { label: 'About', to: '/about' },
    { label: 'FAQ', to: '/faq' },
    { label: 'Contact', to: '/contact' },
    { label: 'Shipping & pickup', to: '/policies/shipping' },
    { label: 'Returns & cancellations', to: '/policies/returns' },
    { label: 'Privacy', to: '/policies/privacy' },
    { label: 'Terms', to: '/policies/terms' },
  ];

  return (
    <footer className="mt-24 border-t border-mint/15 bg-paper-deep text-ink">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div>
          <p className="font-display text-4xl font-extrabold tracking-tight">{brand.name}</p>
          <p className="mt-3 max-w-sm text-ink/75">{brand.description}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {instagramUrl && (
              <a href={instagramUrl} target="_blank" rel="noreferrer" className="chip border-ink/20 bg-transparent text-ink hover:border-lime">
                <LuInstagram aria-hidden /> {instagramHandle ?? 'Instagram'}
              </a>
            )}
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="chip border-ink/20 bg-transparent text-ink hover:border-lime">
                <LuMessageCircle aria-hidden /> WhatsApp
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="chip border-ink/20 bg-transparent text-ink hover:border-lime">
                <LuMail aria-hidden /> {email}
              </a>
            )}
            {otherSocials.map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="chip border-ink/20 bg-transparent text-ink hover:border-lime">
                {s.label}
              </a>
            ))}
            {!instagramUrl && !wa && !email && <Placeholder>Social & contact links not set up yet</Placeholder>}
          </div>
        </div>
        <Column title="Shop" links={shopLinks} />
        <Column title="Collect" links={collectLinks} />
        <Column title="Vibes" links={vibeLinks} />
        <Column title="Help" links={helpLinks} />
      </div>
      <div className="border-t border-paper/15">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-ink/60 sm:flex-row sm:justify-between sm:px-6">
          <p>
            © {year} {brand.displayName}. All designs original. Made in {brand.city}.
          </p>
          {brand.isPrototype && <p>Prototype storefront — no real orders or payments are processed.</p>}
        </div>
      </div>
    </footer>
  );
}
