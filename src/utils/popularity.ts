/**
 * POPULARITY RANKING UTILITIES
 *
 * Starting formula based on activity from all shoppers over the last 30 days:
 * popularity score = product views + (3 × cart selections) + (10 × confirmed purchases)
 *
 * Rules:
 * - Count a view when a shopper opens a product's details. Showing in a list does not count.
 * - Count at most one view and one cart selection per product per shopping session.
 * - Count a purchase once per product per confirmed order.
 * - Save events in persistent storage (localStorage / backend database).
 * - Rank products separately inside each existing product block.
 * - For tied scores, preserve the store's existing display order. Products with no activity start at zero.
 */

import { apiUrl } from '../context/AuthContext';

export type ActivityType = 'VIEW' | 'CART' | 'PURCHASE';

export interface ActivityEvent {
  productId: string;
  type: ActivityType;
  timestamp: number;
  sessionId?: string;
  orderId?: string;
}

const STORAGE_KEY_EVENTS = 'pixwora_popularity_events';
const STORAGE_KEY_PURCHASED_ORDERS = 'pixwora_recorded_order_ids';
const SESSION_KEY_ID = 'pixwora_session_id';
const SESSION_KEY_VIEWS = 'pixwora_session_views';
const SESSION_KEY_CARTS = 'pixwora_session_carts';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const listeners = new Set<() => void>();

export function subscribeToPopularityChanges(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function notifyListeners() {
  for (const cb of listeners) {
    try {
      cb();
    } catch (e) {
      console.warn('Popularity change listener error:', e);
    }
  }
}

/** Get or initialize the current shopping session id (persists for browser session) */
export function getShoppingSessionId(): string {
  if (typeof window === 'undefined') return 'server-session';
  try {
    let sId = window.sessionStorage.getItem(SESSION_KEY_ID);
    if (!sId) {
      sId = 'sess_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      window.sessionStorage.setItem(SESSION_KEY_ID, sId);
    }
    return sId;
  } catch {
    return 'fallback-session';
  }
}

/** Get events stored in localStorage from the last 30 days */
export function getStoredEvents(): ActivityEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_EVENTS);
    if (!raw) return [];
    const parsed: ActivityEvent[] = JSON.parse(raw);
    const cutoff = Date.now() - THIRTY_DAYS_MS;
    // Filter and prune expired events
    const active = parsed.filter((e) => e && e.timestamp >= cutoff);
    if (active.length !== parsed.length) {
      window.localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(active));
    }
    return active;
  } catch {
    return [];
  }
}

function saveEvent(event: ActivityEvent): void {
  if (typeof window === 'undefined') return;
  try {
    const events = getStoredEvents();
    events.push(event);
    window.localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
    notifyListeners();

    // Background sync to backend API if available
    if (apiUrl) {
      fetch(`${apiUrl}/api/analytics/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }).catch(() => {});
    }
  } catch {}
}

/**
 * Record a product detail view.
 * Count at most one view per product per shopping session, even if refreshed.
 */
export function recordProductView(productId: string): void {
  if (!productId || typeof window === 'undefined') return;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY_VIEWS);
    const viewed = new Set<string>(raw ? JSON.parse(raw) : []);
    if (viewed.has(productId)) {
      return; // already counted this session
    }
    viewed.add(productId);
    window.sessionStorage.setItem(SESSION_KEY_VIEWS, JSON.stringify(Array.from(viewed)));

    saveEvent({
      productId,
      type: 'VIEW',
      timestamp: Date.now(),
      sessionId: getShoppingSessionId(),
    });
  } catch {}
}

/**
 * Record a product cart selection.
 * Count at most one cart selection per product per shopping session,
 * even if refreshed or removed and re-added.
 */
export function recordCartSelection(productId: string): void {
  if (!productId || typeof window === 'undefined') return;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY_CARTS);
    const added = new Set<string>(raw ? JSON.parse(raw) : []);
    if (added.has(productId)) {
      return; // already counted this session
    }
    added.add(productId);
    window.sessionStorage.setItem(SESSION_KEY_CARTS, JSON.stringify(Array.from(added)));

    saveEvent({
      productId,
      type: 'CART',
      timestamp: Date.now(),
      sessionId: getShoppingSessionId(),
    });
  } catch {}
}

/**
 * Record confirmed purchase from order confirmation.
 * Count once per product per confirmed order. Reloading confirmation page never counts twice.
 */
export function recordConfirmedPurchase(orderId: string, productIds: string[]): void {
  if (!orderId || !productIds.length || typeof window === 'undefined') return;
  try {
    const rawOrders = window.localStorage.getItem(STORAGE_KEY_PURCHASED_ORDERS);
    const recordedOrders = new Set<string>(rawOrders ? JSON.parse(rawOrders) : []);
    if (recordedOrders.has(orderId)) {
      return; // already counted for this order
    }
    recordedOrders.add(orderId);
    window.localStorage.setItem(STORAGE_KEY_PURCHASED_ORDERS, JSON.stringify(Array.from(recordedOrders)));

    const distinctProductIds = Array.from(new Set(productIds));
    const now = Date.now();
    for (const pId of distinctProductIds) {
      saveEvent({
        productId: pId,
        type: 'PURCHASE',
        timestamp: now,
        orderId,
      });
    }
  } catch {}
}

/**
 * Calculate popularity scores for all products over the last 30 days:
 * score = views + (3 × cart selections) + (10 × confirmed purchases)
 */
export function getPopularityScores(): Record<string, number> {
  const events = getStoredEvents();
  const scores: Record<string, number> = {};

  for (const e of events) {
    if (!scores[e.productId]) {
      scores[e.productId] = 0;
    }
    if (e.type === 'VIEW') {
      scores[e.productId] += 1;
    } else if (e.type === 'CART') {
      scores[e.productId] += 3;
    } else if (e.type === 'PURCHASE') {
      scores[e.productId] += 10;
    }
  }

  return scores;
}

/**
 * Get popularity score for an individual product
 */
export function getPopularityScore(productId: string): number {
  const scores = getPopularityScores();
  return scores[productId] ?? 0;
}

/**
 * Rank products separately inside each existing product block.
 * A product can move up or down within its block, but it must stay in its assigned block.
 * Highest scoring product first.
 * For tied scores, preserve the store's existing display order.
 * Products with no activity start at zero.
 */
export function rankBlock<T extends { id: string }>(
  products: T[],
  scoresOverride?: Record<string, number>
): T[] {
  const scores = scoresOverride ?? getPopularityScores();

  return products
    .map((item, originalIndex) => ({
      item,
      originalIndex,
      score: scores[item.id] ?? 0,
    }))
    .sort((a, b) => {
      // 1. Highest popularity score first
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // 2. Tie-break: preserve existing store order
      return a.originalIndex - b.originalIndex;
    })
    .map((wrapped) => wrapped.item);
}
