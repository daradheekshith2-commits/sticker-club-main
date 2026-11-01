/**
 * COMMUNITY API — live database-backed drop voting and community ideas.
 */
import { apiUrl } from '../context/AuthContext';

export interface VoteInput {
  proposalId: string;
  directionId: string;
}

export interface IdeaInput {
  proposalId: string;
  idea: string;
  name?: string;
  originalConfirmed: boolean;
}

export type SubmitResult = { ok: true; mode: 'demo' | 'live'; message: string } | { ok: false; message: string };

export interface LiveProposal {
  id: string;
  theme: string;
  pitch: string;
  motif: string;
  color: string;
  status: string;
  resultsPublic: boolean;
  userVotedDirectionId: string | null;
  totalVotes: number | null;
  directions: Array<{
    id: string;
    name: string;
    description: string;
    voteCount: number | null;
  }>;
}

export interface CommunityApi {
  readonly mode: 'demo' | 'live';
  getProposals(): Promise<LiveProposal[]>;
  castVote(vote: VoteInput, token?: string | null): Promise<SubmitResult>;
  submitIdea(idea: IdeaInput, token?: string | null): Promise<SubmitResult>;
  getResults(): Promise<Record<string, number> | null>;
}

export const communityApi: CommunityApi = {
  mode: 'live',
  async getProposals() {
    try {
      const res = await fetch(`${apiUrl}/api/proposals`, { credentials: 'include' });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // ignore
    }
    return [];
  },
  async castVote(vote: VoteInput, token?: string | null) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${apiUrl}/api/proposals/${encodeURIComponent(vote.proposalId)}/vote`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ directionId: vote.directionId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        return { ok: true, mode: 'live', message: 'Your vote has been saved! You can update it anytime while voting is open.' };
      }
      return { ok: false, message: data.error || 'Failed to submit vote' };
    } catch (e: any) {
      return { ok: false, message: e.message || 'Network error while casting vote' };
    }
  },
  async submitIdea(input: IdeaInput, token?: string | null) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${apiUrl}/api/ideas`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ idea: input.idea, originalConfirmed: input.originalConfirmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        return { ok: true, mode: 'live', message: data.message || 'Your idea has been received and submitted for review!' };
      }
      return { ok: false, message: data.error || 'Failed to submit idea' };
    } catch (e: any) {
      return { ok: false, message: e.message || 'Network error while submitting idea' };
    }
  },
  async getResults() {
    try {
      const proposals = await this.getProposals();
      const results: Record<string, number> = {};
      for (const p of proposals) {
        for (const d of p.directions) {
          if (typeof d.voteCount === 'number') {
            results[d.id] = d.voteCount;
          }
        }
      }
      return Object.keys(results).length > 0 ? results : null;
    } catch {
      return null;
    }
  },
};
