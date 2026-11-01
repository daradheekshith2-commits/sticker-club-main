/**
 * VOTE FOR THE NEXT DROP — /vote-next-drop (also the packaging QR destination)
 *
 * Real database-backed community voting and idea submissions.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { LuCheck, LuInfo, LuSend, LuVote } from 'react-icons/lu';
import { dropProposals as fallbackProposals, upcomingDrop, VOTE_PATH } from '../data/drops';
import { usePageMeta } from '../hooks/usePageMeta';
import { useAuth } from '../context/AuthContext';
import { communityApi, type LiveProposal } from '../services/community';
import { IDEA_MAX, validateIdea, type IdeaErrors } from '../utils/community';
import { isLocalAddress } from '../utils/qr';
import { motifs } from '../components/art/motifs';
import { QrCode } from '../components/collectible/QrCode';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { Link } from '../router/router';

function ThemeArt({ motif, color }: { motif: string; color: string }) {
  const Motif = (motifs as any)[motif] || motifs.sparkle;
  return (
    <svg viewBox="0 0 100 100" className="size-14 shrink-0 rounded-xl border-2 border-ink" style={{ backgroundColor: color }} aria-hidden>
      <g transform="translate(14 14) scale(0.72)">
        <Motif fg="#121212" bg={color} accent="#FFFFFF" />
      </g>
    </svg>
  );
}

function VoteSection({ proposals, user, token, onVoted }: { proposals: LiveProposal[]; user: any; token: string | null; onVoted: () => void }) {
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [directionId, setDirectionId] = useState<string | null>(null);
  const [result, setResult] = useState<{ theme: string; direction: string; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const proposal = proposals.find((p) => p.id === proposalId);

  // Auto-select first proposal or user's previously voted proposal
  useEffect(() => {
    if (proposals.length > 0 && !proposalId) {
      const alreadyVoted = proposals.find((p) => p.userVotedDirectionId);
      if (alreadyVoted) {
        setProposalId(alreadyVoted.id);
        setDirectionId(alreadyVoted.userVotedDirectionId);
      } else {
        setProposalId(proposals[0].id);
      }
    }
  }, [proposals]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Please sign in to your account to cast a vote.');
      return;
    }
    if (!proposal) return setError('Choose a theme first.');
    const direction = proposal.directions.find((d) => d.id === directionId);
    if (!direction) return setError('Choose a design direction for that theme.');
    setError(null);
    setBusy(true);

    const res = await communityApi.castVote({ proposalId: proposal.id, directionId: direction.id }, token);
    setBusy(false);
    if (res.ok) {
      setResult({ theme: proposal.theme, direction: direction.name, message: res.message });
      onVoted();
    } else {
      setError(res.message);
    }
  };

  return (
    <section aria-labelledby="vote-title" className="rounded-[var(--radius-card)] border-2 border-ink bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="vote-title" className="text-2xl font-extrabold md:text-3xl">
            Vote on next month’s theme
          </h2>
          <p className="mt-1 text-sm text-ink-soft">One vote per verified customer account. You can update your vote while voting is open.</p>
        </div>
        <span className="rounded-full bg-mint/20 px-3 py-1 text-xs font-bold text-mint">
          Live Community Voting
        </span>
      </div>

      {!user && (
        <div className="mt-4 rounded-xl border border-ink/20 bg-paper/60 p-4 text-sm flex flex-wrap items-center justify-between gap-3">
          <p className="text-ink-soft">Sign in to cast your vote and influence the next sticker drop.</p>
          <Link to="/account" className="btn-primary text-xs py-1.5 px-3">
            Sign in to Vote →
          </Link>
        </div>
      )}

      <form onSubmit={submit} className="mt-5 space-y-5">
        <fieldset className="min-w-0">
          <legend className="mb-2 font-bold">1. Theme</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {proposals.map((p) => {
              const hasVotedOnThis = Boolean(p.userVotedDirectionId);
              return (
                <label
                  key={p.id}
                  className={`relative flex cursor-pointer gap-3 rounded-xl border-2 p-3 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ink ${
                    proposalId === p.id ? 'border-ink bg-lime' : 'border-ink/15 hover:border-ink/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="drop-theme"
                    className="sr-only"
                    checked={proposalId === p.id}
                    onChange={() => {
                      setProposalId(p.id);
                      setDirectionId(p.userVotedDirectionId || null);
                      setResult(null);
                    }}
                  />
                  <ThemeArt motif={p.motif} color={p.color} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between">
                      <span className="block font-bold">{p.theme}</span>
                      {hasVotedOnThis && (
                        <span className="rounded bg-mint/30 px-1.5 py-0.5 text-[10px] font-bold text-mint">
                          Voted
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-ink-soft">{p.pitch}</span>
                    {p.totalVotes !== null && (
                      <span className="mt-1 block text-[10px] font-bold text-ink">
                        {p.totalVotes} total votes
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="min-w-0" disabled={!proposal}>
          <legend className="mb-2 font-bold">2. Design direction {proposal ? `for ${proposal.theme}` : ''}</legend>
          {!proposal && <p className="text-sm text-ink-soft">Choose a theme above to see its directions.</p>}
          {proposal && (
            <div className="grid gap-2 sm:grid-cols-3">
              {proposal.directions.map((d) => {
                const isSelected = directionId === d.id;
                const isMyVote = proposal.userVotedDirectionId === d.id;
                const total = proposal.totalVotes || 0;
                const percent = total > 0 && typeof d.voteCount === 'number' ? Math.round((d.voteCount / total) * 100) : null;

                return (
                  <label
                    key={d.id}
                    className={`relative cursor-pointer rounded-xl border-2 p-3 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ink ${
                      isSelected ? 'border-ink bg-lime' : 'border-ink/15 hover:border-ink/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="drop-direction"
                      className="sr-only"
                      checked={isSelected}
                      onChange={() => setDirectionId(d.id)}
                    />
                    <div className="flex items-center justify-between">
                      <span className="block font-bold">{d.name}</span>
                      {isMyVote && (
                        <span className="rounded bg-mint/30 px-1.5 py-0.2 text-[10px] font-bold text-mint">
                          Your choice
                        </span>
                      )}
                    </div>
                    <span className="mt-1 block text-xs text-ink-soft">{d.description}</span>
                    {typeof d.voteCount === 'number' && (
                      <div className="mt-2 border-t border-ink/10 pt-1 text-[11px] font-bold text-ink flex justify-between">
                        <span>{d.voteCount} votes</span>
                        {percent !== null && <span>{percent}%</span>}
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>

        {error && (
          <p role="alert" className="text-sm font-bold text-danger">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={!user || busy}
          className="btn-primary w-full sm:w-auto disabled:opacity-50"
        >
          <LuVote aria-hidden /> {busy ? 'Submitting…' : 'Submit Vote'}
        </button>
      </form>

      {result && (
        <div role="status" className="mt-4 rounded-xl border-2 border-ink bg-paper p-4 text-sm">
          <p className="flex items-center gap-2 font-bold text-mint">
            <LuCheck aria-hidden className="size-5" /> You voted for {result.theme} · {result.direction}
          </p>
          <p className="mt-1 text-ink-soft">{result.message}</p>
        </div>
      )}
    </section>
  );
}

function IdeaSection({ proposals, user, token }: { proposals: LiveProposal[]; user: any; token: string | null }) {
  const [proposalId, setProposalId] = useState('');
  const [idea, setIdea] = useState('');
  const [name, setName] = useState('');
  const [original, setOriginal] = useState(false);
  const [errors, setErrors] = useState<IdeaErrors>({});
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrors({ idea: 'Please sign in to your account to submit ideas.' });
      return;
    }
    const input = { proposalId, idea, name, originalConfirmed: original };
    const found = validateIdea(input);
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    const res = await communityApi.submitIdea(input, token);
    setBusy(false);
    if (res.ok) {
      setDone(res.message);
      setIdea('');
      setName('');
      setOriginal(false);
    } else {
      setErrors({ idea: res.message });
    }
  };

  const err = (k: keyof IdeaErrors) =>
    errors[k] ? (
      <p id={`idea-${k}-error`} className="mt-1 text-sm font-bold text-danger">
        {errors[k]}
      </p>
    ) : null;

  return (
    <section aria-labelledby="idea-title" className="rounded-[var(--radius-card)] border-2 border-ink/10 bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="idea-title" className="text-2xl font-extrabold">
          Submit a design idea
        </h2>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        Describe it in words. We draw every design ourselves, so please don’t send other people’s artwork, characters or logos. Up to 5 submissions per 24 hours.
      </p>

      {!user && (
        <div className="mt-4 rounded-xl border border-ink/20 bg-paper/60 p-4 text-sm flex flex-wrap items-center justify-between gap-3">
          <p className="text-ink-soft">Sign in to your account to submit sticker design suggestions.</p>
          <Link to="/account" className="btn-primary text-xs py-1.5 px-3">
            Sign in to Suggest →
          </Link>
        </div>
      )}

      <form onSubmit={submit} noValidate className="mt-4 space-y-4">
        <div>
          <label htmlFor="idea-theme" className="field-label">
            Theme
          </label>
          <select
            id="idea-theme"
            value={proposalId}
            onChange={(e) => setProposalId(e.target.value)}
            className="field-input"
            aria-invalid={Boolean(errors.proposalId)}
            aria-describedby={errors.proposalId ? 'idea-proposalId-error' : undefined}
          >
            <option value="">Choose a theme</option>
            {proposals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.theme}
              </option>
            ))}
          </select>
          {err('proposalId')}
        </div>
        <div>
          <label htmlFor="idea-text" className="field-label">
            Your idea
          </label>
          <textarea
            id="idea-text"
            rows={3}
            maxLength={IDEA_MAX + 50}
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            className="field-input"
            placeholder="e.g. A sleepy samosa on a hostel bunk bed"
            aria-invalid={Boolean(errors.idea)}
            aria-describedby={errors.idea ? 'idea-idea-error' : 'idea-count'}
          />
          <p id="idea-count" className="mt-1 text-xs text-ink-soft">
            {idea.trim().length}/{IDEA_MAX}
          </p>
          {err('idea')}
        </div>
        <div>
          <label htmlFor="idea-name" className="field-label">
            Your name or handle <span className="font-normal text-ink-soft">(optional, for credit if we make it)</span>
          </label>
          <input
            id="idea-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field-input"
            placeholder="e.g. Ananya"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'idea-name-error' : undefined}
          />
          {err('name')}
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={original}
            onChange={(e) => setOriginal(e.target.checked)}
            className="mt-1 size-4 accent-ink"
            aria-invalid={Boolean(errors.originalConfirmed)}
            aria-describedby={errors.originalConfirmed ? 'idea-originalConfirmed-error' : undefined}
          />
          <span>This is my own original idea, not copied from existing characters, brands or someone else’s art.</span>
        </label>
        {err('originalConfirmed')}
        <button type="submit" disabled={!user || busy} className="btn-primary w-full sm:w-auto disabled:opacity-50">
          <LuSend aria-hidden /> {busy ? 'Submitting…' : 'Send Idea'}
        </button>
      </form>
      {done && (
        <div role="status" className="mt-4 rounded-xl border-2 border-ink bg-paper p-4 text-sm font-bold text-mint">
          {done}
        </div>
      )}
    </section>
  );
}

export function VotePage() {
  usePageMeta('Vote for the next drop', 'Help pick next month’s theme and send us your sticker design ideas.');
  const { user, token } = useAuth();
  const [proposals, setProposals] = useState<LiveProposal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProposals = async () => {
    const list = await communityApi.getProposals();
    if (list && list.length > 0) {
      setProposals(list);
    } else {
      // Fallback baseline
      setProposals(
        fallbackProposals.map((p) => ({
          ...p,
          status: 'OPEN',
          resultsPublic: false,
          userVotedDirectionId: null,
          totalVotes: null,
          directions: p.directions.map((d) => ({ ...d, voteCount: null })),
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadProposals();
  }, [user?.id]);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://stickerclub.in';
  const qrAddress = `${origin}${VOTE_PATH}`;
  const localWarning = isLocalAddress(qrAddress);

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Collectibles', to: '/collectibles' }, { label: 'Vote for the next drop' }]} />

      <h1 className="mt-4 text-4xl leading-none font-extrabold md:text-6xl">Vote for the next drop</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        Every order box includes a QR code that brings you here. Help choose the next theme, or tell us a design you wish we made.
      </p>

      <section aria-labelledby="upcoming-title" className="mt-8 rounded-[var(--radius-card)] border-2 border-ink bg-paper-deep p-4 sm:p-6">
        <span className="font-mono text-xs font-bold uppercase text-ink-soft">{upcomingDrop.code}</span>
        <h2 id="upcoming-title" className="mt-1 text-2xl font-extrabold">
          {upcomingDrop.status}
        </h2>
        <p className="mt-2 text-sm text-ink-soft">{upcomingDrop.summary}</p>
      </section>

      <div className="mt-8 space-y-8">
        {loading ? (
          <div className="rounded-2xl border border-ink/20 bg-white p-8 text-center text-sm text-ink-soft animate-pulse">
            Loading drop proposals…
          </div>
        ) : (
          <>
            <VoteSection proposals={proposals} user={user} token={token} onVoted={loadProposals} />
            <IdeaSection proposals={proposals} user={user} token={token} />
          </>
        )}
      </div>

      <section aria-labelledby="qr-title" className="mt-12 rounded-[var(--radius-card)] border-2 border-dashed border-ink/30 bg-white p-4 sm:p-6">
        <h2 id="qr-title" className="text-xl font-extrabold">
          What the printed QR code looks like
        </h2>
        <p className="mt-1 text-sm text-ink-soft">Every packaging insert has this code printed on it so customers can vote from their phone.</p>
        <div className="mt-4 flex flex-wrap items-center gap-6">
          <QrCode value={qrAddress} label="Packaging QR preview" className="size-32" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-bold">Encoded address</p>
            <p className="font-mono text-xs text-ink-soft break-all">{qrAddress}</p>
            {localWarning && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-soft">
                <LuInfo aria-hidden className="size-4 shrink-0" />
                This preview encodes the current local dev URL. In production it points to the real domain.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
