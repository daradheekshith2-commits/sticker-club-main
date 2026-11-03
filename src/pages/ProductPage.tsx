import { useMemo, useState } from 'react';
import { LuArrowRight, LuShoppingBag, LuX } from 'react-icons/lu';
import { brand, whatsappLink } from '../config/brand';
import { useCart } from '../context/CartContext';
import { useCatalogue } from '../context/CatalogueContext';
import { getCollection, productTypeLabels } from '../data/collections';
import { d } from '../data/products';
import { usePageMeta } from '../hooks/usePageMeta';
import { Link, useParams } from '../router/router';
import { getContents, getPackQuantity, getRelatedProducts, shopUrl } from '../utils/catalogue';
import { formatPrice } from '../utils/format';
import { unitPrice } from '../utils/cart';
import { ProductImage, viewsFor, type ArtView } from '../components/art/ProductArt';
import { ProductGrid } from '../components/product/ProductCard';
import { QuantitySelector } from '../components/product/QuantitySelector';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { EmptyState } from '../components/ui/EmptyState';
import { Notice } from '../components/ui/Placeholder';
import { BonusGiftNote } from '../components/collectible/BonusGift';
import { CollectibleRows, DuoDetails, MysteryPackDetails, SecretMessageDetails } from '../components/collectible/ProductExtras';
import { RarityBadge } from '../components/collectible/RarityBadge';

const viewNames: Record<ArtView, string> = { main: 'Product', detail: 'Close-up', context: 'In use' };

export function ProductPage() {
  const { slug } = useParams();
  const { getProductBySlug, isPurchasable, loading, products } = useCatalogue();
  const product = getProductBySlug(slug ?? '');
  const { addItem, openCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [viewIndex, setViewIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [customSecretMsg, setCustomSecretMsg] = useState('');
  // Default size: A4 if offered, otherwise the first size. Undefined for products without sizes.
  const [variantId, setVariantId] = useState<string | undefined>(
    product?.variants?.find((v) => v.id === 'a4')?.id ?? product?.variants?.[0]?.id,
  );
  usePageMeta(product ? product.name : 'Product not found', product?.shortDescription);

  if (loading && !product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-lg font-bold text-ink-soft animate-pulse">Loading product from catalogue…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          title="We couldn’t find that product."
          body="It may have been renamed or removed from the demo catalogue."
          action={
            <Link to="/shop" className="btn-primary">
              Back to the shop
            </Link>
          }
        />
      </div>
    );
  }

  const effectiveProduct = useMemo(() => {
    if (!product || product.productType !== 'mystery') return product;
    const currentThemeId = (variantId || product.variants?.[0]?.id || 'anime').toLowerCase();

    const themeMap: Record<string, { themeName: string; themeCode: string; card: string; backdrop: string; peek: any[] }> = {
      anime: {
        themeName: 'Anime Series',
        themeCode: 'S05-ANM',
        card: '#FDE68A',
        backdrop: '#FFE0EC',
        peek: [d.sparkleEyes, d.ramenBreak, d.speedStar],
      },
      marvel: {
        themeName: 'Marvel Heroes',
        themeCode: 'S05-MRV',
        card: '#FECACA',
        backdrop: '#FEE2E2',
        peek: [d.capeMode, d.kaPow, d.heroEmblem],
      },
      quotes: { // Cars & Bikes
        themeName: 'Cars & Bikes',
        themeCode: 'S04-CAR',
        card: '#FED7AA',
        backdrop: '#FFD9CC',
        peek: [d.helmet, d.pitLane, d.polePosition],
      },
      gaming: {
        themeName: 'Gaming Edition',
        themeCode: 'S04-GAM',
        card: '#DDD6FE',
        backdrop: '#E2DAFF',
        peek: [d.controller, d.pixelHeart, d.pressStart],
      },
      cute: {
        themeName: 'Cute Aesthetic',
        themeCode: 'S03-CTE',
        card: '#FBCFE8',
        backdrop: '#FFF0B8',
        peek: [d.sleepyCloud, d.cat, d.smiley],
      },
      devotion: {
        themeName: 'Devotion Divine',
        themeCode: 'S-DEV',
        card: '#FED7AA',
        backdrop: '#FFF0B8',
        peek: [d.omLotus, d.shivaTrishul, d.bansuriFlute],
      },
      sports: {
        themeName: 'Sports Edition',
        themeCode: 'S-SPT',
        card: '#BAE6FD',
        backdrop: '#D3F6E6',
        peek: [d.cricketFever, d.jerseySeven, d.slamDunk],
      },
      movies: {
        themeName: 'Movie Night',
        themeCode: 'S05-FLM',
        card: '#E2E8F0',
        backdrop: '#D6F0FF',
        peek: [d.takeOne, d.admitOne, d.popcorn],
      },
    };

    const cfg = themeMap[currentThemeId] || themeMap.anime;
    return {
      ...product,
      art: {
        kind: 'mystery' as const,
        backdrop: cfg.backdrop,
        card: cfg.card,
        peek: cfg.peek,
        themeName: cfg.themeName,
        themeCode: cfg.themeCode,
      },
    } as typeof product;
  }, [product, variantId]);

  const purchasable = isPurchasable(product);
  const typeLabel = productTypeLabels[product.productType];
  const contents = getContents(product);
  const packQty = getPackQuantity(product);
  const views = effectiveProduct.images?.length ? effectiveProduct.images.map((_, i) => i) : viewsFor(effectiveProduct);
  const related = getRelatedProducts(product, 4, products);
  const selectedVariant = product.variants?.find((v) => v.id === variantId);
  const sizeValue = product.category === 'posters'
    ? (selectedVariant ? `${selectedVariant.label} (${selectedVariant.detail})` : (product.dimensions || 'A4 (21 × 29.7 cm)'))
    : (product.dimensions || 'Fits within 3 × 3 inches area');

  const specs = [
    { label: 'Size', value: sizeValue },
    { label: 'Material', value: product.material || (product.category === 'posters' ? '300 GSM Archival Matte Cardstock' : 'Premium Die-Cut Vinyl') },
    { label: 'Finish', value: product.finish || (product.category === 'posters' ? 'Matte Finish' : 'Protective Water-Resistant Laminate') },
  ];
  const hasSpecs = specs.some((s) => s.value);
  const price = unitPrice(product, variantId);
  const interest = whatsappLink(`Hi! I’d be interested in "${product.name}" when it’s available.`);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: product.category === 'posters' ? 'Posters' : 'Stickers', to: shopUrl({ category: product.category }) },
          { label: typeLabel.plural, to: shopUrl({ types: [product.productType] }) },
          { label: product.name },
        ]}
      />

      <div className="mt-6 grid gap-8 md:grid-cols-2 lg:gap-14">
        {/* Gallery */}
        <div>
          <div
            role="button"
            tabIndex={0}
            onClick={() => setZoomOpen(true)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setZoomOpen(true); }}
            title="Click to view enlarged image"
            className={`group relative cursor-zoom-in overflow-hidden rounded-[var(--radius-card)] border-2 border-ink ${product.category === 'posters' || product.productType === 'poster' ? 'aspect-[1/1.414] max-h-[720px] mx-auto bg-black/20' : 'aspect-square'}`}
          >
            {typeof views[viewIndex] === 'number' ? (
              <ProductImage product={effectiveProduct} index={views[viewIndex] as number} className="size-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-300" />
            ) : (
              <ProductImage product={effectiveProduct} view={views[viewIndex] as ArtView} className="size-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-300" />
            )}
            <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm flex items-center gap-1.5 pointer-events-none">
              <span>Click to enlarge</span>
            </div>
          </div>
          {views.length > 1 && (
            <div className="mt-3 flex gap-3" role="group" aria-label="Product images">
              {views.map((v, i) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => setViewIndex(i)}
                  aria-pressed={viewIndex === i}
                  aria-label={`Show ${typeof v === 'number' ? `photo ${i + 1}` : viewNames[v].toLowerCase()} image`}
                  className={`${product.category === 'posters' || product.productType === 'poster' ? 'w-16 h-22 aspect-[1/1.414]' : 'size-20'} overflow-hidden rounded-xl border-2 transition-colors ${viewIndex === i ? 'border-ink' : 'border-ink/15 hover:border-ink/50'}`}
                >
                  {typeof v === 'number' ? (
                    <ProductImage product={effectiveProduct} index={v} className="size-full object-cover object-center" />
                  ) : (
                    <ProductImage product={effectiveProduct} view={v} className="size-full object-cover object-center" />
                  )}
                </button>
              ))}
            </div>
          )}
          {!product.images?.length && <p className="mt-3 text-xs text-ink-soft">Illustrations are demo artwork. Real product photos will replace them after sampling.</p>}
        </div>

        {/* Details */}
        <div>
          <p className="eyebrow flex flex-wrap items-center gap-2">
            <span>
              {typeLabel.singular}
              {packQty ? ` · ${packQty} ${product.category === 'posters' ? 'prints' : 'stickers'}` : ''}
            </span>
            {(product.rarity === 'rare' || product.rarity === 'limited') && <RarityBadge rarity={product.rarity} showDemo />}
          </p>
          <h1 className="mt-2 text-5xl leading-[0.95] font-extrabold md:text-6xl">{product.name}</h1>
          <p className="mt-4 font-display text-4xl font-extrabold" aria-live="polite">
            {formatPrice(price)}
          </p>
          <p className="mt-1 text-sm text-ink-soft">Test price — may change before launch.</p>

          <p className="mt-6 text-lg leading-relaxed">{product.description}</p>

          {product.collections.map((c) => getCollection(c)?.note).filter(Boolean).map((n) => (
            <p key={n} className="mt-4 rounded-xl border-2 border-dashed border-ink/30 p-3 text-sm">
              {n}
            </p>
          ))}

          {product.note && (
            <div className="mt-5">
              <Notice>{product.note}</Notice>
            </div>
          )}

          {/* Sticker Dimensions & Sizing Display */}
          {product.category === 'stickers' && (
            <div className="mt-6 rounded-2xl border-2 border-mint/20 bg-paper-deep/60 p-4 sm:p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-mint" />
                <h3 className="font-display text-base font-extrabold text-ink uppercase tracking-wider">
                  Dimensions —
                </h3>
              </div>
              <div className="mt-3 space-y-2 text-sm leading-relaxed text-ink/90">
                <p className="font-bold text-ink">
                  Fits within 3 × 3 inches area{product.productType === 'sheet' ? ' (A6 sheet: 10.5 × 14.8 cm)' : ' (approx. 7.6 × 7.6 cm)'}.
                </p>
                <p className="text-ink-soft">
                  Height &amp; width depends on the aspect ratio of the design.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-semibold text-ink-soft">Design aspect ratio:</span>
                  <span className="inline-flex items-center rounded-lg border-2 border-ink bg-sun px-3 py-1 font-mono text-xs font-extrabold text-ink shadow-[2px_2px_0px_#121212] tracking-wide">
                    {product.productType === 'sheet' ? 'A6 Sticker Sheet (10.5 × 14.8 cm)' : 'Max 3.0" × 3.0" (7.6 × 7.6 cm)'}
                  </span>
                </div>
                <p className="mt-3 text-xs text-ink-soft/90 italic border-t border-ink/10 pt-2.5">
                  <strong>Please Note:</strong> Colours may slightly vary depending on your screen brightness.
                </p>
              </div>
            </div>
          )}

          {/* Poster Dimensions Guide (A5, A4, A3) */}
          {product.category === 'posters' && (
            <div className="mt-6 rounded-2xl border-2 border-ink/15 bg-white p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-extrabold text-ink uppercase tracking-wider">
                  Poster Dimensions Guide
                </h3>
                <span className="text-xs font-mono font-bold text-mint bg-ink px-2.5 py-0.5 rounded-full">
                  Selected: {variantId?.toUpperCase() ?? 'A4'}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <button
                  type="button"
                  onClick={() => setVariantId('a5')}
                  className={`rounded-xl border p-2.5 transition-all text-left sm:text-center ${
                    variantId === 'a5'
                      ? 'border-ink bg-lime/25 shadow-sm ring-2 ring-ink/20'
                      : 'border-ink/10 bg-paper/40 hover:border-ink/30'
                  }`}
                >
                  <p className="font-bold text-sm text-ink">A5</p>
                  <p className="text-xs font-extrabold text-ink mt-0.5">14.8 × 21 cm</p>
                  <p className="text-[11px] text-ink-soft">5.8 × 8.3 in</p>
                  <span className="mt-1 block text-[10px] text-ink-soft font-semibold">Desk frames</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVariantId('a4')}
                  className={`rounded-xl border p-2.5 transition-all text-left sm:text-center ${
                    variantId === 'a4' || (!variantId && true)
                      ? 'border-ink bg-lime/25 shadow-sm ring-2 ring-ink/20'
                      : 'border-ink/10 bg-paper/40 hover:border-ink/30'
                  }`}
                >
                  <p className="font-bold text-sm text-ink">A4</p>
                  <p className="text-xs font-extrabold text-ink mt-0.5">21 × 29.7 cm</p>
                  <p className="text-[11px] text-ink-soft">8.3 × 11.7 in</p>
                  <span className="mt-1 block text-[10px] text-ink-soft font-semibold">Standard poster</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVariantId('a3')}
                  className={`rounded-xl border p-2.5 transition-all text-left sm:text-center ${
                    variantId === 'a3'
                      ? 'border-ink bg-lime/25 shadow-sm ring-2 ring-ink/20'
                      : 'border-ink/10 bg-paper/40 hover:border-ink/30'
                  }`}
                >
                  <p className="font-bold text-sm text-ink">A3</p>
                  <p className="text-xs font-extrabold text-ink mt-0.5">29.7 × 42 cm</p>
                  <p className="text-[11px] text-ink-soft">11.7 × 16.5 in</p>
                  <span className="mt-1 block text-[10px] text-ink-soft font-semibold">Twice A4 · Wall size</span>
                </button>
              </div>
              <p className="mt-3 text-[11px] text-ink-soft italic border-t border-ink/10 pt-2">
                Printed on premium 300 GSM archival matte cardstock with crisp edge-to-edge detailing.
              </p>
            </div>
          )}

          {product.variants && purchasable && (
            <fieldset className="mt-8">
              <legend className="mb-3 font-bold">{product.variantLabel === 'Theme' ? 'Choose your theme' : 'Size'}</legend>
              <div className={`grid gap-2 ${product.variantLabel === 'Theme' ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {product.variants.map((v) => (
                  <label
                    key={v.id}
                    className={`cursor-pointer rounded-2xl border-2 px-3 py-3 text-center transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ink ${
                      variantId === v.id ? 'border-ink bg-lime' : 'border-ink/15 bg-white hover:border-ink/50'
                    }`}
                  >
                    <input type="radio" name={product.variantLabel === 'Theme' ? 'theme' : 'size'} value={v.id} checked={variantId === v.id} onChange={() => setVariantId(v.id)} className="sr-only" />
                    <span className={`block font-display font-extrabold ${product.variantLabel === 'Theme' ? 'text-base leading-tight' : 'text-xl'}`}>{v.label}</span>
                    {v.detail && <span className="block text-xs text-ink-soft">{v.detail}</span>}
                    <span className="mt-1 block text-sm font-bold">{formatPrice(v.price)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="mt-8 border-t-2 border-ink/10 pt-6">
            {purchasable && product.category === 'stickers' && (
              <div className="mb-4">
                <BonusGiftNote compact />
              </div>
            )}
            {product.inventory && product.inventory.quantity <= 0 ? (
              <div className="space-y-3">
                <button type="button" disabled className="btn-primary w-full py-4 text-base opacity-50 cursor-not-allowed">
                  Out of Stock
                </button>
                <p className="text-sm text-ink-soft">
                  This item is currently out of stock in our database inventory. Check back soon for restocks.
                </p>
              </div>
            ) : purchasable ? (
              <div className="space-y-4">
                {product.productType === 'secret' && (
                  <div className="rounded-2xl border-2 border-mint/40 bg-mint/5 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm font-extrabold text-ink">Personalize Secret Note</span>
                      <span className="text-[11px] font-mono font-bold text-mint bg-ink px-2 py-0.5 rounded-md">Free Sealed Card</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-soft">
                      Want to surprise someone? Enter a custom message to seal inside the envelope, or leave empty for a surprise.
                    </p>
                    <div className="mt-2.5">
                      <input
                        type="text"
                        maxLength={100}
                        value={customSecretMsg}
                        onChange={(e) => setCustomSecretMsg(e.target.value)}
                        placeholder="e.g. Always keep shining! Happy Birthday 🎉"
                        className="w-full rounded-xl border border-ink/20 bg-white px-3.5 py-2.5 text-xs text-ink placeholder:text-ink-soft/60 focus:border-mint focus:outline-none focus:ring-2 focus:ring-mint/20"
                      />
                      <div className="mt-1 flex justify-between text-[11px] text-ink-soft">
                        <span>Wax-sealed inside envelope</span>
                        <span>{customSecretMsg.length}/100</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <QuantitySelector label="Quantity" value={quantity} onChange={setQuantity} />
                  <button
                    type="button"
                    className="btn-primary flex-1 py-4 text-base"
                    onClick={() => {
                      const finalVariant = customSecretMsg.trim() ? `${variantId || 'standard'}-note:${encodeURIComponent(customSecretMsg.trim())}` : variantId;
                      addItem(product.id, quantity, finalVariant);
                      setQuantity(1);
                      openCart();
                    }}
                  >
                    <LuShoppingBag aria-hidden /> Add to cart · {formatPrice(price * quantity)}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <button type="button" disabled className="btn-primary w-full py-4 text-base">
                  Not available yet
                </button>
                <p className="text-sm text-ink-soft">
                  This is part of our planned {product.category === 'posters' ? 'wall-art range' : 'range'} and can’t be ordered yet.
                  {interest ? (
                    <>
                      {' '}
                      <a href={interest} target="_blank" rel="noreferrer" className="font-bold underline">
                        Tell us you’re interested
                      </a>
                      .
                    </>
                  ) : (
                    ' Tell us if you’d want it — it helps us decide what to make next.'
                  )}
                </p>
              </div>
            )}
          </div>

          {product.productType === 'mystery' && <MysteryPackDetails product={product} variantId={variantId} />}
          {product.productType === 'duo' && <DuoDetails product={product} />}
          {product.productType === 'secret' && <SecretMessageDetails product={product} />}

          {contents.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-extrabold">What’s inside</h2>
              <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {contents.map((c, i) => (
                  <li key={c + i} className="flex items-center gap-2 text-ink-soft">
                    <span aria-hidden className="size-2 rounded-full bg-ink" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <dl className="mt-8 divide-y-2 divide-ink/10 border-y-2 border-ink/10">
            {product.collections.length > 0 && (
            <div className="flex justify-between gap-4 py-3">
              <dt className="font-bold">Vibes</dt>
              <dd className="flex flex-wrap justify-end gap-1.5">
                {product.collections.map((c) => (
                  <Link key={c} to={shopUrl({ collections: [c] })} className="chip py-1 text-xs">
                    {getCollection(c)?.name}
                  </Link>
                ))}
              </dd>
            </div>
            )}
            <CollectibleRows product={product} />
            {hasSpecs ? (
              specs.map((s) =>
                s.value ? (
                  <div key={s.label} className="flex justify-between gap-4 py-3">
                    <dt className="font-bold">{s.label}</dt>
                    <dd className="text-right text-ink-soft">{s.value}</dd>
                  </div>
                ) : null,
              )
            ) : (
              <div className="flex justify-between gap-4 py-3">
                <dt className="font-bold">{product.category === 'posters' ? 'Paper & finish' : 'Size, material & finish'}</dt>
                <dd className="text-right text-ink-soft">To be confirmed after supplier samples</dd>
              </div>
            )}
            <div className="flex justify-between gap-4 py-3">
              <dt className="font-bold">Tags</dt>
              <dd className="text-right text-ink-soft">{product.tags.join(', ')}</dd>
            </div>
          </dl>
          {brand.isPrototype && product.category !== 'posters' && (
            <p className="mt-4 text-sm text-ink-soft">
              Prototype store: adding to cart works, but no real orders or payments are taken yet.
            </p>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24" aria-labelledby="related-title">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 id="related-title" className="text-3xl font-extrabold md:text-4xl">
              You might also like
            </h2>
            <Link
              to={product.category === 'stickers' ? shopUrl({ category: 'stickers', types: product.productType === 'single' ? ['single'] : undefined }) : shopUrl({ category: 'posters' })}
              className="hidden items-center gap-1 font-bold underline underline-offset-4 sm:flex"
            >
              {product.category === 'stickers' ? 'More Stickers' : 'More Posters'} <LuArrowRight aria-hidden />
            </Link>
          </div>
          <ProductGrid products={related} layout="wide" />
        </section>
      )}

      {/* Lightbox Zoom Modal */}
      {zoomOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          onClick={() => setZoomOpen(false)}
        >
          <div className="relative max-h-[92vh] max-w-4xl w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setZoomOpen(false)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-lime transition cursor-pointer"
              aria-label="Close zoom preview"
            >
              <LuX className="size-6" />
            </button>
            <div className={`overflow-hidden rounded-2xl border-2 border-mint/20 bg-paper-deep/50 max-h-[82vh] ${product.category === 'posters' || product.productType === 'poster' ? 'aspect-[1/1.414]' : 'aspect-square'}`}>
              {typeof views[viewIndex] === 'number' ? (
                <ProductImage product={effectiveProduct} index={views[viewIndex] as number} className="size-full object-contain" />
              ) : (
                <ProductImage product={effectiveProduct} view={views[viewIndex] as ArtView} className="size-full object-contain" />
              )}
            </div>
            <p className="mt-3 text-sm text-[#F4F0E8] font-bold">{product.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}
