/**
 * COLLECTOR PASSPORT REWARDS — Live order-linked rewards API.
 */
import { apiUrl } from '../context/AuthContext';

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
