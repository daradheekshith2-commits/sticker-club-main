/**
 * BUILD YOUR OWN PACK — options and PROVISIONAL prices.
 *
 * Change pack sizes, prices, finishes and the surprise-sticker wording here.
 * Nothing in the page hardcodes a price; everything is read from this file.
 */

export interface PackSizeOption {
  /** Number of stickers the customer chooses. */
  count: 5 | 10;
  label: string;
  /** Provisional price for the whole pack, in rupees (finish surcharge added per sticker). */
  price: number;
}

export interface PackFinishOption {
  id: string;
  label: string;
  description: string;
  /** Extra per chosen sticker, in rupees. */
  surchargePerSticker: number;
  /**
   * Only finishes that are genuinely offered can be selected. Leave false
   * until the printer has confirmed it; the option is then shown as unavailable.
   */
  available: boolean;
}

export const packSizes: PackSizeOption[] = [
  { count: 5, label: '5 stickers', price: 109 },
  { count: 10, label: '10 stickers', price: 199 },
];

export const packFinishes: PackFinishOption[] = [
  { id: 'standard', label: 'Standard', description: 'Our regular finish. Exact material is confirmed after printer samples.', surchargePerSticker: 0, available: true },
  { id: 'gloss', label: 'Glossy', description: 'Not offered until our printer confirms it.', surchargePerSticker: 3, available: false },
];

/** The extra sticker every built pack includes. Described exactly as it is. */
export const packSurprise = {
  count: 1,
  title: '+1 surprise sticker',
  description:
    'Every built pack includes one extra sticker chosen by us, in the theme you picked. It’s a bonus, not a rare pull — it’s a regular design and could be one you already have.',
};

/** Which catalogue products can be picked: purchasable single stickers that are Common or Uncommon. */
export const packEligibleRarities = ['common', 'uncommon'] as const;
