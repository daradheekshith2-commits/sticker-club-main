import { useEffect, useRef, useState, type FormEvent } from 'react';
import { LuChevronDown, LuMenu, LuSearch, LuShoppingBag, LuX } from 'react-icons/lu';
import { brand } from '../../config/brand';
import { megaMenus, plainLinks, vibeLinks, type MegaMenu } from '../../config/navigation';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { Link, useLocation, useNavigate } from '../../router/router';
import { getProductBySlug, shopUrl } from '../../utils/catalogue';
import { formatPrice } from '../../utils/format';
import { ProductImage } from '../art/ProductArt';

const menus = megaMenus.filter((m) => m.id !== 'posters' || brand.features.showPosters);

function Wordmark() {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label={`${brand.displayName} home`}>
      <svg viewBox="0 0 64 64" className="size-9 -rotate-6" aria-hidden>
        <circle cx="32" cy="32" r="30" fill="#fff" stroke="#121212" strokeWidth="2" />
        <circle cx="32" cy="32" r="24" fill="#D4FF3A" />
        <path d="M40 16 L26 34 h9 l-5 14 l16 -19 h-9 z" fill="#121212" />
      </svg>
      <span className="font-display text-lg leading-none font-extrabold tracking-tight whitespace-nowrap sm:text-xl">PIXWORA</span>
    </Link>
  );
}

function SearchForm({ onDone, autoFocus }: { onDone?: () => void; autoFocus?: boolean }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate(shopUrl({ query: q }));
    onDone?.();
  };
  return (
    <form role="search" onSubmit={submit} className="relative w-full">
      <label htmlFor="site-search" className="sr-only">
        Search stickers and posters
      </label>
      <LuSearch aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-soft" />
      <input
        id="site-search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus={autoFocus}
        placeholder="Search chai, coding, cars, A3 posters…"
        className="w-full rounded-full border-2 border-ink bg-white py-3 pr-4 pl-11 text-base outline-none"
      />
    </form>
  );
}

/** The big dropdown panel for Stickers or Posters (desktop). */
function MegaPanel({ menu }: { menu: MegaMenu }) {
  const promo = getProductBySlug(menu.promoSlug);
  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[1fr_1.4fr_260px]">
      <div>
        <p className="eyebrow mb-3">Formats</p>
        <ul className="space-y-1">
          <li>
            <Link to={menu.allLink.to} className="block rounded-xl px-3 py-2 font-display text-xl font-extrabold hover:bg-lime">
              {menu.allLink.label} →
            </Link>
          </li>
          {menu.formats.map((f) => (
            <li key={f.label}>
              <Link to={f.to} className="block rounded-xl px-3 py-2 hover:bg-paper-deep">
                <span className="font-bold">{f.label}</span>
                {f.note && <span className="block text-sm text-ink-soft">{f.note}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div>
        {menu.pills && (
          <div className="mb-6">
            <p className="eyebrow mb-3">{menu.pills.title}</p>
            <div className="flex flex-wrap gap-2">
              {menu.pills.links.map((l) => (
                <Link key={l.label} to={l.to} className="chip px-4">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        )}
        <p className="eyebrow mb-3">Shop {menu.label.toLowerCase()} by vibe</p>
        <div className="flex flex-wrap gap-2">
          {vibeLinks(menu.id).map((l) => (
            <Link key={l.label} to={l.to} className="chip">
              {l.label}
            </Link>
          ))}
        </div>
      </div>
      {promo && (
        <Link to={`/product/${promo.slug}`} className="group block overflow-hidden rounded-[var(--radius-card)] border-2 border-ink bg-white">
          <ProductImage product={promo} className="aspect-[4/3] w-full transition-transform group-hover:scale-[1.03]" />
          <div className="p-3">
            <p className="text-xs font-bold tracking-wide text-ink-soft uppercase">{menu.promoLabel}</p>
            <p className="font-bold">
              {promo.name} · {formatPrice(promo.price)}
            </p>
          </div>
        </Link>
      )}
    </div>
  );
}

export function SiteHeader() {
  const { itemCount, openCart } = useCart();
  const { user } = useAuth();
  const { pathname, search } = useLocation();
  const params = new URLSearchParams(search);
  const [menuOpen, setMenuOpen] = useState(false); // mobile drawer
  const [openMega, setOpenMega] = useState<string | null>(null); // desktop dropdown
  const [searchOpen, setSearchOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const hoverOpenedAt = useRef(0);

  // Close everything whenever the page changes.
  useEffect(() => {
    setMenuOpen(false);
    setOpenMega(null);
    setSearchOpen(false);
  }, [pathname, search]);

  // Escape closes whichever panel is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (menuOpen) {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
      setOpenMega(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  // Hover opens menus on desktop; a short delay stops flicker when moving the mouse.
  const hoverOpen = (id: string) => {
    window.clearTimeout(closeTimer.current);
    if (openMega !== id) hoverOpenedAt.current = Date.now();
    setOpenMega(id);
  };
  // Click toggles the menu — except right after hovering opened it, when a
  // click would otherwise close the menu the user is reaching for.
  const clickToggle = (id: string) => {
    const justHovered = Date.now() - hoverOpenedAt.current < 500;
    setOpenMega((o) => (o === id && !justHovered ? null : id));
  };
  const hoverClose = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpenMega(null), 150);
  };

  const categoryActive = (id: string) => pathname === '/shop' && params.get('category') === id;
  const pill = (active: boolean) =>
    `flex items-center gap-1 rounded-full px-3 py-2 text-sm font-bold transition-colors ${active ? 'bg-ink text-paper' : 'hover:bg-paper-deep'}`;
  const activeMenu = menus.find((m) => m.id === openMega);

  return (
    <header
      className="sticky top-2 z-40 mx-auto max-w-7xl px-3 transition-all sm:top-3.5 sm:px-6"
      onMouseLeave={hoverClose}
    >
      <div className="flex h-16 items-center gap-3 rounded-full border border-mint/20 bg-paper-deep/85 px-4 sm:px-6 shadow-[0_16px_36px_-10px_rgba(0,0,0,0.65),0_0_0_1px_rgba(168,240,220,0.08)] backdrop-blur-xl">
        <button
          ref={menuButton}
          type="button"
          className="grid size-10 place-items-center rounded-full hover:bg-paper lg:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <LuX aria-hidden className="size-5" /> : <LuMenu aria-hidden className="size-5" />}
        </button>

        <Wordmark />

        <nav aria-label="Main" className="ml-6 hidden lg:block">
          <ul className="flex items-center gap-1">
            {menus.map((m) => (
              <li key={m.id} onMouseEnter={() => hoverOpen(m.id)}>
                <button
                  type="button"
                  className={pill(openMega === m.id || categoryActive(m.id))}
                  aria-expanded={openMega === m.id}
                  aria-controls="mega-panel"
                  onClick={() => clickToggle(m.id)}
                >
                  {m.label}
                  <LuChevronDown aria-hidden className={`size-4 transition-transform ${openMega === m.id ? 'rotate-180' : ''}`} />
                </button>
              </li>
            ))}
            {plainLinks.map((l) => {
              const active = l.to === '/shop' ? pathname === '/shop' && !params.get('category') : pathname === l.to;
              return (
                <li key={l.label} onMouseEnter={hoverClose}>
                  <Link to={l.to} className={pill(active)} aria-current={active ? 'page' : undefined}>
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <Link to={user?.role === 'ADMIN' ? '/admin' : user ? '/account' : '/login'} className="inline-flex shrink-0 items-center rounded-full px-2 py-2 text-xs font-bold text-mint transition-colors hover:bg-paper sm:px-3 sm:text-sm">{user ? 'Account' : 'Log in'}</Link>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full hover:bg-paper"
            aria-label={searchOpen ? 'Close search' : 'Search'}
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((o) => !o)}
          >
            {searchOpen ? <LuX aria-hidden className="size-5" /> : <LuSearch aria-hidden className="size-5" />}
          </button>
          <button
            type="button"
            onClick={openCart}
            className="group relative flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-bold text-paper transition-all hover:scale-105 active:scale-95 shadow-md"
            aria-label={`Open cart, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
          >
            <LuShoppingBag aria-hidden className="size-4 transition-transform group-hover:-rotate-12" />
            <span className="hidden sm:inline">Cart</span>
            <span className="grid min-w-5 place-items-center rounded-full bg-lime px-1.5 text-xs font-mono font-bold leading-5 text-ink tabular-nums shadow-sm">{itemCount}</span>
          </button>
        </div>
      </div>

      {/* Desktop dropdown */}
      {activeMenu && (
        <div
          id="mega-panel"
          className="fade-in absolute inset-x-3 sm:inset-x-6 top-[calc(100%+0.5rem)] hidden rounded-2xl border border-mint/20 bg-paper-deep/95 shadow-2xl backdrop-blur-xl lg:block overflow-hidden"
          onMouseEnter={() => hoverOpen(activeMenu.id)}
        >
          <MegaPanel menu={activeMenu} />
        </div>
      )}

      {searchOpen && (
        <div className="fade-in absolute inset-x-3 sm:inset-x-6 top-[calc(100%+0.5rem)] rounded-2xl border border-mint/20 bg-paper-deep/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto max-w-2xl">
            <SearchForm autoFocus onDone={() => setSearchOpen(false)} />
          </div>
        </div>
      )}

      {/* Mobile menu: both categories get equal sections */}
      {menuOpen && (
        <nav id="mobile-nav" aria-label="Mobile" className="fade-in absolute inset-x-3 top-[calc(100%+0.5rem)] max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-mint/20 bg-paper-deep/95 p-4 shadow-2xl backdrop-blur-xl lg:hidden">
          <div className="mx-auto grid max-w-7xl gap-6 sm:grid-cols-2">
            {menus.map((m) => (
              <section key={m.id} aria-label={m.label}>
                <Link to={m.allLink.to} className="block rounded-xl bg-lime px-3 py-2 font-display text-2xl font-extrabold">
                  {m.label} →
                </Link>
                <ul className="mt-2">
                  {m.formats.map((f) => (
                    <li key={f.label}>
                      <Link to={f.to} className="block rounded-lg px-3 py-2 font-bold hover:bg-paper-deep">
                        {f.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                {m.pills && (
                  <div className="mt-2 flex flex-wrap gap-2 px-3">
                    {m.pills.links.map((l) => (
                      <Link key={l.label} to={l.to} className="chip">
                        {l.label}
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            ))}
            <ul className="border-t-2 border-ink/10 pt-3 sm:col-span-2">
              {plainLinks.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="block rounded-xl px-3 py-2 font-display text-xl font-extrabold hover:bg-paper-deep">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      )}
    </header>
  );
}
