import { useId, useRef, useState, type DragEvent } from 'react';
import { LuUpload } from 'react-icons/lu';
import { ACCEPT_ATTRIBUTE, loadImage, MAX_UPLOAD_BYTES, validateImageFile } from '../../utils/imageSource';
import { objectUrls } from '../../utils/objectUrls';
import type { PickedImage } from '../../types/image';

/**
 * Pick or drop a photo from this device. The file never leaves the browser:
 * it becomes a temporary blob: URL that disappears on refresh.
 * The caller becomes responsible for releasing the URL (objectUrls.release).
 */
export function ImageUploader({ onPick }: { onPick: (img: Extract<PickedImage, { source: 'upload' }>) => void }) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    // Checks the file's real MIME type and size, not just its name.
    const check = validateImageFile(file);
    if (!check.ok) {
      setError(check.message);
      return;
    }
    setBusy(true);
    const url = objectUrls.create(file);
    try {
      const { width, height } = await loadImage(url);
      onPick({ source: 'upload', objectUrl: url, fileName: file.name, width, height });
    } catch {
      objectUrls.release(url);
      setError(`We couldn’t open “${file.name}”. It may be damaged or not really an image.`);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = ''; // allow picking the same file again
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-7 text-center transition-colors ${
          dragging ? 'border-ink bg-lime/40' : 'border-ink/25 bg-white'
        }`}
      >
        <LuUpload aria-hidden className="size-6" />
        <p className="font-bold">{busy ? 'Opening image…' : 'Drag and drop an image here'}</p>
        <p className="text-xs text-ink-soft">or</p>
        <label className="btn-primary relative cursor-pointer px-4 py-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink">
          Choose a file
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            className="sr-only"
            onChange={(e) => void handleFile(e.target.files?.[0])}
            aria-describedby={error ? `${inputId}-error` : undefined}
          />
        </label>
        <p className="text-xs text-ink-soft">JPG, PNG or WebP · up to {MAX_UPLOAD_BYTES / 1024 / 1024} MB</p>
      </div>
      {error && (
        <p id={`${inputId}-error`} role="alert" className="mt-2 text-sm font-bold text-danger">
          {error}
        </p>
      )}
      <p className="mt-2 text-xs text-ink-soft">
        Your image stays on this device. It isn’t sent to any printing service in this prototype, and it’s cleared if you refresh the page.
      </p>
    </div>
  );
}
