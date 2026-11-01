/**
 * A SMALL CLIENT-SIDE ROUTER
 *
 * Why not React Router? This storefront only needs a handful of routes, and a
 * ~100-line router is easy to read end to end. The exported names (Link,
 * NavLink, useNavigate, useParams, useSearchParams, useLocation) deliberately
 * match React Router, so switching later is mostly a change of import path.
 *
 * How it works: the browser's History API lets us change the URL without a
 * page reload. We keep the current location in React state and re-render the
 * matching page whenever it changes (on link clicks or back/forward).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';

interface Location {
  pathname: string;
  search: string;
}

interface NavigateOptions {
  replace?: boolean;
  /** Scroll to the top after navigating (default true). */
  scroll?: boolean;
}

interface RouterContextValue {
  location: Location;
  navigate: (to: string, options?: NavigateOptions) => void;
}

// GitHub Pages project sites live below /sticker-club/; Vercel remains at /.
const hostingBase = import.meta.env.BASE_URL.replace(/\/$/, '');
const hostedPath = (to: string) => {
  if (!hostingBase || !to.startsWith('/') || to.startsWith('//') || to === hostingBase || to.startsWith(hostingBase + '/')) return to;
  return hostingBase + to;
};
const localPath = (pathname: string) => {
  if (!hostingBase) return pathname;
  if (pathname === hostingBase) return '/';
  return pathname.startsWith(hostingBase + '/') ? pathname.slice(hostingBase.length) : pathname;
};

const RouterContext = createContext<RouterContextValue | null>(null);
const ParamsContext = createContext<Record<string, string>>({});

function readLocation(): Location {
  return { pathname: localPath(window.location.pathname), search: window.location.search };
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<Location>(readLocation);

  useEffect(() => {
    const onPop = () => setLocation(readLocation());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: string, options: NavigateOptions = {}) => {
    const { replace = false, scroll = true } = options;
    if (replace) window.history.replaceState(null, '', hostedPath(to));
    else window.history.pushState(null, '', hostedPath(to));
    setLocation(readLocation());
    if (scroll) window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  const value = useMemo(() => ({ location, navigate }), [location, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('Router hooks must be used inside <RouterProvider>');
  return ctx;
}

export const useLocation = () => useRouter().location;
export const useNavigate = () => useRouter().navigate;
export const useParams = () => useContext(ParamsContext);

/** Read and update ?query=params. Updating does not scroll to top. */
export function useSearchParams(): [URLSearchParams, (next: URLSearchParams, opts?: { replace?: boolean }) => void] {
  const { location, navigate } = useRouter();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const setParams = useCallback(
    (next: URLSearchParams, opts: { replace?: boolean } = {}) => {
      const qs = next.toString();
      navigate(`${location.pathname}${qs ? `?${qs}` : ''}`, { replace: opts.replace, scroll: false });
    },
    [location.pathname, navigate],
  );
  return [params, setParams];
}

/** Matches '/product/:slug' against '/product/chai-first' → { slug: 'chai-first' }. */
export function matchPath(pattern: string, pathname: string): Record<string, string> | null {
  if (pattern === '*') return {};
  const clean = (s: string) => s.replace(/\/+$/, '') || '/';
  const pParts = clean(pattern).split('/');
  const uParts = clean(pathname).split('/');
  if (pParts.length !== uParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pParts.length; i++) {
    if (pParts[i].startsWith(':')) params[pParts[i].slice(1)] = decodeURIComponent(uParts[i]);
    else if (pParts[i] !== uParts[i]) return null;
  }
  return params;
}

export interface RouteDef {
  path: string;
  element: ReactNode;
}

/** Renders the first route whose path matches the current URL. */
export function Routes({ routes }: { routes: RouteDef[] }) {
  const { pathname } = useLocation();
  for (const route of routes) {
    const params = matchPath(route.path, pathname);
    if (params) {
      // `key` forces a fresh page when moving between e.g. two product pages.
      return (
        <ParamsContext.Provider key={pathname} value={params}>
          {route.element}
        </ParamsContext.Provider>
      );
    }
  }
  return null;
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: string };

export function Link({ to, onClick, target, ...rest }: LinkProps) {
  const navigate = useNavigate();
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    // Let the browser handle new-tab clicks, external links and modified clicks.
    const isModified = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
    if (e.defaultPrevented || e.button !== 0 || isModified || target === '_blank' || /^https?:/.test(to)) return;
    e.preventDefault();
    navigate(to);
  };
  return <a href={hostedPath(to)} target={target} onClick={handleClick} {...rest} />;
}

/** A Link that knows whether it points at the current page. */
export function NavLink({
  to,
  className,
  isActive: isActiveProp,
  ...rest
}: Omit<LinkProps, 'className'> & {
  className?: string | ((active: boolean) => string);
  isActive?: (loc: Location) => boolean;
}) {
  const location = useLocation();
  const active = isActiveProp ? isActiveProp(location) : location.pathname + location.search === to;
  const cls = typeof className === 'function' ? className(active) : className;
  return <Link to={to} className={cls} aria-current={active ? 'page' : undefined} {...rest} />;
}
