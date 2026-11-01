import type { Product } from '../../types/product';
import { getLayout } from '../../data/wallLayouts';
import { WallCanvas } from './WallCanvas';

/**
 * Shows a ready-made wall pack as it would hang: its posters arranged in the
 * pack's layout, on a wall above a desk edge. Returns null if the product has
 * no layout or the layout doesn't match the number of designs.
 */
export function WallPackPreview({ product, className = '' }: { product: Product; className?: string }) {
  const layout = product.wallLayoutId ? getLayout(product.wallLayoutId) : undefined;
  if (!layout || product.art.kind !== 'poster-set' || product.art.posters.length !== layout.slots.length) return null;
  const fills = product.art.posters.map((design) => ({ source: 'design' as const, design }));
  return (
    <div className={`relative flex flex-col justify-end overflow-hidden ${className}`} style={{ backgroundColor: product.art.backdrop }}>
      {/* The box the wall must fit in; container-type lets the canvas size itself to its height. */}
      <div className="relative min-h-0 flex-1 px-[8%] pt-[7%] pb-[4%]">
        <div className="flex size-full items-center justify-center [container-type:size]">
          <WallCanvas layout={layout} fills={fills} detail="thumb" fit="contain" label={`${product.name}: ${layout.slots.length} posters arranged on a wall`} />
        </div>
      </div>
      {/* desk edge */}
      <div aria-hidden className="h-[9%] min-h-3 border-t-4 border-ink/80 bg-ink/10" />
    </div>
  );
}
