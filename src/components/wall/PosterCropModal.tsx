import { useEffect, useState, useCallback } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import {
  LuCheck,
  LuMaximize,
  LuMinimize,
  LuRefreshCw,
  LuRotateCcw,
  LuRotateCw,
  LuTriangleAlert,
  LuX,
  LuZoomIn,
  LuZoomOut,
} from 'react-icons/lu';
import { paperSizes, type PaperSizeId } from '../../data/wallLayouts';
import type { PosterCropEdit, SlotFill } from '../../types/wall';
import {
  calculatePrintQuality,
  getAspectValue,
  getCroppedImg,
  type CropAspectOption,
} from '../../utils/cropImage';

interface PosterCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  fill: SlotFill;
  slot: {
    id: string;
    number: number;
    size: PaperSizeId;
    orientation?: 'portrait' | 'landscape';
    w: number;
    h: number;
  };
  imageSrc: string;
  imageAlt?: string;
  onApply: (edit: PosterCropEdit) => void;
}

export function PosterCropModal({
  isOpen,
  onClose,
  fill,
  slot,
  imageSrc,
  imageAlt: _imageAlt,
  onApply,
}: PosterCropModalProps) {
  const orientation = slot.orientation ?? 'portrait';
  const size = slot.size;

  // Stored or default values
  const initialCrop: Point = fill.edit?.crop ?? { x: 0, y: 0 };
  const initialZoom = fill.edit?.zoom ?? 1;
  const initialRotation = fill.edit?.rotation ?? 0;
  const initialAspectMode: CropAspectOption['id'] = fill.edit?.aspectMode ?? 'sheet';
  const initialFitMode = fill.edit?.mode ?? fill.fit?.mode ?? 'cover';

  const [crop, setCrop] = useState<Point>(initialCrop);
  const [zoom, setZoom] = useState<number>(initialZoom);
  const [rotation, setRotation] = useState<number>(initialRotation);
  const [aspectMode, setAspectMode] = useState<CropAspectOption['id']>(initialAspectMode);
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>(initialFitMode);
  const [freeRatio, setFreeRatio] = useState<number>(1);
  const [croppedAreaPercent, setCroppedAreaPercent] = useState<Area | null>(fill.edit?.croppedArea ?? null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(fill.edit?.croppedAreaPixels ?? null);
  const [mediaDimensions, setMediaDimensions] = useState<{ width: number; height: number } | null>(null);
  const [applying, setApplying] = useState(false);

  // Sync state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setCrop(fill.edit?.crop ?? { x: 0, y: 0 });
      setZoom(fill.edit?.zoom ?? 1);
      setRotation(fill.edit?.rotation ?? 0);
      setAspectMode(fill.edit?.aspectMode ?? 'sheet');
      setFitMode(fill.edit?.mode ?? fill.fit?.mode ?? 'cover');
      setCroppedAreaPercent(fill.edit?.croppedArea ?? null);
      setCroppedAreaPixels(fill.edit?.croppedAreaPixels ?? null);
    }
  }, [isOpen, fill]);

  // Lock body scroll while modal is active
  useEffect(() => {
    if (isOpen) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = origOverflow;
      };
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPx: Area) => {
    setCroppedAreaPercent(croppedArea);
    setCroppedAreaPixels(croppedAreaPx);
  }, []);

  const onMediaLoaded = useCallback((mediaSize: { width: number; height: number; naturalWidth: number; naturalHeight: number }) => {
    setMediaDimensions({ width: mediaSize.naturalWidth, height: mediaSize.naturalHeight });
  }, []);

  if (!isOpen) return null;

  const currentAspect = getAspectValue(aspectMode, size, orientation, freeRatio);

  // Print quality analysis
  const sourceW = mediaDimensions?.width ?? (fill.source === 'upload' ? fill.width : fill.source === 'url' ? fill.width : undefined);
  const sourceH = mediaDimensions?.height ?? (fill.source === 'upload' ? fill.height : fill.source === 'url' ? fill.height : undefined);
  const quality = calculatePrintQuality(sourceW, sourceH, croppedAreaPercent ?? undefined, size, orientation);

  const handleApply = async () => {
    setApplying(true);
    try {
      let previewUrl: string | null = null;
      if (croppedAreaPixels) {
        previewUrl = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      }

      const editData: PosterCropEdit = {
        crop,
        zoom,
        rotation,
        aspectRatio: currentAspect,
        aspectMode,
        mode: fitMode,
        croppedArea: croppedAreaPercent ?? undefined,
        croppedAreaPixels: croppedAreaPixels ?? undefined,
        previewUrl,
      };

      onApply(editData);
      onClose();
    } catch (err) {
      console.warn('Error generating crop preview:', err);
      // Fallback: apply edit with CSS coordinates even if canvas export had error
      onApply({
        crop,
        zoom,
        rotation,
        aspectRatio: currentAspect,
        aspectMode,
        mode: fitMode,
        croppedArea: croppedAreaPercent ?? undefined,
        croppedAreaPixels: croppedAreaPixels ?? undefined,
      });
      onClose();
    } finally {
      setApplying(false);
    }
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setAspectMode('sheet');
    setFitMode('cover');
  };

  const handleRotateCw = () => setRotation((prev) => (prev + 90) % 360);
  const handleRotateCcw = () => setRotation((prev) => (prev - 90 + 360) % 360);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
    >
      <div className="relative flex max-h-[95vh] w-full max-w-4xl flex-col rounded-2xl border-2 border-ink/20 bg-[#071B18] text-[#F4F0E8] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-ink/15 px-4 py-3 sm:px-6">
          <div>
            <h2 id="crop-modal-title" className="font-display text-lg font-bold sm:text-xl text-ink">
              Crop & Edit Position {slot.number} · {paperSizes[size].label}
            </h2>
            <p className="text-xs text-ink-soft">
              {slot.w} × {slot.h} cm ({orientation}) · Adjust zoom, crop frame and orientation
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full border border-ink/20 bg-[#0B2420] text-ink hover:bg-lime hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <LuX className="size-5" />
          </button>
        </div>

        {/* Interactive Cropper Area */}
        <div className="relative h-[280px] sm:h-[400px] w-full bg-[#03110F] touch-none select-none">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={currentAspect}
            objectFit={fitMode}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            onMediaLoaded={onMediaLoaded}
            showGrid
            classes={{
              containerClassName: 'relative w-full h-full',
              cropAreaClassName: 'border-2 border-lime shadow-[0_0_0_9999px_rgba(3,17,15,0.7)]',
            }}
          />
        </div>

        {/* Modal Controls Bar */}
        <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-6 space-y-4 bg-[#0B2420] border-t border-ink/15">
          {/* Aspect Ratio Presets */}
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
              Aspect Ratio
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAspectMode('sheet')}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${
                  aspectMode === 'sheet'
                    ? 'bg-lime text-white ring-2 ring-lime/50'
                    : 'bg-[#071B18] text-ink border border-ink/20 hover:border-lime'
                }`}
              >
                Match Sheet ({paperSizes[size].label} {orientation === 'landscape' ? 'Landscape' : 'Portrait'})
              </button>
              <button
                type="button"
                onClick={() => setAspectMode('square')}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${
                  aspectMode === 'square'
                    ? 'bg-lime text-white ring-2 ring-lime/50'
                    : 'bg-[#071B18] text-ink border border-ink/20 hover:border-lime'
                }`}
              >
                1:1 Square
              </button>
              <button
                type="button"
                onClick={() => setAspectMode('4:5')}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${
                  aspectMode === '4:5'
                    ? 'bg-lime text-white ring-2 ring-lime/50'
                    : 'bg-[#071B18] text-ink border border-ink/20 hover:border-lime'
                }`}
              >
                4:5 Portrait
              </button>
              <button
                type="button"
                onClick={() => setAspectMode('16:9')}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${
                  aspectMode === '16:9'
                    ? 'bg-lime text-white ring-2 ring-lime/50'
                    : 'bg-[#071B18] text-ink border border-ink/20 hover:border-lime'
                }`}
              >
                16:9 Landscape
              </button>
              <button
                type="button"
                onClick={() => setAspectMode('free')}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${
                  aspectMode === 'free'
                    ? 'bg-lime text-white ring-2 ring-lime/50'
                    : 'bg-[#071B18] text-ink border border-ink/20 hover:border-lime'
                }`}
              >
                Freeform
              </button>
            </div>
            {aspectMode === 'free' && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-ink-soft">Custom proportion:</span>
                <input
                  type="range"
                  min="0.5"
                  max="2.2"
                  step="0.05"
                  value={freeRatio}
                  onChange={(e) => setFreeRatio(Number(e.target.value))}
                  className="w-36 accent-lime"
                  aria-label="Custom aspect ratio slider"
                />
                <span className="text-xs font-bold text-ink">{freeRatio.toFixed(2)} : 1</span>
              </div>
            )}
          </div>

          {/* Fit & Zoom & Rotation Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 border-t border-ink/10">
            {/* Fit vs Fill */}
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                Display Mode
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setFitMode('cover')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-bold transition-colors ${
                    fitMode === 'cover'
                      ? 'bg-lime text-white'
                      : 'bg-[#071B18] text-ink border border-ink/20 hover:border-lime'
                  }`}
                >
                  <LuMaximize className="size-3.5" /> Fill Poster
                </button>
                <button
                  type="button"
                  onClick={() => setFitMode('contain')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-bold transition-colors ${
                    fitMode === 'contain'
                      ? 'bg-lime text-white'
                      : 'bg-[#071B18] text-ink border border-ink/20 hover:border-lime'
                  }`}
                >
                  <LuMinimize className="size-3.5" /> Fit Entire
                </button>
              </div>
            </div>

            {/* Zoom Slider */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                <span>Zoom</span>
                <span className="text-ink">{Math.round(zoom * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(1, Number((z - 0.2).toFixed(1))))}
                  disabled={zoom <= 1}
                  className="grid size-8 shrink-0 place-items-center rounded-lg border border-ink/20 bg-[#071B18] text-ink disabled:opacity-30 hover:border-lime"
                  aria-label="Zoom out"
                >
                  <LuZoomOut className="size-4" />
                </button>
                <input
                  type="range"
                  min="1"
                  max="4"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-lime"
                  aria-label="Zoom level"
                />
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(4, Number((z + 0.2).toFixed(1))))}
                  disabled={zoom >= 4}
                  className="grid size-8 shrink-0 place-items-center rounded-lg border border-ink/20 bg-[#071B18] text-ink disabled:opacity-30 hover:border-lime"
                  aria-label="Zoom in"
                >
                  <LuZoomIn className="size-4" />
                </button>
              </div>
            </div>

            {/* Rotation Controls */}
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                Rotation: {rotation}°
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRotateCcw}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-ink/20 bg-[#071B18] py-2 text-xs font-bold text-ink hover:border-lime transition-colors"
                >
                  <LuRotateCcw className="size-3.5" /> 90° CCW
                </button>
                <button
                  type="button"
                  onClick={handleRotateCw}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-ink/20 bg-[#071B18] py-2 text-xs font-bold text-ink hover:border-lime transition-colors"
                >
                  <LuRotateCw className="size-3.5" /> 90° CW
                </button>
              </div>
            </div>
          </div>

          {/* Quality Indicator & Warnings */}
          <div className="rounded-xl border border-ink/10 bg-[#071B18] p-2.5 sm:p-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`size-2.5 rounded-full ${
                    quality.qualityLevel === 'excellent'
                      ? 'bg-[#A8F0DC]'
                      : quality.qualityLevel === 'good'
                        ? 'bg-[#FFD447]'
                        : 'bg-[#FF5B2E]'
                  }`}
                />
                <span className="font-bold text-ink">
                  {quality.qualityLevel === 'excellent'
                    ? '300 DPI Archival Print Quality'
                    : quality.qualityLevel === 'good'
                      ? 'Standard Print Clarity'
                      : 'Low Effective Resolution'}
                </span>
                {quality.dpi > 0 && <span className="text-ink-soft">({quality.dpi} DPI estimated)</span>}
              </div>
              {sourceW && sourceH && (
                <span className="text-ink-soft">
                  Source: {sourceW} × {sourceH} px
                </span>
              )}
            </div>

            {quality.isLowRes && (
              <p className="mt-1.5 flex items-start gap-1.5 text-tomato text-[11px] font-medium leading-relaxed">
                <LuTriangleAlert className="size-3.5 shrink-0 mt-0.5" />
                <span>
                  Cropping very tightly may result in a softer print on {paperSizes[size].label}. Consider zooming out slightly or uploading a higher-resolution file for pin-sharp print output.
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between border-t border-ink/15 bg-[#071B18] px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-bold text-ink-soft hover:text-ink transition-colors"
          >
            <LuRefreshCw className="size-3.5" /> Reset All
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={applying}
              className="rounded-xl border border-ink/20 bg-transparent px-4 py-2 text-sm font-bold text-ink hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={applying}
              className="flex items-center gap-2 rounded-xl bg-lime px-5 py-2 text-sm font-bold text-white shadow hover:opacity-90 transition-opacity"
            >
              <LuCheck className="size-4" />
              {applying ? 'Applying…' : 'Apply Crop & Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
