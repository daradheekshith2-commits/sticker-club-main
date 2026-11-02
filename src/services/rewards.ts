/**
 * COLLECTOR PASSPORT REWARDS — Live order-linked rewards API.
 */
import { apiUrl } from '../context/AuthContext';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { handleSupabaseRequest } from '../lib/supabaseAdapter';

export interface PassportRecord {
  rule: {
    stampsGoal: number;
    stampRule: string;
    rewardDescription: string;
    rewardValueCap: string | null;
    seriesGoal: boolean;
  };
  stamps: Array<{
    id: string;
    orderId: string | null;
    orderRef: string | null;
    type: string;
    reason: string;
    seriesIds: string[];
    date: string;
  }>;
  totalStamps: number;
  availableStamps: number;
  stampsGoal: number;
  rewardsEligible: boolean;
  eligibleRewardsCount: number;
  collectedSeries: string[];
  redemptions: Array<{
    id: string;
    stampsUsed: number;
    rewardDescription: string;
    status: string;
    notes: string | null;
    createdAt: string;
    reviewedAt: string | null;
  }>;
}

export interface RewardsApi {
  readonly connected: boolean;
  getPassport(token?: string | null): Promise<PassportRecord | null>;
  redeemReward(token?: string | null): Promise<{ ok: boolean; message: string }>;
}

export const rewardsApi: RewardsApi = {
  connected: true,
  async getPassport(token?: string | null): Promise<PassportRecord | null> {
    if (isSupabaseConfigured) {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user ? { id: sessionData.session.user.id, name: '', email: sessionData.session.user.email || '', role: 'CUSTOMER' as const } : null;
      if (user) {
        const res = await handleSupabaseRequest<PassportRecord>('/api/me/passport', { method: 'GET' }, user);
        if (res.handled && res.data) return res.data;
      }
    }
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${apiUrl}/api/me/passport`, {
        headers,
        credentials: 'include',
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // ignore
    }
    return null;
  },
  async redeemReward(token?: string | null): Promise<{ ok: boolean; message: string }> {
    if (isSupabaseConfigured) {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user ? { id: sessionData.session.user.id, name: '', email: sessionData.session.user.email || '', role: 'CUSTOMER' as const } : null;
      if (!user) return { ok: false, message: 'Sign in required to redeem rewards' };
      const res = await handleSupabaseRequest<{ ok: boolean; message: string }>('/api/me/passport/redeem', { method: 'POST' }, user);
      if (res.handled) {
        if (res.error) return { ok: false, message: res.error };
        return { ok: true, message: res.data?.message || 'Reward redemption submitted successfully!' };
      }
    }
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${apiUrl}/api/me/passport/redeem`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        return { ok: true, message: data.message || 'Reward redemption submitted successfully!' };
      }
      return { ok: false, message: data.error || 'Failed to redeem reward' };
    } catch (e: any) {
      return { ok: false, message: e.message || 'Network error while redeeming reward' };
    }
  },
};
