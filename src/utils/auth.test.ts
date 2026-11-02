import test from 'node:test';
import assert from 'node:assert/strict';
import { mapSupabaseUser } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sanitizeRedirectUrl } from '../components/auth/ProtectedRoute';
import type { User as SupabaseUser } from '@supabase/supabase-js';

test('Supabase client module is exported and functional', () => {
  assert.ok(supabase);
  assert.equal(typeof supabase.auth.signInWithPassword, 'function');
  assert.equal(typeof supabase.auth.signUp, 'function');
  assert.equal(typeof supabase.auth.signOut, 'function');
  assert.equal(typeof supabase.auth.getSession, 'function');
  assert.equal(typeof isSupabaseConfigured, 'boolean');
});

test('mapSupabaseUser: extracts name, email, and defaults to CUSTOMER role', () => {
  const mockUser: SupabaseUser = {
    id: 'user-123-abc',
    app_metadata: {},
    user_metadata: { name: 'Priya Sharma' },
    aud: 'authenticated',
    created_at: '2026-11-01T00:00:00Z',
    email: 'priya@example.com',
  };

  const account = mapSupabaseUser(mockUser);
  assert.equal(account.id, 'user-123-abc');
  assert.equal(account.email, 'priya@example.com');
  assert.equal(account.name, 'Priya Sharma');
  assert.equal(account.role, 'CUSTOMER');
  assert.equal(account.phone, null);
});

test('mapSupabaseUser: prioritizes app_metadata.role for security (prevents user_metadata tampering)', () => {
  const maliciousUser: SupabaseUser = {
    id: 'user-exploit-attempt',
    app_metadata: { role: 'CUSTOMER' },
    user_metadata: { role: 'ADMIN', name: 'Sneaky User' },
    aud: 'authenticated',
    created_at: '2026-11-01T00:00:00Z',
    email: 'sneaky@example.com',
  };

  const account = mapSupabaseUser(maliciousUser);
  // Authoritative app_metadata must prevail over client-editable user_metadata
  assert.equal(account.role, 'CUSTOMER');

  // Also test when app_metadata has no role specified
  const unprivilegedUser: SupabaseUser = {
    id: 'user-exploit-no-app-meta',
    app_metadata: {},
    user_metadata: { role: 'ADMIN', name: 'Sneaky Public Signup' },
    aud: 'authenticated',
    created_at: '2026-11-01T00:00:00Z',
    email: 'signup@example.com',
  };
  const accountNoAppMeta = mapSupabaseUser(unprivilegedUser);
  assert.equal(accountNoAppMeta.role, 'CUSTOMER');
});

test('mapSupabaseUser: recognizes ADMIN role in app_metadata', () => {
  const adminUser: SupabaseUser = {
    id: 'admin-uuid-001',
    app_metadata: { role: 'ADMIN' },
    user_metadata: { name: 'Store Owner' },
    aud: 'authenticated',
    created_at: '2026-11-01T00:00:00Z',
    email: 'owner@stickerclub.in',
  };

  const account = mapSupabaseUser(adminUser);
  assert.equal(account.role, 'ADMIN');
  assert.equal(account.name, 'Store Owner');
});

test('mapSupabaseUser: falls back to full_name or email prefix when name is omitted', () => {
  const userWithoutName: SupabaseUser = {
    id: 'user-no-name',
    app_metadata: {},
    user_metadata: { full_name: 'Arjun Mehta' },
    aud: 'authenticated',
    created_at: '2026-11-01T00:00:00Z',
    email: 'arjun@example.com',
  };

  assert.equal(mapSupabaseUser(userWithoutName).name, 'Arjun Mehta');

  const userWithOnlyEmail: SupabaseUser = {
    id: 'user-email-only',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-11-01T00:00:00Z',
    email: 'hello.world@test.com',
  };

  assert.equal(mapSupabaseUser(userWithOnlyEmail).name, 'hello.world');
});

test('sanitizeRedirectUrl: accepts valid relative paths', () => {
  assert.equal(sanitizeRedirectUrl('/account', '/fallback'), '/account');
  assert.equal(sanitizeRedirectUrl('/admin/orders?page=2', '/fallback'), '/admin/orders?page=2');
  assert.equal(sanitizeRedirectUrl('/checkout?step=review#summary', '/fallback'), '/checkout?step=review#summary');
});

test('sanitizeRedirectUrl: prevents open redirect vulnerabilities', () => {
  // Protocol-relative URLs
  assert.equal(sanitizeRedirectUrl('//malicious-site.com', '/fallback'), '/fallback');
  assert.equal(sanitizeRedirectUrl('///malicious-site.com', '/fallback'), '/fallback');
  // Absolute external URLs
  assert.equal(sanitizeRedirectUrl('https://phishing.com/login', '/fallback'), '/fallback');
  assert.equal(sanitizeRedirectUrl('javascript:alert(1)', '/fallback'), '/fallback');
  // Backslash tricks (e.g. /\evil.com)
  assert.equal(sanitizeRedirectUrl('/\\evil.com', '/fallback'), '/fallback');
  assert.equal(sanitizeRedirectUrl('\\evil.com', '/fallback'), '/fallback');
  // Empty, null, or undefined
  assert.equal(sanitizeRedirectUrl('', '/fallback'), '/fallback');
  assert.equal(sanitizeRedirectUrl(null, '/fallback'), '/fallback');
  assert.equal(sanitizeRedirectUrl(undefined, '/fallback'), '/fallback');
});


