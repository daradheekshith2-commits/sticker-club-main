import { useId, useState, type FormEvent } from 'react';
import { LuLink } from 'react-icons/lu';
import {
  NOT_DIRECT_IMAGE_MESSAGE,
  resolveImageUrl,
  URL_GUIDANCE,
  URL_PAGE_EXPLANATION,
  validateImageUrl,
  type ResolvedImage,
} from '../../utils/imageSource';
import type { PickedImage } from '../../types/image';

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string; hint?: string }
  | { kind: 'ready'; image: ResolvedImage };

/**
 * Paste a link that points straight at an image. We check the link, ask the
 * browser to load it, and only offer "Use this image" once it really loaded.
 * The image is shown from its original address; we never download or keep a copy.
 */
export function ImageUrlInput({ onPick }: { onPick: (img: Extract<PickedImage, { source: 'url' }>) => void }) {
  const id = useId();
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  async function preview(e: FormEvent) {
    e.preventDefault();
    const check = validateImageUrl(value);
    if (!check.ok) {
      setStatus({ kind: 'error', message: check.message, hint: check.hint });
      return;
    }
    setStatus({ kind: 'loading' });
    try {
      const image = await resolveImageUrl(check.url);
      setStatus({ kind: 'ready', image });
    } catch (err) {
      const timedOut = err instanceof Error && err.message === 'timeout';
      setStatus({
        kind: 'error',
        message: NOT_DIRECT_IMAGE_MESSAGE,
        hint: timedOut
          ? 'The link took too long to respond.'
          : 'If the image opens in your browser, its website may block showing it elsewhere — upload the image file instead.',
      });
    }
  }

  return (
    <div>
      <form onSubmit={preview} noValidate>
        <label htmlFor={id} className="field-label">
          Image link
        </label>
        <p id={`${id}-guide`} className="mb-2 text-sm">
          {URL_GUIDANCE}
        </p>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <LuLink aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-soft" />
            <input
              id={id}
              type="url"
              inputMode="url"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (status.kind !== 'loading') setStatus({ kind: 'idle' });
              }}
              placeholder="https://example.com/image.jpg"
              aria-invalid={status.kind === 'error' || undefined}
              aria-describedby={`${id}-guide ${id}-help${status.kind === 'error' ? ` ${id}-error` : ''}`}
              className="w-full rounded-xl border-2 border-ink/20 bg-white py-2.5 pr-3 pl-9 text-sm outline-none focus:border-ink"
            />
          </div>
          <button type="submit" className="btn-primary shrink-0 px-4 py-2.5" disabled={status.kind === 'loading'}>
            {status.kind === 'loading' ? 'Checking…' : 'Preview'}
          </button>
        </div>
      </form>

      <p id={`${id}-help`} className="mt-2 text-xs text-ink-soft">
        {URL_PAGE_EXPLANATION}
      </p>

      <div aria-live="polite">
        {status.kind === 'loading' && <p className="mt-3 text-sm text-ink-soft">Loading the image from its website…</p>}
        {status.kind === 'error' && (
          <div id={`${id}-error`} role="alert" className="mt-3 rounded-xl border-2 border-[#b42318]/30 bg-[#b42318]/5 p-3 text-sm text-danger">
            <p className="font-bold">{status.message}</p>
            {status.hint && <p className="mt-1">{status.hint}</p>}
          </div>
        )}
        {status.kind === 'ready' && (
          <div className="mt-3 flex items-center gap-3 rounded-xl border-2 border-ink/15 bg-white p-2">
            {/* Rendered only after the browser confirmed it loads, so no broken-image icon. */}
            <img src={status.image.src} alt="Preview of the linked image" referrerPolicy="no-referrer" className="size-16 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-bold">Image found</p>
              <p className="text-ink-soft">
                {status.image.width} × {status.image.height} px
              </p>
            </div>
            <button
              type="button"
              className="btn-accent shrink-0 px-4 py-2"
              onClick={() => {
                onPick({ source: 'url', url: status.image.src, width: status.image.width, height: status.image.height });
                setValue('');
                setStatus({ kind: 'idle' });
              }}
            >
              Use this image
            </button>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-ink-soft">
        The image is displayed from its original website and isn’t stored by this prototype. If that site removes it or blocks it, it will stop showing here.
      </p>
    </div>
  );
}
