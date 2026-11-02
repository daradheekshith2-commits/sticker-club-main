import { useEffect, type ReactNode } from 'react';
import { useAuth, type Account } from '../../context/AuthContext';
import { Link, useLocation, useNavigate } from '../../router/router';

export interface ProtectedRouteProps {
  children: ReactNode | ((user: Account) => ReactNode);
  role?: 'CUSTOMER' | 'ADMIN';
  redirectTo?: string;
  loadingFallback?: ReactNode;
}

/**
 * Sanitizes a redirect URL to prevent open-redirect vulnerabilities.
 * Only relative internal paths (starting with a single '/') are accepted.
 */
export function sanitizeRedirectUrl(url: string | null | undefined, fallback: string): string {
  if (!url) return fallback;
  try {
    const trimmed = decodeURIComponent(url).trim();
    if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('\\')) {
      return trimmed;
    }
  } catch {
    // Malformed URI sequence, fallback to safe destination
  }
  return fallback;
}

/**
 * Route protection component for authenticated and role-restricted views.
 *
 * - Prevents route flash by showing a loading shell while verifying auth state.
 * - Redirects unauthenticated visitors to `/login` (or `/admin/login`) with a return path.
 * - Enforces role-based access (e.g. `ADMIN` only) and displays an access denied view if unauthorized.
 */
export function ProtectedRoute({
  children,
  role = 'CUSTOMER',
  redirectTo,
  loadingFallback,
}: ProtectedRouteProps) {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const targetLogin = redirectTo || (role === 'ADMIN' ? '/admin/login' : '/login');

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      const returnUrl = encodeURIComponent(location.pathname + (location.search || ''));
      const separator = targetLogin.includes('?') ? '&' : '?';
      navigate(`${targetLogin}${separator}from=${returnUrl}`, { replace: true });
    }
  }, [ready, user, navigate, targetLogin, location.pathname, location.search]);

  if (!ready) {
    if (loadingFallback) return <>{loadingFallback}</>;
    return (
      <main className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-ink/20 bg-white p-6 text-center shadow-xl sm:p-9">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <h2 className="mt-4 font-display text-2xl font-bold">Checking session…</h2>
          <p className="mt-2 text-sm text-ink-soft">Verifying your account access.</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-ink/20 bg-white p-6 shadow-xl sm:p-9">
          <h1 className="font-display text-3xl font-extrabold">Sign in required</h1>
          <p className="mt-3 text-sm text-ink-soft">
            You need to be signed in to access this page.
          </p>
          <div className="mt-6">
            <Link className="btn-accent inline-block" to={targetLogin}>
              Go to sign in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (role === 'ADMIN' && user.role !== 'ADMIN') {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-danger/30 bg-danger/5 p-6 shadow-xl sm:p-9">
          <h1 className="font-display text-3xl font-extrabold text-danger">Access denied</h1>
          <p className="mt-3 text-sm text-ink-soft">
            Administrator permissions are required to access this area. You are currently logged in as a standard member ({user.email}).
          </p>
          <div className="mt-6 flex gap-3">
            <Link className="btn-primary inline-block text-sm" to="/account">
              My account
            </Link>
            <Link className="btn-ghost inline-block text-sm" to="/admin/login">
              Switch to Admin login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return <>{typeof children === 'function' ? children(user) : children}</>;
}

