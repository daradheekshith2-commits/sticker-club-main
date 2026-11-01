import { useId } from 'react';
import type { ImageFit } from '../../types/wall';

/**
 * How the customer's image sits in its poster. These controls change the
 * preview directly (CSS object-fit / object-position) — nothing hidden.
 */
export function ImageCropControls({ fit, onChange }: { fit: ImageFit; onChange: (fit: ImageFit) => void }) {
  const id = useId();
  const cover = fit.mode === 'cover';
  return (
    <fieldset className="min-w-0 rounded-2xl border-2 border-ink/10 p-3">
      <legend className="px-1 text-sm font-bold">Fit in the poster</legend>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Fit">
        {(
          [
            { mode: 'cover', label: 'Fill poster', hint: 'Edges may be trimmed' },
            { mode: 'contain', label: 'Show whole image', hint: 'May leave borders' },
          ] as const
        ).map((o) => (
          <label
            key={o.mode}
            className={`cursor-pointer rounded-xl border-2 px-3 py-2 text-sm has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ink ${fit.mode === o.mode ? 'border-ink bg-lime' : 'border-ink/15 bg-white'}`}
          >
            <input type="radio" name={`${id}-fit`} className="sr-only" checked={fit.mode === o.mode} onChange={() => onChange({ ...fit, mode: o.mode })} />
            <span className="block font-bold">{o.label}</span>
            <span className="block text-xs text-ink-soft">{o.hint}</span>
          </label>
        ))}
      </div>
      {cover && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-bold">Left ↔ right</span>
            <input type="range" min={0} max={100} value={fit.focusX} onChange={(e) => onChange({ ...fit, focusX: Number(e.target.value) })} className="w-full accent-ink" aria-label="Horizontal position" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-bold">Top ↕ bottom</span>
            <input type="range" min={0} max={100} value={fit.focusY} onChange={(e) => onChange({ ...fit, focusY: Number(e.target.value) })} className="w-full accent-ink" aria-label="Vertical position" />
          </label>
        </div>
      )}
      {cover && (fit.focusX !== 50 || fit.focusY !== 50) && (
        <button type="button" onClick={() => onChange({ ...fit, focusX: 50, focusY: 50 })} className="mt-2 text-xs font-bold underline underline-offset-4">
          Re-centre
        </button>
      )}
    </fieldset>
  );
}
