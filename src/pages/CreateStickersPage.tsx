/**
 * CREATE YOUR OWN STICKERS — /create-your-stickers
 *
 * One customer image → a configured sticker (shape, size, finish, quantity)
 * with a live die-cut preview and a price from src/data/customStickerOptions.ts.
 * Frontend prototype: images are not uploaded anywhere, no order is placed.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { LuCrop, LuInfo, LuRefreshCw, LuShoppingBag, LuTrash2, LuTriangleAlert } from 'react-icons/lu';
import { brand } from '../config/brand';
import { useCart } from '../context/CartContext';
import {
  CUSTOM_STICKER_MAX_QTY,
  customStickerFinishes,
  customStickerShapes,
  customStickerSizes,
  defaultCustomSticker,
  type CustomStickerShape,
} from '../data/customStickerOptions';
import { usePageMeta } from '../hooks/usePageMeta';
import { imageSrc, type PickedImage } from '../types/image';
import { shopUrl } from '../utils/catalogue';
import { customStickerTotal, customStickerUnitPrice, getStickerFinish, getStickerSize, stickerDraftProblem, toStickerConfig } from '../utils/customSticker';
import { formatPrice } from '../utils/format';
import { objectUrls } from '../utils/objectUrls';
import { CustomStickerPreview } from '../components/custom/CustomStickerPreview';
import { CustomStickerEditor } from '../components/custom/CustomStickerEditor';
import { ImageSourcePicker } from '../components/image/ImageSourcePicker';
import { QuantitySelector } from '../components/product/QuantitySelector';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';

/** Below this many pixels on the short side we warn that prints may look soft. */
const LOW_RES_PX = 500;

function Section({ n, title, children, hint }: { n: number; title: string; hint?: ReactNode; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="rounded-[var(--radius-card)] border-2 border-ink/10 bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-baseline gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-lime">{n}</span>
        <div>
          <h2 id={id} className="font-display text-xl font-extrabold">
            {title}
          </h2>
          {hint && <p className="text-sm text-ink-soft">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/** Radio cards used for shape, size and finish. Selecting one really changes the preview/price. */
function OptionCards<T extends string>({
  name, value, onChange, options, columns = 3,
}: {
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: { id: T; title: string; sub?: ReactNode; extra?: ReactNode }[];
  columns?: 2 | 3;
}) {
  return (
    <div role="radiogroup" aria-label={name} className={`grid gap-2 ${columns === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {options.map((o) => (
        <label
          key={o.id}
          className={`relative cursor-pointer rounded-xl border-2 px-3 py-2.5 text-sm has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ink ${value === o.id ? 'border-ink bg-lime' : 'border-ink/15 bg-white hover:border-ink/40'}`}
        >
          <input type="radio" name={name} value={o.id} checked={value === o.id} onChange={() => onChange(o.id)} className="sr-only" />
          <span className="block font-bold">{o.title}</span>
          {o.sub && <span className="block text-xs text-ink-soft">{o.sub}</span>}
          {o.extra && <span className="mt-1 block text-sm font-bold">{o.extra}</span>}
        </label>
      ))}
    </div>
  );
}

export function CreateStickersPage() {
  usePageMeta('Create your own stickers', `Turn your own image into a custom sticker with ${brand.displayName}.`);
  const { addCustomSticker, openCart } = useCart();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [sizeId, setSizeId] = useState<string>(defaultCustomSticker.sizeId);
  const [finishId, setFinishId] = useState(defaultCustomSticker.finishId);
  const [shape, setShape] = useState<CustomStickerShape>(defaultCustomSticker.shape);
  const [quantity, setQuantity] = useState(defaultCustomSticker.quantity);
  const [surface, setSurface] = useState<'laptop' | 'plain'>('laptop');
  const [rights, setRights] = useState(false);
  const [added, setAdded] = useState<string | null>(null);

  // This page holds one reference to an uploaded photo; release it when it's replaced, removed or the page closes.
  const held = useRef<PickedImage | null>(null);
  // Keep a separate retained reference to the untouched upload so recropping
  // always starts from original pixels instead of degrading an exported PNG.
  const originalHeld = useRef<PickedImage | null>(null);
  const release = (img: PickedImage | null) => {
    if (img?.source === 'upload') objectUrls.release(img.objectUrl);
  };
  useEffect(() => () => {
    release(held.current);
    release(originalHeld.current);
  }, []);

  const chooseImage = (img: PickedImage) => {
    release(held.current);
    release(originalHeld.current);
    originalHeld.current = null;
    if (img.source === 'upload') {
      objectUrls.retain(img.objectUrl);
      originalHeld.current = img;
    }
    held.current = img;
    setImage(img);
    setReplacing(false);
    setEditing(false);
    setRights(false); // a new image needs a new confirmation
    setAdded(null);
  };
  const removeImage = () => {
    release(held.current);
    release(originalHeld.current);
    originalHeld.current = null;
    held.current = null;
    setImage(null);
    setEditing(false);
    setRights(false);
  };

  const size = getStickerSize(sizeId)!;
  const finish = getStickerFinish(finishId)!;
  const unit = customStickerUnitPrice(sizeId, finishId);
  const total = customStickerTotal(sizeId, finishId, quantity);
  const draft = { image, sizeId, finishId, shape, quantity, rightsConfirmed: rights };
  const problem = stickerDraftProblem(draft);
  const lowRes = image && Math.min(image.width, image.height) < LOW_RES_PX;

  const add = () => {
    const config = toStickerConfig(draft);
    addCustomSticker(config, quantity);
    // The cart now holds its own reference to the photo; this page lets go and starts fresh.
    release(held.current);
    release(originalHeld.current);
    originalHeld.current = null;
    held.current = null;
    setImage(null);
    setRights(false);
    setAdded(`${quantity} × ${config.label}`);
    openCart();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Stickers', to: shopUrl({ category: 'stickers' }) }, { label: 'Create your own' }]} />
      <h1 className="mt-4 text-4xl leading-none font-extrabold md:text-6xl">Create your own stickers</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        Turn your own drawing, logo or photo into a sticker. Add an image, pick a shape and size, and see a live preview and price.
      </p>
      <p className="mt-4 flex max-w-3xl gap-2 rounded-xl bg-white p-3 text-sm">
        <LuInfo aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>
          <strong>Prototype.</strong> No real order or payment is processed, and your image isn’t sent to a printer. Sizes, finishes and prices are provisional
          until we’ve tested them with a supplier.
        </span>
      </p>
      {added && (
        <p role="status" className="mt-3 max-w-3xl rounded-xl note-success p-3 text-sm font-bold">
          Added {added} to your cart. You can make another one below.
        </p>
      )}

      <div className="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
        {/* Preview */}
        <div className="lg:sticky lg:top-24">
          <CustomStickerPreview image={image} shape={shape} scale={size.previewScale} surface={surface} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div role="radiogroup" aria-label="Preview background" className="inline-flex rounded-full border-2 border-ink/15 bg-white p-0.5 text-sm">
              {(['laptop', 'plain'] as const).map((s) => (
                <label key={s} className={`relative cursor-pointer rounded-full px-3 py-1 font-bold has-[:focus-visible]:outline-2 ${surface === s ? 'bg-ink text-paper' : ''}`}>
                  <input type="radio" name="surface" className="sr-only" checked={surface === s} onChange={() => setSurface(s)} />
                  {s === 'laptop' ? 'On a laptop' : 'Plain'}
                </label>
              ))}
            </div>
            <p className="text-xs text-ink-soft">Preview size shows {size.label} relative to Large.</p>
          </div>
          <p className="mt-2 text-xs text-ink-soft">
            The white border is a simulation to show the idea — not a production cut line, and not proof of print quality or colours.
          </p>
        </div>

        {/* Configuration */}
        <div className="space-y-4">
          <Section n={1} title="Your image" hint={image ? undefined : 'Upload a file or paste a direct image link.'}>
            {image && !replacing ? (
              <div>
                <div className="flex items-center gap-3 rounded-xl bg-paper p-2">
                  <img src={imageSrc(image)} alt="" referrerPolicy="no-referrer" className="size-14 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate font-bold">{image.source === 'upload' ? image.fileName : 'Image from a link'}</p>
                    <p className="text-ink-soft">
                      {image.width} × {image.height} px · {image.source === 'upload' ? 'on this device (temporary)' : 'shown from its website, not stored'}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {image.source === 'upload' && (
                    <button type="button" onClick={() => setEditing((open) => !open)} className="btn-primary px-4 py-2">
                      <LuCrop aria-hidden /> {editing ? 'Close editor' : 'Edit image & add text'}
                    </button>
                  )}
                  <button type="button" onClick={() => { setEditing(false); setReplacing(true); }} className="btn-ghost px-4 py-2">
                    <LuRefreshCw aria-hidden /> Replace image
                  </button>
                  <button type="button" onClick={removeImage} className="btn px-4 py-2 text-ink-soft hover:text-ink">
                    <LuTrash2 aria-hidden /> Remove
                  </button>
                </div>
                {editing && image.source === 'upload' && (
                  <CustomStickerEditor
                    image={originalHeld.current?.source === 'upload' ? originalHeld.current : image}
                    onClose={() => setEditing(false)}
                    onApply={(blob, width, height) => {
                      const editedUrl = objectUrls.create(blob);
                      const baseName = image.fileName.replace(/\.[^.]+$/, '');
                      const editedImage: PickedImage = {
                        source: 'upload',
                        objectUrl: editedUrl,
                        fileName: 'edited-' + baseName + '.png',
                        width,
                        height,
                      };
                      release(held.current);
                      held.current = editedImage;
                      setImage(editedImage);
                      setEditing(false);
                      setAdded(null);
                    }}
                  />
                )}
                {image.source === 'url' && (
                  <p className="mt-3 rounded-lg bg-paper p-3 text-xs text-ink-soft">
                    Crop, rotate and text editing are available for uploaded files. External image links may block browser-based editing, so upload the image from your device to personalise it.
                  </p>
                )}
                {lowRes && (
                  <p role="status" className="mt-3 flex gap-2 rounded-xl border-2 border-tomato/40 bg-tomato/10 p-3 text-sm">
                    <LuTriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                    This image is quite small ({image.width} × {image.height} px), so the sticker may look blurry. A larger image will print more sharply.
                  </p>
                )}
              </div>
            ) : (
              <div>
                <ImageSourcePicker onPick={chooseImage} label="Sticker image source" />
                {replacing && (
                  <button type="button" onClick={() => setReplacing(false)} className="mt-3 text-sm font-bold underline underline-offset-4">
                    Keep the current image
                  </button>
                )}
              </div>
            )}
          </Section>

          <Section n={2} title="Shape" hint="Changes the preview straight away.">
            <OptionCards<CustomStickerShape> name="Sticker shape" value={shape} onChange={setShape} options={customStickerShapes.map((s) => ({ id: s.id, title: s.label, sub: s.hint }))} />
          </Section>

          <Section n={3} title="Size" hint="Exact measurements will be confirmed once we’ve chosen a printer.">
            <OptionCards
              name="Sticker size"
              value={sizeId}
              onChange={setSizeId}
              options={customStickerSizes.map((s) => ({
                id: s.id,
                title: s.label,
                sub: s.dimensions ?? 'Size to be confirmed',
                extra: `${formatPrice(s.unitPrice)} each`,
              }))}
            />
          </Section>

          <Section n={4} title="Finish" hint="Provisional — depends on what our printer can offer.">
            <OptionCards
              name="Sticker finish"
              value={finishId}
              onChange={setFinishId}
              columns={2}
              options={customStickerFinishes.map((f) => ({
                id: f.id,
                title: f.label,
                sub: f.description,
                extra: f.surcharge ? `+${formatPrice(f.surcharge)} each` : 'No extra cost',
              }))}
            />
          </Section>

          <Section n={5} title="Quantity" hint={`How many stickers of this design (1–${CUSTOM_STICKER_MAX_QTY}).`}>
            <QuantitySelector label="Number of stickers" value={quantity} onChange={setQuantity} />
          </Section>

          {/* Summary */}
          <section aria-labelledby="sticker-summary" className="rounded-[var(--radius-card)] border-2 border-ink bg-white p-4 sm:p-5">
            <h2 id="sticker-summary" className="font-display text-xl font-extrabold">
              Summary
            </h2>
            <dl className="mt-3 space-y-1.5 text-sm">
              {[
                ['Image', image ? (image.source === 'upload' ? 'Your upload' : 'Image link') : 'Not added yet'],
                ['Shape', customStickerShapes.find((s) => s.id === shape)?.label],
                ['Size', `${size.label} (${size.dimensions ?? 'size to be confirmed'})`],
                ['Finish', finish.label],
                ['Per sticker', unit !== null ? formatPrice(unit) : '—'],
                ['Quantity', String(quantity)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-ink-soft">{k}</dt>
                  <dd className="text-right font-bold">{v}</dd>
                </div>
              ))}
              <div className="flex justify-between border-t-2 border-ink pt-2 text-base">
                <dt className="font-bold">Estimated total</dt>
                <dd className="font-display text-2xl font-extrabold tabular-nums" aria-live="polite">
                  {total !== null ? formatPrice(total) : '—'}
                </dd>
              </div>
            </dl>
            <p className="mt-1 text-xs text-ink-soft">Prototype estimate from test prices. No delivery charges or discounts are included.</p>

            <div className="mt-4 rounded-xl bg-paper p-3">
              <label className="flex cursor-pointer gap-2.5 text-sm">
                <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-ink" />
                <span className="font-bold">I confirm that I own this image or have permission to reproduce it.</span>
              </label>
              <p className="mt-2 text-xs text-ink-soft">
                Images found on Pinterest, Google or social media usually belong to someone else — finding them online doesn’t give permission to print them.
              </p>
            </div>

            <button type="button" onClick={add} disabled={Boolean(problem)} className="btn-primary mt-4 w-full py-4 text-base" aria-describedby={problem ? 'sticker-problem' : undefined}>
              <LuShoppingBag aria-hidden /> Add to cart{total !== null ? ` · ${formatPrice(total)}` : ''}
            </button>
            {problem && (
              <p id="sticker-problem" className="mt-2 text-center text-sm text-ink-soft">
                {problem}
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
