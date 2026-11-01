/**
 * THE UNEXPECTED GIFT — the planned "little extra in every eligible order".
 *
 * This is a PLAN, not an operating service: `status` stays 'planned' until
 * real orders are packed. Components are only described as included when
 * `active` is true. Keep costs in check — set `costAllowancePerOrder` once the
 * contribution margin per order is known, and never switch on an expensive
 * component without a real rule behind it.
 */

export interface BonusComponent {
  id: 'bonus-sticker' | 'thank-you-card' | 'upgrade' | 'coupon';
  label: string;
  description: string;
  /** Only active components are described as included. */
  active: boolean;
  /** Why an inactive component isn't offered yet. */
  inactiveReason?: string;
}

export const bonusGift = {
  status: 'planned' as 'planned' | 'live',
  headline: 'A little extra in every eligible order',
  /** Which orders qualify. Today: any order that includes at least one sticker product. */
  eligibility: 'Orders that include at least one sticker item.',
  /** Rupees we can spend per order on extras. Null until margins are validated. */
  costAllowancePerOrder: null as number | null,
  components: [
    { id: 'bonus-sticker', label: 'A bonus mini sticker', description: 'One regular mini sticker, chosen by us.', active: true },
    { id: 'thank-you-card', label: 'A small thank-you card', description: 'A printed note from us in the package.', active: true },
    {
      id: 'upgrade',
      label: 'An occasional upgrade',
      description: 'Sometimes a nicer version of something you ordered.',
      active: false,
      inactiveReason: 'Only once there is a real rule and budget for it.',
    },
    {
      id: 'coupon',
      label: 'A future-purchase coupon',
      description: 'A code for a later order.',
      active: false,
      inactiveReason: 'No coupon codes exist yet, so none are shown or promised.',
    },
  ] satisfies BonusComponent[],
};

export const activeBonusComponents = () => bonusGift.components.filter((c) => c.active);
