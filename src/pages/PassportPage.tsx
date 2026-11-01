/**
 * STICKER COLLECTOR PASSPORT — /collector-passport
 *
 * Real order-linked Sticker Collector Passport and reward redemptions.
 */
import { useEffect, useState } from 'react';
import { LuGift, LuLock, LuStamp } from 'react-icons/lu';
import { brand } from '../config/brand';
import { passportConfig } from '../config/passport';
import { series } from '../data/rarity';
import { usePageMeta } from '../hooks/usePageMeta';
import { useAuth } from '../context/AuthContext';
import { Link } from '../router/router';
import { passportProgress } from '../utils/community';
import { rewardsApi, type PassportRecord } from '../services/rewards';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';

/** The printed passport card, drawn in HTML. `stamps` fills the stamp spaces. */
function PassportCard({
  stamps = [],
  seriesDone = [],
  goal = passportConfig.stampsGoal,
  rewardDescription = passportConfig.rewardDescription,
  seriesGoal = passportConfig.seriesGoal,
}: {
  stamps?: string[];
  seriesDone?: string[];
  goal?: number;
  rewardDescription?: string;
  seriesGoal?: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border-2 border-ink bg-paper p-4 shadow-[0_10px_20px_rgba(42,32,22,0.18)] sm:p-5">
      <div className="flex items-start justify-between gap-3 border-b-2 border-ink pb-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase">{brand.name}</p>
          <p className="font-display text-2xl leading-none font-extrabold">Collector Passport</p>
        </div>
        <p className="text-right text-[10px] leading-tight font-bold uppercase">
          Passport
          <span className="mt-1 block h-4 w-24 border-b border-ink/50 text-right font-mono text-[9px] text-ink-soft">
            #STAMP-CARD
          </span>
        </p>
      </div>
      <p className="mt-3 text-xs font-bold tracking-wide uppercase">Stamps · {goal} for a reward</p>
      <ol className="mt-2 grid grid-cols-4 gap-2" aria-label="Stamp spaces">
        {Array.from({ length: goal }, (_, i) => {
          const date = stamps[i];
          return (
            <li key={i} className="text-center">
              <span
                className={`mx-auto grid aspect-square w-full max-w-16 place-items-center rounded-full border-2 transition-transform ${
                  date ? 'rotate-[-8deg] border-ink bg-lime text-ink' : 'border-dashed border-ink/40'
                }`}
              >
                {date ? <LuStamp aria-label="Stamped" className="size-6 text-ink" /> : <span className="text-xs font-bold text-ink-soft">{i + 1}</span>}
              </span>
              <span className="mt-1 block text-[10px] text-ink-soft truncate px-1" title={date}>
                {date ? date.slice(0, 10) : 'date ____'}
              </span>
            </li>
          );
        })}
      </ol>
      {seriesGoal && (
        <>
          <p className="mt-4 text-xs font-bold tracking-wide uppercase">Series collected</p>
          <ul className="mt-2 grid grid-cols-2 gap-1.5 text-sm">
            {series.map((s) => {
              const done = seriesDone.includes(s.id);
              return (
                <li key={s.id} className="flex items-center gap-2">
                  <span aria-hidden className={`grid size-4 place-items-center rounded border-2 border-ink text-[10px] font-bold ${done ? 'bg-ink text-lime' : 'bg-white'}`}>
                    {done ? '✓' : ''}
                  </span>
                  <span className="truncate">
                    <strong>{s.id}</strong> {s.name}
                    <span className="sr-only">{done ? ' (collected)' : ' (not yet)'}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <p className="mt-4 rounded-lg bg-white p-2 text-xs">
        <strong>Full card:</strong> {rewardDescription}.
      </p>
    </div>
  );
}

export function PassportPage() {
  usePageMeta('Sticker Collector Passport', 'A collector card that fills up with stamps as you order.');
  const { user, token } = useAuth();
  const [passport, setPassport] = useState<PassportRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const loadPassport = async () => {
    if (!user) {
      setPassport(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await rewardsApi.getPassport(token);
    setPassport(data);
    setLoading(false);
  };

  useEffect(() => {
    void loadPassport();
  }, [user?.id, token]);

  const handleClaimReward = async () => {
    if (!passport || !passport.rewardsEligible) return;
    setClaiming(true);
    setClaimMessage(null);
    setClaimError(null);

    const res = await rewardsApi.redeemReward(token);
    setClaiming(false);
    if (res.ok) {
      setClaimMessage(res.message);
      await loadPassport();
    } else {
      setClaimError(res.message);
    }
  };

  const goal = passport?.rule?.stampsGoal ?? passportConfig.stampsGoal;
  const stampsCount = passport?.availableStamps ?? 0;
  const progress = passportProgress(stampsCount, goal);
  const seriesDone = passport?.collectedSeries ?? [];
  const stampDates = passport?.stamps.map((s) => s.date) ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Collectibles', to: '/collectibles' }, { label: 'Collector Passport' }]} />

      <h1 className="mt-4 text-4xl leading-none font-extrabold md:text-6xl">Sticker Collector Passport</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        A pocket-sized card that fills up as you collect. Get a stamp with each completed order, tick off every series, and a full card earns a special reward.
      </p>

      {/* Auth state banner */}
      {!user ? (
        <div className="mt-6 rounded-2xl border-2 border-ink/20 bg-white p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">Track your real Collector Passport</h3>
            <p className="mt-1 text-sm text-ink-soft">
              Sign in to automatically collect digital stamps for your qualifying orders and claim rewards.
            </p>
          </div>
          <Link to="/account" className="btn-primary">
            Sign in to View Passport →
          </Link>
        </div>
      ) : null}

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <PassportCard
            stamps={stampDates}
            seriesDone={seriesDone}
            goal={goal}
            rewardDescription={passport?.rule?.rewardDescription ?? passportConfig.rewardDescription}
            seriesGoal={passport?.rule?.seriesGoal ?? passportConfig.seriesGoal}
          />
        </div>

        <div className="space-y-6">
          {/* Progress Card */}
          <section className="rounded-2xl border-2 border-ink bg-white p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-ink/10 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">Active Card Progress</span>
                <h2 className="text-2xl font-extrabold">
                  {user ? `${user.name}’s Stamps` : 'Passport Progress'}
                </h2>
                {loading && user && <p className="mt-1 text-xs text-ink-soft animate-pulse">Syncing stamps from server…</p>}
              </div>
              <span className="rounded-full bg-mint/20 px-3 py-1 text-xs font-extrabold text-mint">
                {progress.count} / {progress.goal} STAMPS
              </span>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-sm font-bold">
                <span>Reward Goal</span>
                <span>{progress.percent}% Completed</span>
              </div>
              <div className="mt-2 h-4 w-full overflow-hidden rounded-full bg-paper-deep border border-ink/10">
                <div
                  className="h-full rounded-full bg-lime transition-all duration-500"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-ink/15 bg-paper p-3 text-xs leading-relaxed text-ink-soft">
              <strong className="text-ink">Rules:</strong> {passport?.rule?.stampRule || 'One stamp awarded for each completed, paid order. Cancelled orders automatically reverse associated stamps.'}
            </div>

            {/* Claim Reward Action */}
            {user && (
              <div className="mt-5 border-t border-ink/10 pt-4">
                {passport?.rewardsEligible ? (
                  <div>
                    <div className="rounded-xl border-2 border-mint/40 bg-mint/10 p-4">
                      <p className="flex items-center gap-2 font-bold text-mint">
                        <LuGift className="size-5" /> You have unlocked a collector reward!
                      </p>
                      <p className="mt-1 text-xs text-ink-soft">
                        Eligible reward: <strong>{passport.rule.rewardDescription}</strong>
                      </p>
                      <button
                        type="button"
                        disabled={claiming}
                        onClick={handleClaimReward}
                        className="btn-primary mt-3 w-full text-xs"
                      >
                        {claiming ? 'Submitting Claim…' : 'Claim Reward Now'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-ink-soft flex items-center gap-2">
                    <LuLock className="size-4 shrink-0 text-ink-soft" />
                    Collect {Math.max(0, goal - stampsCount)} more stamp{goal - stampsCount === 1 ? '' : 's'} to unlock your next reward.
                  </p>
                )}

                {claimMessage && (
                  <p role="status" className="mt-3 rounded-lg bg-mint/20 p-2 text-xs font-bold text-mint">
                    ✓ {claimMessage}
                  </p>
                )}
                {claimError && (
                  <p role="alert" className="mt-3 rounded-lg bg-danger/20 p-2 text-xs font-bold text-danger">
                    ✗ {claimError}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Stamps History */}
          {user && passport && passport.stamps.length > 0 && (
            <section className="rounded-2xl border border-ink/15 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold">Earned Stamps History</h3>
              <ul className="mt-3 divide-y divide-ink/10 max-h-56 overflow-y-auto">
                {passport.stamps.map((st) => (
                  <li key={st.id} className="py-2.5 text-xs flex items-center justify-between">
                    <div>
                      <p className="font-bold text-ink">
                        {st.orderRef ? `Order #${st.orderRef}` : 'Stamp Adjustment'}
                      </p>
                      <p className="text-ink-soft">{st.reason}</p>
                    </div>
                    <span className="text-right text-ink-soft font-mono">
                      {new Date(st.date).toLocaleDateString('en-IN')}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Redemptions History */}
          {user && passport && passport.redemptions.length > 0 && (
            <section className="rounded-2xl border border-ink/15 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold">Reward Claims</h3>
              <ul className="mt-3 divide-y divide-ink/10">
                {passport.redemptions.map((r) => (
                  <li key={r.id} className="py-2.5 text-xs flex items-center justify-between">
                    <div>
                      <p className="font-bold text-ink">{r.rewardDescription}</p>
                      <p className="text-ink-soft">
                        Status: <strong className="text-lime">{r.status}</strong>
                        {r.notes ? ` · ${r.notes}` : ''}
                      </p>
                    </div>
                    <span className="text-right text-ink-soft font-mono">
                      {new Date(r.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
