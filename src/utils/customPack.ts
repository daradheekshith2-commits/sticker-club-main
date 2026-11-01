import { packFinishes, packSizes, packSurprise, type PackFinishOption, type PackSizeOption } from '../data/packBuilder';
import { getSeries } from '../data/rarity';

/**
 * BUILD YOUR OWN PACK — pure logic (tested in customPack.test.ts).
 * The page only calls these functions; no price or rule lives in JSX.
 */

export type PackCount = PackSizeOption['count'];

/** A finished pack configuration, as stored in the cart. */
export interface CustomPackConfig {
  /** Theme = series code, e.g. 'S01'. */
  seriesId: string;
  size: PackCount;
  /** Chosen catalogue product ids, in the order they were picked. Exactly `size` of them. */
  designIds: string[];
  finishId: string;
  /** The extra sticker included with every built pack. */
  surprise: { count: number; rule: 'theme-bonus' };
}

/** What the builder holds while the customer is still choosing. */
export interface PackDraft {
  seriesId: string | null;
  size: PackCount;
  designIds: string[];
  finishId: string;
}

export const getPackSize = (count: number): PackSizeOption | undefined => packSizes.find((s) => s.count === count);
export const getPackFinish = (id: string): PackFinishOption | undefined => packFinishes.find((f) => f.id === id);
export const defaultFinishId = () => packFinishes.find((f) => f.available)?.id ?? packFinishes[0].id;

/** Price of a pack, or null when the size doesn't exist or the finish isn't offered. */
export function packPrice(count: number, finishId: string): number | null {
  const size = getPackSize(count);
  const finish = getPackFinish(finishId);
  if (!size || !finish || !finish.available) return null;
  return size.price + finish.surchargePerSticker * size.count;
}

/** True while another design can be added. */
export const canAddDesign = (draft: PackDraft) => draft.designIds.length < draft.size;

/**
 * The first thing stopping the pack from going in the cart, or null when it's
 * ready. `eligibleIds` = products that may be picked (see packEligibleProducts).
 */
export function packProblem(draft: PackDraft, eligibleIds: ReadonlySet<string>): string | null {
  if (!draft.seriesId || !getSeries(draft.seriesId)) return 'Choose a theme first.';
  if (!getPackSize(draft.size)) return 'Choose a pack size.';
  const n = draft.designIds.length;
  if (new Set(draft.designIds).size !== n) return 'Each design can only be picked once.';
  if (draft.designIds.some((id) => !eligibleIds.has(id))) return 'One of the chosen designs isn’t available for packs any more. Remove it to continue.';
  if (n < draft.size) {
    const left = draft.size - n;
    return `Choose ${left} more design${left === 1 ? '' : 's'} — a ${draft.size}-sticker pack needs exactly ${draft.size}.`;
  }
  if (n > draft.size) {
    const extra = n - draft.size;
    return `Remove ${extra} design${extra === 1 ? '' : 's'} — a ${draft.size}-sticker pack needs exactly ${draft.size}.`;
  }
  const finish = getPackFinish(draft.finishId);
  if (!finish) return 'Choose a finish.';
  if (!finish.available) return `${finish.label} isn’t available yet. Choose another finish.`;
  return null;
}

/** Turns a valid draft into the cart configuration. Throws if the draft isn't valid. */
export function toPackConfig(draft: PackDraft, eligibleIds: ReadonlySet<string>): CustomPackConfig {
  const problem = packProblem(draft, eligibleIds);
  if (problem) throw new Error(problem);
  return {
    seriesId: draft.seriesId!,
    size: draft.size,
    designIds: [...draft.designIds],
    finishId: draft.finishId,
    surprise: { count: packSurprise.count, rule: 'theme-bonus' },
  };
}

/** Re-checks a stored configuration (e.g. from a saved cart). */
export const isValidPackConfig = (c: CustomPackConfig, eligibleIds: ReadonlySet<string>) =>
  packProblem({ seriesId: c.seriesId, size: c.size, designIds: c.designIds, finishId: c.finishId }, eligibleIds) === null &&
  c.surprise?.rule === 'theme-bonus';

/** e.g. "Custom pack · 5 + 1 · Campus Classics" */
export function packLabel(c: Pick<CustomPackConfig, 'size' | 'seriesId' | 'surprise'>): string {
  return `Custom pack · ${c.size} + ${c.surprise.count} · ${getSeries(c.seriesId)?.name ?? c.seriesId}`;
}

/** Stable key for a configuration: the same picks in the same pack = the same cart line. */
export function packFingerprint(c: CustomPackConfig): string {
  return [c.seriesId, c.size, c.finishId, [...c.designIds].sort().join('+')].join('|');
}
