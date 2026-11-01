/**
 * INVENTORY — INTEGRATION POINT for real stock, edition numbers and mystery-pack contents.
 *
 * Nothing is connected yet, so every answer is "unknown" and the site never
 * shows stock counts, "only N left" messages, edition numbers or odds.
 *
 * A real provider (backed by your order/inventory system) should answer:
 * - how many units of a product or theme can be sold,
 * - which pre-printed pack numbers / edition numbers are still unassigned,
 * - whether special stock (e.g. holographic designs) physically exists,
 * so mystery packs and limited editions are fulfilled from real stock,
 * not from a random number shown in the browser.
 */

export type StockAnswer = { known: false } | { known: true; available: number };

export interface InventoryProvider {
  readonly connected: boolean;
  stockFor(productId: string, variantId?: string): Promise<StockAnswer>;
  /** Whether a special variant (e.g. 'holo-sparkle') has real stock. */
  specialStockExists(variantId: string): Promise<boolean>;
}

export const inventory: InventoryProvider = {
  connected: false,
  async stockFor() {
    return { known: false };
  },
  async specialStockExists() {
    return false;
  },
};
