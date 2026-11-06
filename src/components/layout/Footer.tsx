import { LuInstagram, LuMail, LuMessageCircle, LuPhone } from 'react-icons/lu';
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
  const { email, instagramUrl, instagramHandle, phone, otherSocials } = brand.contact;
  const wa = whatsappLink();
  const year = new Date().getFullYear();

  const shopLinks = [
    { label: 'All stickers', to: shopUrl({ category: 'stickers', types: ['single'] }) },
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
    { label: 'Privacy', to: '/policies/privacy' },
    { label: 'Terms', to: '/policies/terms' },
  ];

  return (
    <footer className="mt-24 border-t border-mint/15 bg-paper-deep text-ink">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="Pixwora Logo" className="size-10 rounded-full object-cover border border-mint/40 shadow-sm" />
            <p className="font-display text-4xl font-extrabold tracking-tight">{brand.name}</p>
          </div>
          <p className="mt-3 max-w-sm text-ink/75">{brand.description}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {instagramUrl && (
              <a href={instagramUrl} target="_blank" rel="noreferrer" className="chip border-ink/20 bg-transparent text-ink hover:border-lime" title="Follow us on Instagram">
                <LuInstagram aria-hidden /> {instagramHandle ?? 'Instagram'}
              </a>
            )}
            {phone && (
              <a href={`tel:${phone}`} className="chip border-ink/20 bg-transparent text-ink hover:border-lime" title="Call or Contact us">
                <LuPhone aria-hidden /> +91 {phone}
              </a>
            )}
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="chip border-ink/20 bg-transparent text-ink hover:border-lime" title="Chat on WhatsApp">
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
            {!instagramUrl && !phone && !wa && !email && <Placeholder>Social & contact links not set up yet</Placeholder>}
          </div>

          {/* Quick Notes for Customers */}
          <div className="mt-6 rounded-2xl border border-mint/20 bg-paper/60 p-4 shadow-sm backdrop-blur-sm">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-mint">
              <span className="inline-block size-2 rounded-full bg-mint animate-pulse" />
              Quick Notes
            </p>
            <ol className="mt-2.5 space-y-2.5 text-xs text-ink/85 leading-relaxed">
              <li className="flex items-start gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-mint/20 text-[11px] font-extrabold text-mint">
                  1
                </span>
                <span>
                  For a better experience, use desktop site.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-mint/20 text-[11px] font-extrabold text-mint">
                  2
                </span>
                <span>
                  If anybody wants to buy a single or 2 stickers, combine with your friends to satisfy the checkout limit or else contact{' '}
                  {phone ? (
                    <a href={`tel:${phone}`} className="font-semibold text-mint underline hover:text-ink">
                      +91 {phone}
                    </a>
                  ) : (
                    'our phone number'
                  )}
                  {wa ? (
                    <>
                      {' '}or{' '}
                      <a href={wa} target="_blank" rel="noreferrer" className="font-semibold text-mint underline hover:text-ink">
                        WhatsApp
                      </a>
                    </>
                  ) : null}{' '}
                  for help.
                </span>
              </li>
            </ol>
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
        </div>
      </div>
    </footer>
  );
}
