/**
 * COLLECTIBLE TYPES — rarity, series, editions, mystery packs, duos.
 *
 * Everything that describes PRODUCTION facts (edition sizes, odds, stock) is
 * nullable on purpose: `null` means "not decided / not confirmed yet", and the
 * UI shows "to be confirmed" instead of inventing a number.
 */

/** How often a design is planned to be printed. Demo classification for now. */
export type RarityId = 'common' | 'uncommon' | 'rare' | 'limited';

/** Where a piece of collectible data comes from. Only 'production' may ever be presented as fact. */
export type DataSource = 'demo' | 'production';

/** A themed series of designs, e.g. "S01 · Campus Classics". */
export interface Series {
  /** Stable id, also the printed series code, e.g. 'S01'. */
  id: string;
  name: string;
  blurb: string;
  color: string;
  /** Demo until a real production run is planned for the series. */
  source: DataSource;
}

/** Limited-edition facts. Shown ONLY when confirmed for a real print run. */
export interface EditionInfo {
  /** Total copies printed in the run, e.g. 100. Null until the run is fixed. */
  runSize: number | null;
  /** True only when the run size above is confirmed with the printer. */
  confirmed: boolean;
}

/** A special variant that might appear in a mystery pack (e.g. holographic). */
export interface SpecialVariant {
  id: string;
  name: string;
  /**
   * False until the physical stock really exists. While false the UI says the
   * variant is not included, and no chance of receiving it is advertised.
   */
  inventoryConfirmed: boolean;
}

/** One row of a published odds table. Only filled from a real production plan. */
export interface OddsRow {
  label: string;
  /** e.g. '1 in 12 packs' — only from a real production plan. */
  chance: string;
}

/** What a mystery pack contains. Prices stay on the product. */
export interface MysteryConfig {
  /** Stickers you are guaranteed, chosen from the selected theme. */
  guaranteedCount: number;
  /** Extra surprise stickers on top of the guaranteed ones. */
  mysteryCount: number;
  /** Plain-language rule for the guaranteed stickers. */
  guaranteedRule: string;
  /** Plain-language rule for the mystery sticker. */
  mysteryRule: string;
  packaging: string;
  specialVariants: SpecialVariant[];
  /**
   * Published odds. MUST stay null until real inventory exists and the odds
   * are calculated from it. The page shows "not configured" while null.
   */
  odds: OddsRow[] | null;
}

/** How the two stickers of a Matching Duo relate. */
export type DuoPairing = 'two-poses' | 'complementary' | 'halves' | 'laptop-phone';
