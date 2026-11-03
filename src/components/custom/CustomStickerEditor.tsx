import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from 'react';
import {
  LuCheck, LuCopy, LuCrop, LuRedo2, LuRefreshCw, LuRotateCcw, LuRotateCw,
  LuSlidersHorizontal, LuTrash2, LuType, LuUndo2, LuUpload, LuX, LuZoomIn,
} from 'react-icons/lu';
import type { PickedImage } from '../../types/image';
import { cropExportDimensions } from '../../utils/cropGeometry';

const CANVAS_SIZE = 720;
const EXPORT_SIZE = 1200;
const BUILT_IN_FONTS = [
  { family: 'Bricolage Grotesque', label: 'Bricolage Grotesque' },
  { family: 'DM Sans', label: 'DM Sans' },
  { family: 'Anton', label: 'Anton' },
  { family: 'Georgia', label: 'Georgia' },
  { family: 'Trebuchet MS', label: 'Trebuchet MS' },
  { family: 'Courier New', label: 'Courier New' },
];
const SUGGESTIONS = ['CHAI FIRST', 'GOOD DAYS ONLY', 'STAY WEIRD', 'DREAM BIG', 'MADE WITH LOVE', 'KEEP GOING', 'ONE OF ONE'];

type CropRatio = 'free' | 'square' | 'portrait' | 'landscape' | 'custom';
type TextLayer = {
  id: string;
  text: string;
  x: number;
  y: number;
  fontFamily: string;
  fontSize: number;
  color: string;
  align: CanvasTextAlign;
  rotation: number;
  bold: boolean;
  outline: boolean;
  outlineColor: string;
  shadow: boolean;
};
type EditorState = {
  rotation: number;
  zoom: number;
  panX: number;
  panY: number;
  ratio: CropRatio;
  customCrop: CropRect;
  layers: TextLayer[];
};
type CropRect = { x: number; y: number; width: number; height: number };
type FontChoice = { family: string; label: string };
type DragState =
  | { kind: 'image'; pointerX: number; pointerY: number; panX: number; panY: number }
  | { kind: 'text'; pointerX: number; pointerY: number; layerId: string; x: number; y: number };

const makeInitialEditor = (): EditorState => ({
  rotation: 0,
  zoom: 1,
  panX: 0,
  panY: 0,
  ratio: 'free',
  customCrop: { x: 72, y: 72, width: 576, height: 576 },
  layers: [],
});

function cropRect(ratio: CropRatio, image: HTMLImageElement, rotation: number, custom?: CropRect): CropRect {
  if (ratio === 'custom' || ratio === 'free') return custom ?? { x: 72, y: 72, width: 576, height: 576 };
  if (ratio === 'portrait') return { x: 96, y: 36, width: 528, height: 648 };
  if (ratio === 'landscape') return { x: 36, y: 175, width: 648, height: 365 };
  if (ratio === 'square') return { x: 36, y: 36, width: 648, height: 648 };

  const rotated = Math.abs(rotation % 180) === 90;
  const imageWidth = rotated ? image.height : image.width;
  const imageHeight = rotated ? image.width : image.height;
  const safeRatio = Math.max(0.35, Math.min(2.8, imageWidth / imageHeight));
  if (safeRatio >= 1) {
    const height = CANVAS_SIZE / safeRatio;
    return { x: 0, y: (CANVAS_SIZE - height) / 2, width: CANVAS_SIZE, height };
  }
  const width = CANVAS_SIZE * safeRatio;
  return { x: (CANVAS_SIZE - width) / 2, y: 0, width, height: CANVAS_SIZE };
}

function wrappedLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const result: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      result.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      const next = line ? line + ' ' + word : word;
      if (line && ctx.measureText(next).width > maxWidth) {
        result.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    result.push(line);
  }
  return result.length ? result : [''];
}

function layerMetrics(ctx: CanvasRenderingContext2D, layer: TextLayer, maxWidth: number) {
  ctx.font = (layer.bold ? '800 ' : '500 ') + layer.fontSize + 'px "' + layer.fontFamily + '"';
  const lines = wrappedLines(ctx, layer.text || ' ', maxWidth);
  const width = Math.max(24, ...lines.map((line) => ctx.measureText(line).width));
  const lineHeight = layer.fontSize * 1.18;
  return { lines, width, height: lines.length * lineHeight, lineHeight };
}

function drawComposition(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  state: EditorState,
  selectedId: string | null,
  outputScale = 1,
) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, CANVAS_SIZE * outputScale, CANVAS_SIZE * outputScale);
  ctx.save();
  ctx.scale(outputScale, outputScale);

  const crop = cropRect(state.ratio, image, state.rotation, state.customCrop);
  ctx.save();
  ctx.beginPath();
  ctx.rect(crop.x, crop.y, crop.width, crop.height);
  ctx.clip();

  const rotated = Math.abs(state.rotation % 180) === 90;
  const imageWidth = rotated ? image.height : image.width;
  const imageHeight = rotated ? image.width : image.height;
  const fitScale = Math.max(crop.width / imageWidth, crop.height / imageHeight);
  ctx.translate(CANVAS_SIZE / 2 + state.panX, CANVAS_SIZE / 2 + state.panY);
  ctx.rotate((state.rotation * Math.PI) / 180);
  ctx.scale(fitScale * state.zoom, fitScale * state.zoom);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);
  ctx.restore();

  for (const layer of state.layers) {
    ctx.save();
    const x = crop.x + layer.x * crop.width;
    const y = crop.y + layer.y * crop.height;
    const metrics = layerMetrics(ctx, layer, crop.width * 0.9);
    ctx.translate(x, y);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.textAlign = layer.align;
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.fillStyle = layer.color;
    ctx.strokeStyle = layer.outlineColor;
    ctx.lineWidth = Math.max(2, layer.fontSize * 0.075);
    ctx.shadowColor = layer.shadow ? 'rgba(0,0,0,0.42)' : 'transparent';
    ctx.shadowBlur = layer.shadow ? 9 : 0;
    ctx.shadowOffsetX = layer.shadow ? 2 : 0;
    ctx.shadowOffsetY = layer.shadow ? 3 : 0;

    metrics.lines.forEach((line, index) => {
      const lineY = (index - (metrics.lines.length - 1) / 2) * metrics.lineHeight;
      if (layer.outline) ctx.strokeText(line, 0, lineY);
      ctx.fillText(line, 0, lineY, crop.width * 0.9);
    });

    if (selectedId === layer.id) {
      const left = layer.align === 'left' ? 0 : layer.align === 'right' ? -metrics.width : -metrics.width / 2;
      ctx.save();
      ctx.shadowColor = 'transparent';
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#a8f0dc';
      ctx.setLineDash([7, 5]);
      ctx.strokeRect(left - 8, -metrics.height / 2 - 7, metrics.width + 16, metrics.height + 14);
      ctx.restore();
    }
    ctx.restore();
  }

  ctx.restore();
}

function findTextLayerAt(
  ctx: CanvasRenderingContext2D,
  layers: TextLayer[],
  crop: CropRect,
  pointX: number,
  pointY: number,
): TextLayer | undefined {
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    const layer = layers[index];
    const metrics = layerMetrics(ctx, layer, crop.width * 0.9);
    const x = crop.x + layer.x * crop.width;
    const y = crop.y + layer.y * crop.height;
    const left = layer.align === 'left' ? x : layer.align === 'right' ? x - metrics.width : x - metrics.width / 2;
    const top = y - metrics.height / 2;
    if (pointX >= left - 16 && pointX <= left + metrics.width + 16 && pointY >= top - 14 && pointY <= top + metrics.height + 14) return layer;
  }
  return undefined;
}

export function CustomStickerEditor({
  image,
  onApply,
  onClose,
}: {
  image: Extract<PickedImage, { source: 'upload' }>;
  onApply: (blob: Blob, width: number, height: number) => void;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const fontFacesRef = useRef<Array<{ face: FontFace; url: string }>>([]);
  const editorInitial = makeInitialEditor();
  const [editor, setEditor] = useState<EditorState>(editorInitial);
  const editorRef = useRef<EditorState>(editorInitial);
  const historyRef = useRef<EditorState[]>([editorInitial]);
  const historyIndexRef = useRef(0);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'crop' | 'straighten' | 'rotate' | 'zoom' | 'text'>('crop');
  const [customFonts, setCustomFonts] = useState<FontChoice[]>([]);
  const [fontError, setFontError] = useState('');
  const [fontRevision, setFontRevision] = useState(0);
  const [imageReady, setImageReady] = useState(false);
  const [imageError, setImageError] = useState('');
  const [busy, setBusy] = useState(false);
  const [applyError, setApplyError] = useState('');
  const cropDragRef = useRef<{ x: number; y: number; rect: CropRect; handle: string } | null>(null);

  const selectedLayer = editor.layers.find((layer) => layer.id === selectedLayerId) ?? null;
  const hasUndo = historyIndex > 0;
  const hasRedo = historyIndex < historyRef.current.length - 1;

  useEffect(() => {
    let active = true;
    const loaded = new Image();
    loaded.onload = () => {
      if (!active) return;
      imageRef.current = loaded;
      setImageReady(true);
      setImageError('');
    };
    loaded.onerror = () => {
      if (active) setImageError('This image could not be opened in the editor. Try uploading it again.');
    };
    loaded.src = image.objectUrl;
    return () => {
      active = false;
      loaded.onload = null;
      loaded.onerror = null;
    };
  }, [image.objectUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const source = imageRef.current;
    if (!canvas || !source || !imageReady) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setImageError('Your browser could not open the image editor.');
      return;
    }
    drawComposition(ctx, source, editor, selectedLayerId);
  }, [editor, selectedLayerId, imageReady, fontRevision]);

  useEffect(() => () => {
    for (const item of fontFacesRef.current) {
      document.fonts.delete(item.face);
      URL.revokeObjectURL(item.url);
    }
  }, []);

  function commit(next: EditorState) {
    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    nextHistory.push(next);
    if (nextHistory.length > 40) nextHistory.shift();
    historyRef.current = nextHistory;
    const nextIndex = nextHistory.length - 1;
    historyIndexRef.current = nextIndex;
    setHistoryIndex(nextIndex);
    editorRef.current = next;
    setEditor(next);
  }

  function updateLive(next: EditorState) {
    editorRef.current = next;
    setEditor(next);
  }

  function commitCurrent() {
    const current = editorRef.current;
    const previous = historyRef.current[historyIndexRef.current];
    if (JSON.stringify(current) === JSON.stringify(previous)) return;
    commit(current);
  }

  function undo() {
    if (historyIndexRef.current <= 0) return;
    const nextIndex = historyIndexRef.current - 1;
    historyIndexRef.current = nextIndex;
    setHistoryIndex(nextIndex);
    editorRef.current = historyRef.current[nextIndex];
    setEditor(historyRef.current[nextIndex]);
  }

  function redo() {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    const nextIndex = historyIndexRef.current + 1;
    historyIndexRef.current = nextIndex;
    setHistoryIndex(nextIndex);
    editorRef.current = historyRef.current[nextIndex];
    setEditor(historyRef.current[nextIndex]);
  }

  function updateSelected(patch: Partial<TextLayer>) {
    if (!selectedLayerId) return;
    const next = {
      ...editorRef.current,
      layers: editorRef.current.layers.map((layer) => layer.id === selectedLayerId ? { ...layer, ...patch } : layer),
    };
    commit(next);
  }

  function addText(text = 'Your text') {
    const id = 'text-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    const layer: TextLayer = {
      id,
      text,
      x: 0.5,
      y: 0.5,
      fontFamily: 'Anton',
      fontSize: 54,
      color: '#F4F0E8',
      align: 'center',
      rotation: 0,
      bold: true,
      outline: true,
      outlineColor: '#03110f',
      shadow: true,
    };
    commit({ ...editorRef.current, layers: [...editorRef.current.layers, layer] });
    setSelectedLayerId(id);
    setActiveTab('text');
  }

  function duplicateSelected() {
    if (!selectedLayer) return;
    const id = 'text-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    const copy = { ...selectedLayer, id, x: Math.min(0.92, selectedLayer.x + 0.04), y: Math.min(0.92, selectedLayer.y + 0.04) };
    commit({ ...editorRef.current, layers: [...editorRef.current.layers, copy] });
    setSelectedLayerId(id);
  }

  function deleteSelected() {
    if (!selectedLayerId) return;
    const remaining = editorRef.current.layers.filter((layer) => layer.id !== selectedLayerId);
    commit({ ...editorRef.current, layers: remaining });
    setSelectedLayerId(remaining.length ? remaining[remaining.length - 1].id : null);
  }

  async function uploadFont(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    setFontError('');
    if (!file) return;
    if (!/\.(ttf|otf|woff|woff2)$/i.test(file.name)) {
      setFontError('Choose a .ttf, .otf, .woff or .woff2 font file.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setFontError('Font files must be 8 MB or smaller.');
      return;
    }
    const url = URL.createObjectURL(file);
    const family = 'Sticker Custom ' + (customFonts.length + 1);
    const face = new FontFace(family, 'url(' + url + ')');
    try {
      await face.load();
      document.fonts.add(face);
      fontFacesRef.current.push({ face, url });
      setCustomFonts((fonts) => [...fonts, { family, label: file.name.replace(/\.[^.]+$/, '') }]);
      setFontRevision((n) => n + 1);
      if (selectedLayerId) updateSelected({ fontFamily: family });
    } catch {
      URL.revokeObjectURL(url);
      setFontError('That font could not be loaded. Try another font file.');
    }
  }

  function resetEditor() {
    const fresh = makeInitialEditor();
    commit(fresh);
    setSelectedLayerId(null);
  }

  function canvasPoint(event: ReactPointerEvent) {
    const container = containerRef.current ?? canvasRef.current;
    if (!container) return { x: 0, y: 0 };
    const bounds = container.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * CANVAS_SIZE,
      y: ((event.clientY - bounds.top) / bounds.height) * CANVAS_SIZE,
    };
  }

  function startDrag(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!imageReady || event.button !== 0) return;
    event.preventDefault();
    const point = canvasPoint(event);
    const source = imageRef.current;
    const ctx = canvasRef.current?.getContext('2d');
    if (!source || !ctx) return;
    const crop = cropRect(editorRef.current.ratio, source, editorRef.current.rotation, editorRef.current.customCrop);
    const layer = findTextLayerAt(ctx, editorRef.current.layers, crop, point.x, point.y);
    if (layer) {
      setSelectedLayerId(layer.id);
      setActiveTab('text');
      dragRef.current = { kind: 'text', pointerX: point.x, pointerY: point.y, layerId: layer.id, x: layer.x, y: layer.y };
    } else {
      setSelectedLayerId(null);
      dragRef.current = {
        kind: 'image',
        pointerX: point.x,
        pointerY: point.y,
        panX: editorRef.current.panX,
        panY: editorRef.current.panY,
      };
    }
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: ReactPointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    const source = imageRef.current;
    if (!drag || !source) return;
    const point = canvasPoint(event);
    const dx = point.x - drag.pointerX;
    const dy = point.y - drag.pointerY;
    if (drag.kind === 'image') {
      updateLive({
        ...editorRef.current,
        panX: Math.max(-420, Math.min(420, drag.panX + dx)),
        panY: Math.max(-420, Math.min(420, drag.panY + dy)),
      });
    } else {
      const crop = cropRect(editorRef.current.ratio, source, editorRef.current.rotation, editorRef.current.customCrop);
      updateLive({
        ...editorRef.current,
        layers: editorRef.current.layers.map((layer) => layer.id === drag.layerId
          ? { ...layer, x: Math.max(0.03, Math.min(0.97, drag.x + dx / crop.width)), y: Math.max(0.03, Math.min(0.97, drag.y + dy / crop.height)) }
          : layer),
      });
    }
  }

  function finishDrag(event?: ReactPointerEvent<HTMLCanvasElement>) {
    if (!dragRef.current) return;
    dragRef.current = null;
    if (event && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    commitCurrent();
  }

  // --- Corner Bracket Crop Handles Logic ---
  function cropHandleDown(handle: string, e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const source = imageRef.current;
    if (!source) return;
    const currentCrop = cropRect(editorRef.current.ratio, source, editorRef.current.rotation, editorRef.current.customCrop);
    const p = canvasPoint(e);
    cropDragRef.current = {
      x: p.x,
      y: p.y,
      rect: { ...currentCrop },
      handle,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function cropHandleMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = cropDragRef.current;
    if (!d) return;
    const p = canvasPoint(e);
    const dx = p.x - d.x;
    const dy = p.y - d.y;
    const min = 54;
    const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
    let { x, y, width, height } = d.rect;

    if (d.handle === 'move') {
      x = clamp(d.rect.x + dx, 0, CANVAS_SIZE - width);
      y = clamp(d.rect.y + dy, 0, CANVAS_SIZE - height);
    } else {
      if (d.handle.includes('w')) {
        x = clamp(d.rect.x + dx, 0, d.rect.x + d.rect.width - min);
        width = d.rect.x + d.rect.width - x;
      }
      if (d.handle.includes('e')) {
        width = clamp(d.rect.width + dx, min, CANVAS_SIZE - x);
      }
      if (d.handle.includes('n')) {
        y = clamp(d.rect.y + dy, 0, d.rect.y + d.rect.height - min);
        height = d.rect.y + d.rect.height - y;
      }
      if (d.handle.includes('s')) {
        height = clamp(d.rect.height + dy, min, CANVAS_SIZE - y);
      }
    }
    updateLive({ ...editorRef.current, ratio: 'custom', customCrop: { x, y, width, height } });
  }

  function cropHandleUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!cropDragRef.current) return;
    cropDragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    commitCurrent();
  }

  function setRatioPreset(ratio: CropRatio) {
    const source = imageRef.current;
    if (!source) return;
    if (ratio === 'square') {
      commit({ ...editorRef.current, ratio: 'square', customCrop: { x: 40, y: 40, width: 640, height: 640 } });
    } else if (ratio === 'portrait') {
      commit({ ...editorRef.current, ratio: 'portrait', customCrop: { x: 96, y: 36, width: 528, height: 648 } });
    } else if (ratio === 'landscape') {
      commit({ ...editorRef.current, ratio: 'landscape', customCrop: { x: 36, y: 175, width: 648, height: 365 } });
    } else {
      commit({ ...editorRef.current, ratio: 'free' });
    }
  }

  async function applyDesign() {
    const source = imageRef.current;
    if (!source || busy) return;
    setBusy(true);
    setApplyError('');
    try {
      await document.fonts.ready;
      const selectedCrop = cropRect(editorRef.current.ratio, source, editorRef.current.rotation, editorRef.current.customCrop);
      if (selectedCrop.width <= 0 || selectedCrop.height <= 0) throw new Error('Select a valid crop area.');
      const composition = document.createElement('canvas');
      composition.width = EXPORT_SIZE;
      composition.height = EXPORT_SIZE;
      const fullContext = composition.getContext('2d');
      if (!fullContext) throw new Error('Canvas is unavailable in this browser.');
      const scale = EXPORT_SIZE / CANVAS_SIZE;
      drawComposition(fullContext, source, editorRef.current, null, scale);

      const output = document.createElement('canvas');
      const dimensions = cropExportDimensions(selectedCrop, EXPORT_SIZE);
      output.width = dimensions.width;
      output.height = dimensions.height;
      const context = output.getContext('2d');
      if (!context) throw new Error('Canvas export is unavailable in this browser.');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(
        composition,
        selectedCrop.x * scale, selectedCrop.y * scale,
        selectedCrop.width * scale, selectedCrop.height * scale,
        0, 0, output.width, output.height,
      );
      const blob = await new Promise<Blob>((resolve, reject) => {
        output.toBlob((result) => result ? resolve(result) : reject(new Error('The edited image could not be exported.')), 'image/png');
      });
      onApply(blob, output.width, output.height);
    } catch (error) {
      setApplyError(error instanceof Error ? error.message : 'Could not apply these edits. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const crop = imageRef.current ? cropRect(editor.ratio, imageRef.current, editor.rotation, editor.customCrop) : { x: 72, y: 72, width: 576, height: 576 };
  const cropStyle = {
    left: (crop.x / CANVAS_SIZE) * 100 + '%',
    top: (crop.y / CANVAS_SIZE) * 100 + '%',
    width: (crop.width / CANVAS_SIZE) * 100 + '%',
    height: (crop.height / CANVAS_SIZE) * 100 + '%',
  };

  return (
    <div className="mt-4 rounded-2xl border-2 border-ink bg-[#171e1b] text-[#F4F0E8] p-3 sm:p-5 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mint/15 pb-3">
        <div>
          <p className="flex items-center gap-2 font-display text-xl font-extrabold text-[#A8F0DC]">
            <LuCrop aria-hidden className="size-5" /> Crop &amp; Customise Sticker
          </p>
          <p className="mt-0.5 text-xs text-[#F4F0E8]/70">
            Drag the white corner bracket handles to crop freely. Move the photo to align.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={undo}
            disabled={!hasUndo}
            className="grid size-8 place-items-center rounded-full border border-mint/20 text-[#F4F0E8] hover:bg-mint/10 disabled:opacity-30"
            aria-label="Undo"
          >
            <LuUndo2 className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!hasRedo}
            className="grid size-8 place-items-center rounded-full border border-mint/20 text-[#F4F0E8] hover:bg-mint/10 disabled:opacity-30"
            aria-label="Redo"
          >
            <LuRedo2 className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={resetEditor}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold text-[#F4F0E8]/80 hover:bg-mint/10"
          >
            <LuRefreshCw className="size-3.5" aria-hidden /> Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full hover:bg-mint/15 text-[#F4F0E8]"
            aria-label="Close editor"
          >
            <LuX className="size-5" aria-hidden />
          </button>
        </div>
      </div>

      {imageError ? (
        <p role="alert" className="mt-4 rounded-xl bg-danger/20 p-3 text-sm font-bold text-tomato">{imageError}</p>
      ) : !imageReady ? (
        <p role="status" className="mt-4 rounded-xl bg-white/5 p-4 text-sm text-center">Opening your image…</p>
      ) : (
        <>
          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
            {/* Canvas with Corner Bracket Crop Overlay */}
            <div className="min-w-0 flex flex-col items-center">
              <div
                ref={containerRef}
                className="relative mx-auto aspect-square w-full max-w-[460px] overflow-hidden rounded-2xl border-2 border-mint/30 bg-[#0d1311] shadow-inner select-none"
                style={{
                  touchAction: 'none',
                  backgroundImage:
                    'linear-gradient(45deg,#1b2522 25%,transparent 25%),linear-gradient(-45deg,#1b2522 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1b2522 75%),linear-gradient(-45deg,transparent 75%,#1b2522 75%)',
                  backgroundSize: '24px 24px',
                  backgroundPosition: '0 0,0 12px,12px -12px,-12px 0px',
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={CANVAS_SIZE}
                  height={CANVAS_SIZE}
                  role="img"
                  aria-label="Sticker design preview. Drag the image to reposition it or drag a text layer to move it."
                  className="block size-full cursor-grab active:cursor-grabbing"
                  style={{ touchAction: 'none' }}
                  onPointerDown={startDrag}
                  onPointerMove={moveDrag}
                  onPointerUp={finishDrag}
                  onPointerCancel={finishDrag}
                />

                {/* Shaded Outside Mask + Corner Bracket Handles */}
                <div
                  className="pointer-events-none absolute transition-all duration-75"
                  style={{
                    ...cropStyle,
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
                  }}
                >
                  {/* Fine crop boundary line */}
                  <div className="absolute inset-0 border border-white/40 pointer-events-none" />

                  {/* Rule of thirds grid lines (subtle composition guide) */}
                  <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-30">
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div />
                  </div>

                  {/* Center drag area to reposition the crop box */}
                  <div
                    className="absolute inset-4 pointer-events-auto cursor-move select-none touch-none"
                    onPointerDown={(e) => cropHandleDown('move', e)}
                    onPointerMove={cropHandleMove}
                    onPointerUp={cropHandleUp}
                    onPointerCancel={cropHandleUp}
                    title="Drag to move crop frame"
                  />

                  {/* Corner Bracket: Top-Left (┌) */}
                  <div
                    className="absolute -top-3.5 -left-3.5 size-11 pointer-events-auto cursor-nwse-resize select-none touch-none flex items-start justify-start p-1.5"
                    onPointerDown={(e) => cropHandleDown('nw', e)}
                    onPointerMove={cropHandleMove}
                    onPointerUp={cropHandleUp}
                    onPointerCancel={cropHandleUp}
                    role="slider"
                    aria-label="Resize crop top-left"
                  >
                    <div className="relative size-7 pointer-events-none">
                      <span className="absolute top-0 left-0 h-[4px] w-7 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.9)]" />
                      <span className="absolute top-0 left-0 h-7 w-[4px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.9)]" />
                    </div>
                  </div>

                  {/* Corner Bracket: Top-Right (┐) */}
                  <div
                    className="absolute -top-3.5 -right-3.5 size-11 pointer-events-auto cursor-nesw-resize select-none touch-none flex items-start justify-end p-1.5"
                    onPointerDown={(e) => cropHandleDown('ne', e)}
                    onPointerMove={cropHandleMove}
                    onPointerUp={cropHandleUp}
                    onPointerCancel={cropHandleUp}
                    role="slider"
                    aria-label="Resize crop top-right"
                  >
                    <div className="relative size-7 pointer-events-none">
                      <span className="absolute top-0 right-0 h-[4px] w-7 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.9)]" />
                      <span className="absolute top-0 right-0 h-7 w-[4px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.9)]" />
                    </div>
                  </div>

                  {/* Corner Bracket: Bottom-Left (└) */}
                  <div
                    className="absolute -bottom-3.5 -left-3.5 size-11 pointer-events-auto cursor-nesw-resize select-none touch-none flex items-end justify-start p-1.5"
                    onPointerDown={(e) => cropHandleDown('sw', e)}
                    onPointerMove={cropHandleMove}
                    onPointerUp={cropHandleUp}
                    onPointerCancel={cropHandleUp}
                    role="slider"
                    aria-label="Resize crop bottom-left"
                  >
                    <div className="relative size-7 pointer-events-none">
                      <span className="absolute bottom-0 left-0 h-[4px] w-7 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.9)]" />
                      <span className="absolute bottom-0 left-0 h-7 w-[4px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.9)]" />
                    </div>
                  </div>

                  {/* Corner Bracket: Bottom-Right (┘) */}
                  <div
                    className="absolute -bottom-3.5 -right-3.5 size-11 pointer-events-auto cursor-nwse-resize select-none touch-none flex items-end justify-end p-1.5"
                    onPointerDown={(e) => cropHandleDown('se', e)}
                    onPointerMove={cropHandleMove}
                    onPointerUp={cropHandleUp}
                    onPointerCancel={cropHandleUp}
                    role="slider"
                    aria-label="Resize crop bottom-right"
                  >
                    <div className="relative size-7 pointer-events-none">
                      <span className="absolute bottom-0 right-0 h-[4px] w-7 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.9)]" />
                      <span className="absolute bottom-0 right-0 h-7 w-[4px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.9)]" />
                    </div>
                  </div>

                  {/* Edge Drag Handles */}
                  <div
                    className="absolute -top-2 left-9 right-9 h-4 pointer-events-auto cursor-ns-resize touch-none"
                    onPointerDown={(e) => cropHandleDown('n', e)}
                    onPointerMove={cropHandleMove}
                    onPointerUp={cropHandleUp}
                    onPointerCancel={cropHandleUp}
                  />
                  <div
                    className="absolute -bottom-2 left-9 right-9 h-4 pointer-events-auto cursor-ns-resize touch-none"
                    onPointerDown={(e) => cropHandleDown('s', e)}
                    onPointerMove={cropHandleMove}
                    onPointerUp={cropHandleUp}
                    onPointerCancel={cropHandleUp}
                  />
                  <div
                    className="absolute top-9 bottom-9 -left-2 w-4 pointer-events-auto cursor-ew-resize touch-none"
                    onPointerDown={(e) => cropHandleDown('w', e)}
                    onPointerMove={cropHandleMove}
                    onPointerUp={cropHandleUp}
                    onPointerCancel={cropHandleUp}
                  />
                  <div
                    className="absolute top-9 bottom-9 -right-2 w-4 pointer-events-auto cursor-ew-resize touch-none"
                    onPointerDown={(e) => cropHandleDown('e', e)}
                    onPointerMove={cropHandleMove}
                    onPointerUp={cropHandleUp}
                    onPointerCancel={cropHandleUp}
                  />
                </div>
              </div>

              {/* Bottom Quick Bar Matching Mobile Editor Screenshot */}
              <div className="mt-3 flex w-full max-w-[460px] items-center justify-around rounded-full border border-mint/20 bg-[#0d1311] p-1.5 shadow-lg">
                <button
                  type="button"
                  onClick={() => setActiveTab('crop')}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold transition-all ${
                    activeTab === 'crop'
                      ? 'bg-mint text-[#03110F] shadow-sm'
                      : 'text-[#F4F0E8]/70 hover:text-[#F4F0E8] hover:bg-white/5'
                  }`}
                >
                  <LuCrop className="size-4" /> Crop
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('straighten')}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold transition-all ${
                    activeTab === 'straighten'
                      ? 'bg-mint text-[#03110F] shadow-sm'
                      : 'text-[#F4F0E8]/70 hover:text-[#F4F0E8] hover:bg-white/5'
                  }`}
                >
                  <LuSlidersHorizontal className="size-4" /> Straighten
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('rotate')}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold transition-all ${
                    activeTab === 'rotate'
                      ? 'bg-mint text-[#03110F] shadow-sm'
                      : 'text-[#F4F0E8]/70 hover:text-[#F4F0E8] hover:bg-white/5'
                  }`}
                >
                  <LuRotateCw className="size-4" /> Rotate
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('zoom')}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold transition-all ${
                    activeTab === 'zoom'
                      ? 'bg-mint text-[#03110F] shadow-sm'
                      : 'text-[#F4F0E8]/70 hover:text-[#F4F0E8] hover:bg-white/5'
                  }`}
                >
                  <LuZoomIn className="size-4" /> Zoom
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('text')}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold transition-all ${
                    activeTab === 'text'
                      ? 'bg-mint text-[#03110F] shadow-sm'
                      : 'text-[#F4F0E8]/70 hover:text-[#F4F0E8] hover:bg-white/5'
                  }`}
                >
                  <LuType className="size-4" /> Text
                </button>
              </div>

              {/* Sub-controls based on active bottom tool */}
              <div className="mt-2 w-full max-w-[460px] rounded-xl border border-white/10 bg-[#0d1311] p-3 text-xs">
                {activeTab === 'crop' && (
                  <div>
                    <div className="flex items-center justify-between font-bold mb-2">
                      <span className="text-mint uppercase tracking-wider text-[11px]">Crop Aspect Ratio</span>
                      <button
                        type="button"
                        onClick={() => commit({ ...editorRef.current, ratio: 'free', customCrop: { x: 72, y: 72, width: 576, height: 576 } })}
                        className="text-mint underline text-[11px] hover:text-white"
                      >
                        Reset crop box
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'free' as CropRatio, label: 'Freeform' },
                        { id: 'square' as CropRatio, label: '1:1 Square' },
                        { id: 'portrait' as CropRatio, label: '4:5 Portrait' },
                        { id: 'landscape' as CropRatio, label: '16:9 Landscape' },
                      ].map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setRatioPreset(option.id)}
                          className={`rounded-lg py-1.5 text-center font-bold transition-colors ${
                            editor.ratio === option.id
                              ? 'bg-mint text-[#03110F]'
                              : 'bg-white/10 text-white hover:bg-white/20'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] text-[#F4F0E8]/60 text-center">
                      Drag any corner bracket ┌ ┐ └ ┘ directly to adjust the crop bounds.
                    </p>
                  </div>
                )}

                {activeTab === 'straighten' && (
                  <div>
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-mint uppercase tracking-wider text-[11px]">Straighten &amp; Tilt Angle</span>
                      <span className="font-mono text-mint">{editor.rotation}°</span>
                    </div>
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      step="1"
                      value={editor.rotation % 360 > 180 ? (editor.rotation % 360) - 360 : editor.rotation % 360}
                      onChange={(e) => updateLive({ ...editorRef.current, rotation: Number(e.target.value) })}
                      onPointerUp={commitCurrent}
                      onKeyUp={commitCurrent}
                      className="mt-2 w-full accent-[#A8F0DC]"
                    />
                    <div className="mt-2 flex justify-between">
                      <button
                        type="button"
                        onClick={() => commit({ ...editorRef.current, rotation: 0 })}
                        className="rounded bg-white/10 px-2 py-1 text-[11px] font-bold hover:bg-white/20"
                      >
                        Reset to 0°
                      </button>
                      <span className="text-[11px] text-[#F4F0E8]/60">-45° to +45° fine straightening</span>
                    </div>
                  </div>
                )}

                {activeTab === 'rotate' && (
                  <div>
                    <span className="block text-mint font-bold uppercase tracking-wider text-[11px] mb-2">90° Rotation</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => commit({ ...editorRef.current, rotation: (editorRef.current.rotation + 270) % 360 })}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/10 py-2 font-bold hover:bg-white/20"
                      >
                        <LuRotateCcw className="size-4" /> Rotate 90° Left
                      </button>
                      <button
                        type="button"
                        onClick={() => commit({ ...editorRef.current, rotation: (editorRef.current.rotation + 90) % 360 })}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/10 py-2 font-bold hover:bg-white/20"
                      >
                        <LuRotateCw className="size-4" /> Rotate 90° Right
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'zoom' && (
                  <div>
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-mint uppercase tracking-wider text-[11px]">Image Scale</span>
                      <span className="font-mono text-mint">{editor.zoom.toFixed(2)}×</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="3.5"
                      step="0.05"
                      value={editor.zoom}
                      onChange={(event) => updateLive({ ...editorRef.current, zoom: Number(event.currentTarget.value) })}
                      onPointerUp={commitCurrent}
                      onKeyUp={commitCurrent}
                      className="mt-2 w-full accent-[#A8F0DC]"
                    />
                    <p className="mt-1 text-[11px] text-[#F4F0E8]/60">Pan image by dragging to place it inside crop area.</p>
                  </div>
                )}

                {activeTab === 'text' && (
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-mint font-bold uppercase tracking-wider text-[11px]">Text Layer Controls</span>
                      <button
                        type="button"
                        onClick={() => addText()}
                        className="rounded-full bg-mint px-2.5 py-1 text-xs font-bold text-[#03110F]"
                      >
                        + Add Text
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-[#F4F0E8]/60">Customize text styles in the side panel.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Side Panel: Text Customization & Adjustments */}
            <div className="min-w-0 space-y-3">
              <section className="rounded-xl border border-white/10 bg-[#0d1311] p-3 text-ink-light">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 font-extrabold text-[#A8F0DC]">
                    <LuType aria-hidden /> Text layers
                  </h3>
                  <button
                    type="button"
                    onClick={() => addText()}
                    className="inline-flex items-center gap-1 rounded-full bg-mint px-3 py-1.5 text-xs font-bold text-[#03110F] hover:bg-mint/85"
                  >
                    + Add text
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => addText(suggestion)}
                      className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-white hover:border-mint/60 hover:bg-mint/20"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

                {editor.layers.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Your text layers">
                    {editor.layers.map((layer, index) => (
                      <button
                        key={layer.id}
                        type="button"
                        onClick={() => setSelectedLayerId(layer.id)}
                        aria-pressed={selectedLayerId === layer.id}
                        className={
                          selectedLayerId === layer.id
                            ? 'max-w-full truncate rounded-lg bg-mint px-2.5 py-1 text-xs font-bold text-[#03110F]'
                            : 'max-w-full truncate rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-white hover:bg-white/20'
                        }
                      >
                        {index + 1}. {layer.text || 'Empty text'}
                      </button>
                    ))}
                  </div>
                )}

                {selectedLayer ? (
                  <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
                    <label className="block text-xs font-bold text-[#F4F0E8]" htmlFor="sticker-layer-text">
                      Text
                    </label>
                    <textarea
                      id="sticker-layer-text"
                      rows={2}
                      maxLength={120}
                      value={selectedLayer.text}
                      onChange={(event) => updateSelected({ text: event.currentTarget.value })}
                      className="w-full rounded-lg border border-white/20 bg-[#171e1b] p-2 text-sm text-white outline-none focus:border-mint"
                      placeholder="Write your text…"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <label className="block text-xs font-bold text-[#F4F0E8]">
                        Font
                        <select
                          value={selectedLayer.fontFamily}
                          onChange={(event) => updateSelected({ fontFamily: event.currentTarget.value })}
                          className="mt-1 w-full rounded-lg border border-white/20 bg-[#171e1b] p-2 text-xs text-white"
                        >
                          {BUILT_IN_FONTS.map((font) => (
                            <option key={font.family} value={font.family}>
                              {font.label}
                            </option>
                          ))}
                          {customFonts.map((font) => (
                            <option key={font.family} value={font.family}>
                              {font.label} · uploaded
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-xs font-bold text-[#F4F0E8]">
                        Alignment
                        <select
                          value={selectedLayer.align}
                          onChange={(event) => updateSelected({ align: event.currentTarget.value as CanvasTextAlign })}
                          className="mt-1 w-full rounded-lg border border-white/20 bg-[#171e1b] p-2 text-xs text-white"
                        >
                          <option value="left">Left</option>
                          <option value="center">Centre</option>
                          <option value="right">Right</option>
                        </select>
                      </label>
                    </div>

                    <label className="block text-xs font-bold text-[#F4F0E8]" htmlFor="sticker-layer-size">
                      Text size · {selectedLayer.fontSize}px
                    </label>
                    <input
                      id="sticker-layer-size"
                      type="range"
                      min="20"
                      max="112"
                      value={selectedLayer.fontSize}
                      onChange={(event) => updateSelected({ fontSize: Number(event.currentTarget.value) })}
                      className="w-full accent-[#A8F0DC]"
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center gap-2 text-xs font-bold text-[#F4F0E8]">
                        Colour
                        <input
                          type="color"
                          value={selectedLayer.color}
                          onChange={(event) => updateSelected({ color: event.currentTarget.value })}
                          className="size-8 cursor-pointer rounded border border-white/20 bg-transparent p-0.5"
                        />
                      </label>
                      <label className="flex items-center gap-2 text-xs font-bold text-[#F4F0E8]">
                        Outline
                        <input
                          type="checkbox"
                          checked={selectedLayer.outline}
                          onChange={(event) => updateSelected({ outline: event.currentTarget.checked })}
                          className="size-4 accent-[#A8F0DC]"
                        />
                        <input
                          type="color"
                          aria-label="Outline colour"
                          value={selectedLayer.outlineColor}
                          onChange={(event) => updateSelected({ outlineColor: event.currentTarget.value })}
                          className="size-8 cursor-pointer rounded border border-white/20 bg-transparent p-0.5"
                        />
                      </label>
                      <label className="flex items-center gap-2 text-xs font-bold text-[#F4F0E8]">
                        Bold
                        <input
                          type="checkbox"
                          checked={selectedLayer.bold}
                          onChange={(event) => updateSelected({ bold: event.currentTarget.checked })}
                          className="size-4 accent-[#A8F0DC]"
                        />
                      </label>
                      <label className="flex items-center gap-2 text-xs font-bold text-[#F4F0E8]">
                        Shadow
                        <input
                          type="checkbox"
                          checked={selectedLayer.shadow}
                          onChange={(event) => updateSelected({ shadow: event.currentTarget.checked })}
                          className="size-4 accent-[#A8F0DC]"
                        />
                      </label>
                    </div>

                    <label className="block text-xs font-bold text-[#F4F0E8]" htmlFor="sticker-layer-rotation">
                      Text rotation · {selectedLayer.rotation}°
                    </label>
                    <input
                      id="sticker-layer-rotation"
                      type="range"
                      min="-45"
                      max="45"
                      value={selectedLayer.rotation}
                      onChange={(event) => updateSelected({ rotation: Number(event.currentTarget.value) })}
                      className="w-full accent-[#A8F0DC]"
                    />

                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-white/20 p-2 text-xs font-bold hover:bg-white/5">
                      <LuUpload aria-hidden /> Upload your own font (.ttf/.otf/.woff)
                      <input
                        type="file"
                        accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
                        onChange={(event) => void uploadFont(event)}
                        className="sr-only"
                      />
                    </label>
                    {fontError && <p role="alert" className="text-xs font-bold text-tomato">{fontError}</p>}

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={duplicateSelected}
                        className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1.5 text-xs font-bold hover:bg-white/10"
                      >
                        <LuCopy aria-hidden /> Duplicate
                      </button>
                      <button
                        type="button"
                        onClick={deleteSelected}
                        className="inline-flex items-center gap-1 rounded-full border border-danger/40 px-3 py-1.5 text-xs font-bold text-tomato hover:bg-danger/10"
                      >
                        <LuTrash2 aria-hidden /> Delete layer
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 rounded-lg bg-white/5 p-3 text-xs text-[#F4F0E8]/70">
                    Add a text layer or click a preset badge, then select it to edit fonts, colours, and shadows.
                  </p>
                )}
              </section>
            </div>
          </div>

          {applyError && (
            <p role="alert" className="mt-3 rounded-lg bg-danger/20 p-3 text-sm font-bold text-tomato">
              {applyError}
            </p>
          )}

          <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void applyDesign()}
              disabled={!imageReady || busy}
              className="btn-primary px-6 py-2.5 text-sm disabled:opacity-50 inline-flex items-center gap-2"
            >
              <LuCheck aria-hidden /> {busy ? 'Applying…' : 'Apply Crop & Changes'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
