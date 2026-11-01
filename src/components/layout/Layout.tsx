import type { ReactNode } from 'react';
import { useCart } from '../../context/CartContext';
import { CartDrawer } from '../cart/CartDrawer';
import { Footer } from './Footer';
import { SiteHeader } from './SiteHeader';

/** Wraps every page: header, page content, footer and cart. */
export function Layout({ children }: { children: ReactNode }) {
  const { announcement } = useCart();
  return (
    <>
      <a href="#main" className="sr-only z-[60] rounded-full bg-ink px-4 py-2 text-paper focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Footer />
      <CartDrawer />
      {/* Screen readers hear "added to cart" messages from here. */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </>
  );
}
