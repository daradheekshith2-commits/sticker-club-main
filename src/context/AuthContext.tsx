import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { handleSupabaseRequest, handleSupabaseMultipart } from '../lib/supabaseAdapter';

export type Account = {
  id: string;
  name: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
  phone?: string | null;
  avatarUrl?: string | null;
};

const getEnvVar = (key: string): string | undefined => {
  if (typeof import.meta !== 'undefined' && import.meta.env && key in import.meta.env) {
    return (import.meta.env as Record<string, string>)[key];
  }
  if (typeof process !== 'undefined' && process.env && key in process.env) {
    return process.env[key];
  }
  return undefined;
};

const isDev =
  (typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV)) ||
  (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production');

// Never silently point a deployed storefront at the visitor's own localhost.
const API =
  getEnvVar('VITE_API_URL')?.replace(/[/]$/, '') ||
  (isDev ? 'http://localhost:5000' : '');

export type AuthValue = {
  user: Account | null;
  ready: boolean;
  token: string | null;
  isSupabase: boolean;
  login: (email: string, password: string) => Promise<Account>;
  register: (name: string, email: string, password: string) => Promise<Account>;
  signInWithGoogle: (redirectTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ message: string }>;
  updatePassword: (password: string) => Promise<void>;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  requestMultipart: <T>(path: string, formData: FormData) => Promise<T>;
  refresh: () => Promise<void>;
};

const Context = createContext<AuthValue | null>(null);

type SessionPayload = { user: Account; accessToken: string };
let refreshInFlight: Promise<SessionPayload> | null = null;

async function refreshLegacySession(): Promise<SessionPayload> {
  if (!API) throw Error('Authentication backend is not configured.');
  if (!refreshInFlight) {
    refreshInFlight = fetch(API + '/api/auth/refresh', { method: 'POST', credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) throw Error('Not signed in');
        return (await r.json()) as SessionPayload;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export function mapSupabaseUser(u: SupabaseUser): Account {
  const meta = u.user_metadata || {};
  const appMeta = u.app_metadata || {};
  // Authoritative roles live strictly in app_metadata to avoid user tampering.
  // user_metadata is user-editable so it is NEVER trusted for administrative privilege.
  let role: 'CUSTOMER' | 'ADMIN' = 'CUSTOMER';
  if (appMeta.role === 'ADMIN' || appMeta.role === 'CUSTOMER') {
    role = appMeta.role;
  }

  const name: string =
    meta.full_name ||
    meta.name ||
    (meta.given_name ? `${meta.given_name} ${meta.family_name || ''}`.trim() : '') ||
    u.email?.split('@')[0] ||
    'Collector';
  const phone: string | null = (u.phone as string | undefined) || meta.phone || null;
  const avatarUrl: string | null = meta.avatar_url || meta.picture || null;

  return {
    id: u.id,
    name,
    email: u.email || '',
    role,
    phone,
    avatarUrl,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Account | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        setUser(null);
        setToken(null);
        return;
      }
      setUser(mapSupabaseUser(data.session.user));
      setToken(data.session.access_token);
    } else {
      try {
        const data = await refreshLegacySession();
        setToken(data.accessToken);
        setUser(data.user);
      } catch (error) {
        setToken(null);
        setUser(null);
        throw error;
      }
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (isSupabaseConfigured) {
      // 1. Recover active Supabase session
      supabase.auth
        .getSession()
        .then(({ data: { session } }) => {
          if (!isMounted) return;
          if (session?.user) {
            setUser(mapSupabaseUser(session.user));
            setToken(session.access_token);
          } else {
            setUser(null);
            setToken(null);
          }
        })
        .catch(() => {
          if (isMounted) {
            setUser(null);
            setToken(null);
          }
        })
        .finally(() => {
          if (isMounted) setReady(true);
        });

      // 2. React to Supabase auth events (sign in, sign out, automatic token refresh)
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!isMounted) return;
        if (session?.user) {
          setUser(mapSupabaseUser(session.user));
          setToken(session.access_token);
        } else {
          setUser(null);
          setToken(null);
        }
        setReady(true);
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    } else {
      // Legacy session check
      void refresh()
        .catch(() => {})
        .finally(() => {
          if (isMounted) setReady(true);
        });
    }
  }, [refresh]);

  const login = async (email: string, password: string): Promise<Account> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error('Sign in failed: no user returned');
      const account = mapSupabaseUser(data.user);
      setUser(account);
      setToken(data.session?.access_token || null);
      return account;
    }

    if (!API) throw Error('Authentication backend is not configured.');
    const r = await fetch(API + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    const data = await r.json();
    if (!r.ok) throw Error(data.error || 'Authentication failed');
    setToken(data.accessToken);
    setUser(data.user);
    return data.user as Account;
  };

  const register = async (name: string, email: string, password: string): Promise<Account> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            name: name.trim(),
            role: 'CUSTOMER',
          },
        },
      });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error('Registration failed');
      const account = mapSupabaseUser(data.user);
      if (data.session) {
        setUser(account);
        setToken(data.session.access_token);
      }
      return account;
    }

    if (!API) throw Error('Authentication backend is not configured.');
    const r = await fetch(API + '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, email, password }),
    });
    const data = await r.json();
    if (!r.ok) throw Error(data.error || 'Authentication failed');
    setToken(data.accessToken);
    setUser(data.user);
    return data.user as Account;
  };

  const signInWithGoogle = async (redirectTo?: string) => {
    if (isSupabaseConfigured) {
      const target = redirectTo || `${window.location.origin}/account`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: target,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw new Error(error.message);
      if (data?.url) {
        window.location.assign(data.url);
      }
      return;
    }
    throw new Error('Google Sign-in is only supported when Supabase Auth is configured.');
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut().catch(() => {});
    }
    if (API) {
      await fetch(API + '/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    }
    setUser(null);
    setToken(null);
  };

  const requestPasswordReset = async (email: string): Promise<{ message: string }> => {
    if (isSupabaseConfigured) {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo,
      });
      if (error) throw new Error(error.message);
      return { message: 'Password reset link sent to your email.' };
    }

    if (!API) throw Error('Authentication backend is not configured.');
    const r = await fetch(API + '/api/auth/forgot-password', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error || 'Request failed');
    return { message: d.message || 'Password reset requested.' };
  };

  const updatePassword = async (password: string): Promise<void> => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      return;
    }
    throw Error('Supabase Auth is required to update passwords directly.');
  };

  const request = async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
    let current = token;
    if (!current && isSupabaseConfigured) {
      const { data } = await supabase.auth.getSession();
      current = data.session?.access_token || null;
      if (current && data.session?.user) {
        setToken(current);
        setUser(mapSupabaseUser(data.session.user));
      }
    }
    if (isSupabaseConfigured) {
      const adapterRes = await handleSupabaseRequest<T>(path, options, user);
      if (adapterRes.handled) {
        if (adapterRes.error) throw Error(adapterRes.error);
        return adapterRes.data as T;
      }
    }
    if (!API) throw Error('Authentication backend is not configured.');

    if (!current && !isSupabaseConfigured) {
      try {
        const restored = await refreshLegacySession();
        current = restored.accessToken;
        setToken(current);
        setUser(restored.user);
      } catch {
        setToken(null);
        setUser(null);
        throw Error('Please sign in again');
      }
    }
    if (!current) throw Error('Please sign in again');

    const send = (t: string) =>
      fetch(API + path, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
          Authorization: 'Bearer ' + t,
        },
      });

    let r = await send(current);
    if (r.status === 401) {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.refreshSession();
        if (!error && data.session) {
          current = data.session.access_token;
          setToken(current);
          setUser(mapSupabaseUser(data.session.user));
          r = await send(current);
        } else {
          setUser(null);
          setToken(null);
          throw Error('Please sign in again');
        }
      } else {
        try {
          const data = await refreshLegacySession();
          setToken(data.accessToken);
          setUser(data.user);
          current = data.accessToken;
          r = await send(current);
        } catch {
          setUser(null);
          setToken(null);
          throw Error('Please sign in again');
        }
      }
    }
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      throw Error(d.error || 'Request failed');
    }
    return r.json() as Promise<T>;
  };

  const requestMultipart = async <T,>(path: string, formData: FormData): Promise<T> => {
    let current = token;
    if (!current && isSupabaseConfigured) {
      const { data } = await supabase.auth.getSession();
      current = data.session?.access_token || null;
      if (current && data.session?.user) {
        setToken(current);
        setUser(mapSupabaseUser(data.session.user));
      }
    }
    if (isSupabaseConfigured) {
      const adapterRes = await handleSupabaseMultipart<T>(path, formData, user);
      if (adapterRes.handled) {
        if (adapterRes.error) throw Error(adapterRes.error);
        return adapterRes.data as T;
      }
    }
    if (!API) throw Error('Authentication backend is not configured.');

    if (!current && !isSupabaseConfigured) {
      try {
        const restored = await refreshLegacySession();
        current = restored.accessToken;
        setToken(current);
        setUser(restored.user);
      } catch {
        setToken(null);
        setUser(null);
        throw Error('Please sign in again');
      }
    }
    if (!current) throw Error('Please sign in again');

    const send = (t: string) =>
      fetch(API + path, {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: 'Bearer ' + t },
        body: formData,
      });

    let r = await send(current);
    if (r.status === 401) {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.refreshSession();
        if (!error && data.session) {
          current = data.session.access_token;
          setToken(current);
          setUser(mapSupabaseUser(data.session.user));
          r = await send(current);
        } else {
          setUser(null);
          setToken(null);
          throw Error('Please sign in again');
        }
      } else {
        try {
          const data = await refreshLegacySession();
          setToken(data.accessToken);
          setUser(data.user);
          current = data.accessToken;
          r = await send(current);
        } catch {
          setUser(null);
          setToken(null);
          throw Error('Please sign in again');
        }
      }
    }
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      throw Error(d.error || 'Upload failed');
    }
    return r.json() as Promise<T>;
  };

  const value = useMemo(
    () => ({
      user,
      ready,
      token,
      isSupabase: isSupabaseConfigured,
      login,
      register,
      signInWithGoogle,
      logout,
      requestPasswordReset,
      updatePassword,
      request,
      requestMultipart,
      refresh,
    }),
    [user, ready, token, refresh]
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAuth() {
  const value = useContext(Context);
  if (!value) throw Error('AuthProvider missing');
  return value;
}

export const apiUrl = API;
