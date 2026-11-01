import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';

type CustomerPassport = {
  id: string;
  name?: string;
  email?: string;
  phone?: string | null;
  totalStamps?: number;
  stampsUsed?: number;
  availableStamps?: number;
  canRedeem?: boolean;
  redemptionCount?: number;
  userId?: string;
  stampsCount?: number;
  totalEarned?: number;
  totalRedeemed?: number;
  lastAwardedAt?: string | null;
  user?: { id?: string; name: string; email: string; phone?: string | null };
};

type Redemption = {
  id: string;
  userId: string;
  rewardType?: string;
  rewardTitle?: string;
  rewardDescription?: string;
  stampsSpent?: number;
  stampsUsed?: number;
  status: 'PENDING' | 'APPROVED' | 'FULFILLED' | 'CANCELLED' | 'REJECTED';
  adminNotes?: string | null;
  notes?: string | null;
  createdAt: string;
  fulfilledAt?: string | null;
  user?: { name: string; email: string };
};

type PassportRule = {
  id: string;
  stampsGoal: number;
  stampRule: string;
  rewardDescription: string;
  rewardValueCap?: number | null;
  seriesGoal?: boolean;
  stampsPerOrder?: number;
  stampsPerHundredRupees?: number;
  stampsPerReward?: number;
  rewardTitle?: string;
  description?: string;
};

type Idea = {
  id: string;
  title: string;
  description: string;
  category?: string;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'SHORTLISTED';
  authorName?: string;
  authorEmail?: string;
  createdAt: string;
};

export function AdminPassportPanel() {
  const { user, request } = useAuth();
  const [tab, setTab] = useState<'customers' | 'redemptions' | 'rules' | 'ideas'>('customers');
  const [customers, setCustomers] = useState<CustomerPassport[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [rulesForm, setRulesForm] = useState<Partial<PassportRule>>({});
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  // Manual Stamp Adjustment state
  const [adjustTarget, setAdjustTarget] = useState<CustomerPassport | null>(null);
  const [stampsDelta, setStampsDelta] = useState<number>(1);
  const [adjustReason, setAdjustReason] = useState<string>('');

  // Search filter
  const [search, setSearch] = useState('');

  async function loadData() {
    if (user?.role !== 'ADMIN') return;
    setLoading(true);
    setError('');
    try {
      const [cData, rData, rulesData, ideasData] = await Promise.all([
        request<CustomerPassport[]>('/api/admin/passport/customers').catch(() => []),
        request<Redemption[]>('/api/admin/passport/redemptions').catch(() => []),
        request<PassportRule>('/api/admin/passport/rules').catch(() => null),
        request<Idea[]>('/api/admin/ideas').catch(() => []),
      ]);
      setCustomers(cData || []);
      setRedemptions(rData || []);
      if (rulesData) {
        setRulesForm(rulesData);
      }
      setIdeas(ideasData || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load passport administrative data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [user?.id]);

  async function handleAdjustStamps(e: FormEvent) {
    e.preventDefault();
    if (!adjustTarget) return;
    if (!adjustReason.trim()) {
      setError('An administrative audit reason is required for manual stamp adjustments.');
      return;
    }
    const targetUserId = adjustTarget.id || adjustTarget.userId;
    const targetName = adjustTarget.name || adjustTarget.user?.name || 'Customer';
    const count = Math.max(1, Math.min(20, Math.round(Number(stampsDelta))));
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await request('/api/admin/passport/stamps', {
        method: 'POST',
        body: JSON.stringify({
          userId: targetUserId,
          count,
          reason: adjustReason.trim(),
        }),
      });
      setMessage(
        `Added ${count} stamp${count > 1 ? 's' : ''} for ${targetName}.`
      );
      setAdjustTarget(null);
      setAdjustReason('');
      setStampsDelta(1);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjust stamps');
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateRedemption(id: string, status: 'FULFILLED' | 'REJECTED') {
    let notes = '';
    if (status === 'REJECTED') {
      const reason = window.prompt('Specify reason for rejecting redemption (customer will be notified):');
      if (!reason) return;
      notes = reason;
    } else {
      if (!window.confirm(`Mark reward redemption ${id} as fulfilled?`)) return;
    }

    setBusy(true);
    setError('');
    setMessage('');
    try {
      await request(`/api/admin/passport/redemptions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, notes }),
      });
      setMessage(`Redemption ${id} updated to ${status}.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update redemption');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveRules(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const updated = await request<PassportRule>('/api/admin/passport/rules', {
        method: 'PUT',
        body: JSON.stringify({
          stampsGoal: Number(rulesForm.stampsGoal || rulesForm.stampsPerReward || 8),
          stampRule: rulesForm.stampRule || 'One stamp for each eligible completed, paid order.',
          rewardDescription: rulesForm.rewardDescription || rulesForm.rewardTitle || 'A free mini sticker of your choice',
          rewardValueCap: rulesForm.rewardValueCap ? Number(rulesForm.rewardValueCap) : null,
          seriesGoal: rulesForm.seriesGoal ?? true,
        }),
      });
      setRulesForm(updated);
      setMessage('Passport rules updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rules');
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateIdea(id: string, status: 'APPROVED' | 'REJECTED' | 'SHORTLISTED') {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await request(`/api/admin/ideas/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setMessage(`Idea updated to ${status}.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update idea');
    } finally {
      setBusy(false);
    }
  }

  if (user?.role !== 'ADMIN') return null;

  const filteredCustomers = customers.filter((c) => {
    const name = (c.name || c.user?.name || '').toLowerCase();
    const email = (c.email || c.user?.email || '').toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  return (
    <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 pb-4">
        <div>
          <h2 className="text-2xl font-bold">Collector Passport & Community Rewards</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Audit stamps, manage customer rewards, configure earning rules, and moderate community drop proposals.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex rounded-xl bg-paper p-1">
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
              tab === 'customers' ? 'bg-white text-ink shadow' : 'text-ink-soft hover:text-ink'
            }`}
            onClick={() => setTab('customers')}
          >
            Customer Passports ({customers.length})
          </button>
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
              tab === 'redemptions' ? 'bg-white text-ink shadow' : 'text-ink-soft hover:text-ink'
            }`}
            onClick={() => setTab('redemptions')}
          >
            Redemptions Queue
            {redemptions.filter((r) => r.status === 'PENDING').length > 0 && (
              <span className="ml-2 rounded-full bg-sun px-2 py-0.5 text-xs text-paper font-black">
                {redemptions.filter((r) => r.status === 'PENDING').length}
              </span>
            )}
          </button>
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
              tab === 'rules' ? 'bg-white text-ink shadow' : 'text-ink-soft hover:text-ink'
            }`}
            onClick={() => setTab('rules')}
          >
            Rules & Rewards
          </button>
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
              tab === 'ideas' ? 'bg-white text-ink shadow' : 'text-ink-soft hover:text-ink'
            }`}
            onClick={() => setTab('ideas')}
          >
            Community Ideas ({ideas.length})
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-danger/10 p-3 text-sm text-danger font-medium">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-3 rounded-lg bg-mint/15 p-3 text-sm text-mint font-medium">
          {message}
        </p>
      )}

      {/* TAB: CUSTOMER PASSPORTS */}
      {tab === 'customers' && (
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              type="search"
              placeholder="Filter customer by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="field-input max-w-sm text-xs"
            />
            <span className="text-xs text-ink-soft">
              Stamps are earned on fulfilled paid orders and COD collection.
            </span>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-ink-soft animate-pulse">Loading customer passports…</p>
          ) : !filteredCustomers.length ? (
            <p className="mt-4 text-sm text-ink-soft">No customer passports found.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-ink/10 text-[10px] uppercase text-ink-soft">
                    <th className="pb-2">Customer</th>
                    <th className="pb-2 text-center">Active Stamps</th>
                    <th className="pb-2 text-center">Lifetime Earned</th>
                    <th className="pb-2 text-center">Redeemed</th>
                    <th className="pb-2">Last Awarded</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {filteredCustomers.map((cp) => {
                    const cName = cp.name || cp.user?.name || 'Customer';
                    const cEmail = cp.email || cp.user?.email || '';
                    const available = cp.availableStamps ?? cp.stampsCount ?? 0;
                    const lifetime = cp.totalStamps ?? cp.totalEarned ?? 0;
                    const redeemed = cp.stampsUsed ?? cp.totalRedeemed ?? 0;

                    return (
                      <tr key={cp.id} className="hover:bg-paper/50">
                        <td className="py-2.5">
                          <p className="font-bold text-ink">{cName}</p>
                          <p className="text-[11px] text-ink-soft">{cEmail}</p>
                        </td>
                        <td className="py-2.5 text-center">
                          <span className="inline-block rounded-full bg-mint/20 px-2.5 py-0.5 font-bold text-mint">
                            ★ {available}
                          </span>
                        </td>
                        <td className="py-2.5 text-center font-semibold text-ink-soft">{lifetime}</td>
                        <td className="py-2.5 text-center font-semibold text-ink-soft">{redeemed}</td>
                        <td className="py-2.5 text-ink-soft">
                          {cp.lastAwardedAt
                            ? new Date(cp.lastAwardedAt).toLocaleDateString('en-IN', {
                                dateStyle: 'medium',
                              })
                            : '—'}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            className="btn-ghost text-xs border border-ink/20 px-2.5 py-1"
                            onClick={() => {
                              setAdjustTarget(cp);
                              setStampsDelta(1);
                              setAdjustReason('');
                            }}
                          >
                            ± Adjust Stamps
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: REDEMPTIONS QUEUE */}
      {tab === 'redemptions' && (
        <div className="mt-5">
          <h3 className="text-lg font-bold">Reward Redemptions Queue</h3>
          <p className="mt-0.5 text-xs text-ink-soft">
            Customer reward redemptions claimed using their Sticker Collector Passport stamps.
          </p>

          {loading ? (
            <p className="mt-4 text-sm text-ink-soft animate-pulse">Loading redemptions queue…</p>
          ) : !redemptions.length ? (
            <p className="mt-6 text-center py-8 text-sm text-ink-soft">No reward redemptions recorded yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {redemptions.map((r) => {
                const isPending = r.status === 'PENDING';
                const isFulfilled = r.status === 'FULFILLED';

                return (
                  <li
                    key={r.id}
                    className={`rounded-xl border p-4 transition ${
                      isPending ? 'border-sun/40 bg-sun/5' : 'border-ink/10 bg-paper/50'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-sm text-ink">{r.rewardDescription || r.rewardTitle || 'Passport Reward'}</strong>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                              isFulfilled
                                ? 'bg-mint/20 text-mint'
                                : isPending
                                ? 'bg-sun/20 text-sun'
                                : 'bg-danger/20 text-danger'
                            }`}
                          >
                            {r.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-ink-soft">
                          Customer: <strong className="text-ink">{r.user?.name || 'Customer'}</strong> ({r.user?.email || '—'}) ·
                          Redeemed on {new Date(r.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                        <p className="mt-1 text-xs text-ink">
                          Passport stamps spent: <strong className="text-lime">{r.stampsUsed ?? r.stampsSpent ?? 8} stamps</strong>
                        </p>
                        {(r.notes || r.adminNotes) && (
                          <p className="mt-1 text-xs text-danger font-medium">Note: {r.notes || r.adminNotes}</p>
                        )}
                      </div>

                      {isPending && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="btn-primary text-xs"
                            disabled={busy}
                            onClick={() => void handleUpdateRedemption(r.id, 'FULFILLED')}
                          >
                            ✓ Mark Fulfilled & Shipped
                          </button>
                          <button
                            type="button"
                            className="btn-ghost text-xs text-danger hover:border-danger"
                            disabled={busy}
                            onClick={() => void handleUpdateRedemption(r.id, 'REJECTED')}
                          >
                            ✗ Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* TAB: RULES & REWARDS */}
      {tab === 'rules' && (
        <form onSubmit={handleSaveRules} className="mt-5 max-w-xl space-y-4">
          <div>
            <h3 className="text-lg font-bold">Collector Passport Reward Rules</h3>
            <p className="mt-0.5 text-xs text-ink-soft">
              Configure stamp earning rates and reward claim criteria across the store.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold text-ink">
              Stamps Required To Claim Reward:
              <input
                type="number"
                min={1}
                max={50}
                required
                className="field-input mt-1 w-full text-xs"
                value={rulesForm.stampsGoal ?? rulesForm.stampsPerReward ?? 8}
                onChange={(e) => setRulesForm({ ...rulesForm, stampsGoal: Number(e.target.value) })}
              />
            </label>

            <label className="block text-xs font-bold text-ink">
              Stamp Earning Rule Summary:
              <input
                type="text"
                required
                className="field-input mt-1 w-full text-xs"
                value={rulesForm.stampRule ?? 'One stamp for each eligible completed, paid order.'}
                onChange={(e) => setRulesForm({ ...rulesForm, stampRule: e.target.value })}
              />
            </label>
          </div>

          <label className="block text-xs font-bold text-ink">
            Reward Description & Delivery Details:
            <textarea
              rows={3}
              required
              className="field-input mt-1 w-full text-xs"
              value={rulesForm.rewardDescription ?? rulesForm.description ?? 'A free mini sticker of your choice'}
              onChange={(e) => setRulesForm({ ...rulesForm, rewardDescription: e.target.value })}
            />
          </label>

          <button type="submit" className="btn-primary text-xs" disabled={busy}>
            {busy ? 'Saving Rules…' : 'Save Passport Rules'}
          </button>
        </form>
      )}

      {/* TAB: COMMUNITY IDEAS */}
      {tab === 'ideas' && (
        <div className="mt-5">
          <h3 className="text-lg font-bold">Community Drop Ideas & Suggestions</h3>
          <p className="mt-0.5 text-xs text-ink-soft">
            Customer-submitted sticker proposals and collection suggestions.
          </p>

          {loading ? (
            <p className="mt-4 text-sm text-ink-soft animate-pulse">Loading ideas…</p>
          ) : !ideas.length ? (
            <p className="mt-6 text-center py-8 text-sm text-ink-soft">No community ideas submitted yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {ideas.map((idea) => (
                <li key={idea.id} className="rounded-xl border border-ink/10 bg-paper/50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm text-ink">{idea.title}</strong>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            idea.status === 'APPROVED'
                              ? 'bg-mint/20 text-mint'
                              : idea.status === 'SHORTLISTED'
                              ? 'bg-sun/20 text-sun'
                              : idea.status === 'REJECTED'
                              ? 'bg-danger/20 text-danger'
                              : 'bg-paper text-ink-soft'
                          }`}
                        >
                          {idea.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-ink leading-relaxed">{idea.description}</p>
                      <p className="mt-2 text-[11px] text-ink-soft">
                        Submitted by: {idea.authorName || 'Anonymous'} ({idea.authorEmail || 'Member'}) ·{' '}
                        {new Date(idea.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {idea.status !== 'APPROVED' && (
                        <button
                          type="button"
                          className="btn-ghost text-xs text-mint border border-mint/40 hover:bg-mint/10"
                          disabled={busy}
                          onClick={() => void handleUpdateIdea(idea.id, 'APPROVED')}
                        >
                          ✓ Approve
                        </button>
                      )}
                      {idea.status !== 'SHORTLISTED' && (
                        <button
                          type="button"
                          className="btn-ghost text-xs text-sun border border-sun/40 hover:bg-sun/10"
                          disabled={busy}
                          onClick={() => void handleUpdateIdea(idea.id, 'SHORTLISTED')}
                        >
                          ★ Shortlist
                        </button>
                      )}
                      {idea.status !== 'REJECTED' && (
                        <button
                          type="button"
                          className="btn-ghost text-xs text-danger hover:border-danger"
                          disabled={busy}
                          onClick={() => void handleUpdateIdea(idea.id, 'REJECTED')}
                        >
                          ✗ Reject
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ADJUST STAMPS MODAL */}
      {adjustTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-md w-full rounded-2xl border border-ink/20 bg-paper p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-ink">Adjust Customer Passport Stamps</h3>
            <p className="mt-1 text-xs text-ink-soft">
              Customer: <strong className="text-ink">{adjustTarget.name || adjustTarget.user?.name || 'Customer'}</strong> ({adjustTarget.email || adjustTarget.user?.email || '—'})
              <br />
              Current Available Stamps: <strong className="text-lime">{adjustTarget.availableStamps ?? adjustTarget.stampsCount ?? 0} stamps</strong>
            </p>

            <form onSubmit={handleAdjustStamps} className="mt-4 space-y-3">
              <label className="block text-xs font-bold text-ink">
                Stamps to Grant (1 - 20):
                <input
                  type="number"
                  required
                  min={1}
                  max={20}
                  className="field-input mt-1 w-full text-xs"
                  value={stampsDelta}
                  onChange={(e) => setStampsDelta(Number(e.target.value))}
                />
              </label>

              <label className="block text-xs font-bold text-ink">
                Mandatory Audit Reason:
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Loyalty event bonus, manual order accommodation, customer service review"
                  className="field-input mt-1 w-full text-xs"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn-ghost text-xs"
                  onClick={() => setAdjustTarget(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs"
                  disabled={busy || !adjustReason.trim()}
                >
                  {busy ? 'Applying…' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
