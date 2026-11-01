/**
 * STICKER COLLECTOR PASSPORT — proposed rules. Everything here is editable.
 *
 * The first version is a PHYSICAL card packed with orders. The digital
 * passport on the website is a demonstration only: it uses mock data and
 * temporary page state. Real progress and rewards must come from server-side
 * records of completed orders (see src/services/rewards.ts) — never from a
 * counter in the browser, which anyone can change.
 */
export const passportConfig = {
  status: 'planned' as 'planned' | 'live',
  /** Stamps needed for the reward. */
  stampsGoal: 8,
  /** How a stamp is earned (proposed). */
  stampRule: 'One stamp for each eligible order, added by us when we pack it.',
  /** The reward for a full card (proposed). Keep it cheap to fulfil. */
  rewardDescription: 'A free mini sticker of your choice',
  /** Rupee value cap for the reward. Null until the margin per order is known. */
  rewardValueCap: null as number | null,
  /** Small extra goal: collect at least one design from every series. */
  seriesGoal: true,
};
