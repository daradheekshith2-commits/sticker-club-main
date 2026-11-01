import { dropProposals } from '../data/drops';
import type { IdeaInput } from '../services/community';

/**
 * Checks for the "Submit a design idea" form (tested in community.test.ts).
 * A real backend must repeat these checks and add moderation.
 */

export const IDEA_MIN = 10;
export const IDEA_MAX = 280;
export const NAME_MAX = 40;

export type IdeaErrors = Partial<Record<'proposalId' | 'idea' | 'name' | 'originalConfirmed', string>>;

export function validateIdea(input: IdeaInput): IdeaErrors {
  const errors: IdeaErrors = {};
  if (!dropProposals.some((p) => p.id === input.proposalId)) errors.proposalId = 'Choose which theme your idea is for.';
  const idea = input.idea.trim();
  if (idea.length < IDEA_MIN) errors.idea = `Describe your idea in at least ${IDEA_MIN} characters.`;
  else if (idea.length > IDEA_MAX) errors.idea = `Keep it under ${IDEA_MAX} characters (${idea.length} now).`;
  else if (/https?:\/\/|www\./i.test(idea)) errors.idea = 'Describe the idea in words — please don’t link to images, especially ones made by someone else.';
  if (input.name && input.name.trim().length > NAME_MAX) errors.name = `Keep your name under ${NAME_MAX} characters.`;
  if (!input.originalConfirmed) errors.originalConfirmed = 'Please confirm the idea is your own and doesn’t copy existing characters, logos or artwork.';
  return errors;
}

/** Stamp progress for the passport, capped at the goal. */
export function passportProgress(stamps: number, goal: number) {
  const count = Math.max(0, Math.min(stamps, goal));
  return { count, goal, percent: goal > 0 ? Math.round((count / goal) * 100) : 0, complete: goal > 0 && count >= goal };
}
