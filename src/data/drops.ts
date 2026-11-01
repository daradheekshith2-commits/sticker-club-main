import type { MotifId } from '../types/product';

/**
 * NEXT DROP — themes and design directions people can vote on.
 *
 * These are proposals, not scheduled products. Vote counts are never stored
 * here: real totals will come from the voting API (src/services/community.ts).
 */

export interface DesignDirection {
  id: string;
  name: string;
  description: string;
}

export interface DropProposal {
  id: string;
  theme: string;
  pitch: string;
  motif: MotifId;
  color: string;
  directions: DesignDirection[];
}

/** Shared design directions, so every theme offers the same kinds of choice. */
const directions: DesignDirection[] = [
  { id: 'bold-type', name: 'Bold type', description: 'Big, punchy words and simple shapes.' },
  { id: 'illustrated', name: 'Illustrated', description: 'Small original drawings with a hand-made feel.' },
  { id: 'retro-badge', name: 'Retro badges', description: 'Scalloped badges and patches with limited colours.' },
];

export const dropProposals: DropProposal[] = [
  { id: 'automotive', theme: 'Automotive', pitch: 'Original cars, bikes, helmets and track-day graphics — no real brand logos.', motif: 'car', color: '#D4FF3A', directions },
  { id: 'campus-humour', theme: 'Campus humour', pitch: 'Attendance, assignments, canteen and hostel jokes.', motif: 'books', color: '#FFD447', directions },
  { id: 'cute-art', theme: 'Cute art', pitch: 'Soft characters, pastel colours and tiny joys.', motif: 'cloud', color: '#FFB3D1', directions },
  { id: 'tech', theme: 'Tech', pitch: 'Coding jokes, terminals, bugs and builds.', motif: 'code', color: '#8FD3FF', directions },
  { id: 'gaming-inspired', theme: 'Gaming-inspired', pitch: 'Original pixel art and controller doodles — no game characters.', motif: 'controller', color: '#8A6CFF', directions },
];

/** What the next drop looks like right now. Update when plans change. */
export const upcomingDrop = {
  code: 'Drop 01',
  status: 'Concept — not scheduled yet',
  summary:
    'The first community drop: a small set of new designs in the theme people pick. We’ll announce dates only once designs are final and printing is booked.',
};

/** Where the printed packaging insert's QR code will point. */
export const VOTE_PATH = '/vote-next-drop';
