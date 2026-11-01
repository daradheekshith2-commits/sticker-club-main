import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from 'react';
import {
  LuCheck, LuCopy, LuCrop, LuRedo2, LuRefreshCw, LuRotateCcw, LuRotateCw,
  LuTrash2, LuType, LuUndo2, LuUpload, LuX,
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
  customCrop: { x: 90, y: 90, width: 540, height: 540 },
  layers: [],
});

function cropRect(ratio: CropRatio, image: HTMLImageElement, rotation: number, custom?: CropRect): CropRect {
  if (ratio === 'custom') return custom ?? { x: 90, y: 90, width: 540, height: 540 };
  if (ratio === 'portrait') return { x: 72, y: 0, width: 576, height: 720 };
  if (ratio === 'landscape') return { x: 0, y: 157.5, width: 720, height: 405 };
  if (ratio === 'square') return { x: 0, y: 0, width: 720, height: 720 };

  const rotated = Math.abs(rotation % 180) === 90;
  const imageRatio = rotated ? image.height / image.width : image.width / image.height;
  const safeRatio = Math.max(0.35, Math.min(2.8, imageRatio));
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
  const [customFonts, setCustomFonts] = useState<FontChoice[]>([]);
  const [fontError, setFontError] = useState('');
  const [fontRevision, setFontRevision] = useState(0);
  const [imageReady, setImageReady] = useState(false);
  const [imageError, setImageError] = useState('');
  const [busy, setBusy] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [cropEditing, setCropEditing] = useState(false);
  const cropBeforeRef = useRef<EditorState | null>(null);
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

  function canvasPoint(event: ReactPointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
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

  function beginCustomCrop() { cropBeforeRef.current = editorRef.current; commit({...editorRef.current,ratio:'custom'}); setCropEditing(true); }
  function getCropPoint(e: ReactPointerEvent<HTMLDivElement>) { const r=e.currentTarget.getBoundingClientRect(); return {x:(e.clientX-r.left)*720/r.width,y:(e.clientY-r.top)*720/r.height}; }
  function cropPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if(e.button!==0)return;
    e.preventDefault();
    const p=getCropPoint(e),r=editorRef.current.customCrop,t=24;
    const edgeX=Math.abs(p.x-r.x)<t?'w':Math.abs(p.x-r.x-r.width)<t?'e':'';
    const edgeY=Math.abs(p.y-r.y)<t?'n':Math.abs(p.y-r.y-r.height)<t?'s':'';
    const handle=edgeY+edgeX||(p.x>=r.x&&p.x<=r.x+r.width&&p.y>=r.y&&p.y<=r.y+r.height?'move':'draw');
    cropDragRef.current={x:p.x,y:p.y,rect:r,handle};
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function cropPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d=cropDragRef.current;if(!d)return;const p=getCropPoint(e),dx=p.x-d.x,dy=p.y-d.y;
    const min=36,clamp=(n:number,a:number,b:number)=>Math.min(b,Math.max(a,n));
    let {x,y,width,height}=d.rect;
    if(d.handle==='move'){x=clamp(x+dx,0,720-width);y=clamp(y+dy,0,720-height);}
    else if(d.handle==='draw'){x=clamp(Math.min(p.x,d.x),0,720-min);y=clamp(Math.min(p.y,d.y),0,720-min);width=clamp(Math.abs(dx),min,720-x);height=clamp(Math.abs(dy),min,720-y);}
    else {
      if(d.handle.includes('w')){x=clamp(x+dx,0,x+width-min);width=d.rect.x+d.rect.width-x;}
      if(d.handle.includes('e'))width=clamp(width+dx,min,720-x);
      if(d.handle.includes('n')){y=clamp(y+dy,0,y+height-min);height=d.rect.y+d.rect.height-y;}
      if(d.handle.includes('s'))height=clamp(height+dy,min,720-y);
    }
    updateLive({...editorRef.current,customCrop:{x,y,width,height}});
  }
  function cropPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if(!cropDragRef.current)return;cropDragRef.current=null;
    if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
    commitCurrent();
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
      // Compose at high resolution, then extract ONLY the chosen crop bounds.
      // Avoid the old 1200×1200 transparent padding on portrait and landscape crops.
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

  const crop = imageRef.current ? cropRect(editor.ratio, imageRef.current, editor.rotation, editor.customCrop) : { x: 0, y: 0, width: 720, height: 720 };
  const cropStyle = {
    left: (crop.x / CANVAS_SIZE) * 100 + '%',
    top: (crop.y / CANVAS_SIZE) * 100 + '%',
    width: (crop.width / CANVAS_SIZE) * 100 + '%',
    height: (crop.height / CANVAS_SIZE) * 100 + '%',
  };

  return (
    <div className="mt-4 rounded-2xl border-2 border-ink bg-paper p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-display text-xl font-extrabold"><LuCrop aria-hidden /> Edit your design</p>
          <p className="mt-1 text-xs text-ink-soft">Crop and position your image, then add text layers. Everything is processed on this device.</p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={undo} disabled={!hasUndo} className="grid size-9 place-items-center rounded-full border border-ink/20 disabled:opacity-35" aria-label="Undo">
            <LuUndo2 aria-hidden />
          </button>
          <button type="button" onClick={redo} disabled={!hasRedo} className="grid size-9 place-items-center rounded-full border border-ink/20 disabled:opacity-35" aria-label="Redo">
            <LuRedo2 aria-hidden />
          </button>
          <button type="button" onClick={resetEditor} className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-bold hover:bg-paper-deep">
            <LuRefreshCw aria-hidden /> Reset
          </button>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full hover:bg-paper-deep" aria-label="Close editor">
            <LuX aria-hidden />
          </button>
        </div>
      </div>

      {imageError ? (
        <p role="alert" className="mt-4 rounded-xl bg-danger/10 p-3 text-sm font-bold text-danger">{imageError}</p>
      ) : !imageReady ? (
        <p role="status" className="mt-4 rounded-xl bg-white p-4 text-sm">Opening your image…</p>
      ) : (
        <>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)]">
            <div className="min-w-0">
              <div className="relative mx-auto aspect-square w-full max-w-[470px] overflow-hidden rounded-2xl border-2 border-ink/20 bg-[#202a27]" style={{ touchAction: 'none', backgroundImage: 'linear-gradient(45deg,#2b3531 25%,transparent 25%),linear-gradient(-45deg,#2b3531 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#2b3531 75%),linear-gradient(-45deg,transparent 75%,#2b3531 75%)', backgroundSize: '24px 24px', backgroundPosition: '0 0,0 12px,12px -12px,-12px 0px' }}>
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
                <div className="pointer-events-none absolute border-2 border-dashed border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.10)]" style={cropStyle} />
                {cropEditing && <div className="absolute inset-0 cursor-crosshair" role="application" aria-label="Drag to create, move or resize crop selection" style={{touchAction:'none'}} onPointerDown={cropPointerDown} onPointerMove={cropPointerMove} onPointerUp={cropPointerUp} onPointerCancel={cropPointerUp}>
                  <div className="pointer-events-none absolute border-2 border-[#A8F0DC]" style={cropStyle}>
                    {['nw','n','ne','e','se','s','sw','w'].map(h => <span key={h} className="absolute size-3 rounded-sm border border-[#03110f] bg-[#A8F0DC]" style={{left:h.includes('w')?'0%':h.includes('e')?'100%':'50%',top:h.includes('n')?'0%':h.includes('s')?'100%':'50%',transform:'translate(-50%,-50%)'}} />)}
                  </div>
                </div>}
              </div>
              <p className="mt-2 text-center text-xs text-ink-soft">Drag the photo to reposition it. Select and drag any text to move that layer.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {!cropEditing ? <button type="button" className="btn-accent" onClick={beginCustomCrop}>Custom Crop — Select Your Own Area</button> : <>
                  <button type="button" className="btn-accent" onClick={() => {cropBeforeRef.current=null;setCropEditing(false);}}>Apply Crop</button>
                  <button type="button" className="btn-ghost" onClick={() => {if(cropBeforeRef.current)commit(cropBeforeRef.current);cropBeforeRef.current=null;setCropEditing(false);}}>Cancel</button>
                  <button type="button" className="btn-ghost" onClick={() => commit({...editorRef.current,customCrop:{x:90,y:90,width:540,height:540}})}>Reset crop</button>
                </>}
              </div>

              <div className="mt-4 rounded-xl bg-white p-3">
                <p className="text-sm font-extrabold">Crop shape</p>
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'free' as CropRatio, label: 'Free' },
                    { id: 'square' as CropRatio, label: '1:1' },
                    { id: 'portrait' as CropRatio, label: '4:5' },
                    { id: 'landscape' as CropRatio, label: '16:9' },
                  ].map((option) => (
                    <button key={option.id} type="button" onClick={() => commit({ ...editorRef.current, ratio: option.id })} aria-pressed={editor.ratio === option.id} className={editor.ratio === option.id ? 'rounded-lg bg-ink px-2 py-2 text-xs font-bold text-paper' : 'rounded-lg bg-paper px-2 py-2 text-xs font-bold hover:bg-paper-deep'}>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="min-w-0 space-y-3">
              <section className="rounded-xl border border-ink/10 bg-white p-3">
                <h3 className="font-extrabold">Image adjustments</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => commit({ ...editorRef.current, rotation: (editorRef.current.rotation + 270) % 360 })} className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-3 py-2 text-xs font-bold hover:bg-paper">
                    <LuRotateCcw aria-hidden /> Rotate left
                  </button>
                  <button type="button" onClick={() => commit({ ...editorRef.current, rotation: (editorRef.current.rotation + 90) % 360 })} className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-3 py-2 text-xs font-bold hover:bg-paper">
                    <LuRotateCw aria-hidden /> Rotate right
                  </button>
                </div>
                <label className="mt-4 block text-sm font-bold" htmlFor="sticker-image-zoom">Zoom · {editor.zoom.toFixed(1)}×</label>
                <input id="sticker-image-zoom" type="range" min="1" max="3.5" step="0.05" value={editor.zoom} onChange={(event) => updateLive({ ...editorRef.current, zoom: Number(event.currentTarget.value) })} onPointerUp={commitCurrent} onKeyUp={commitCurrent} className="mt-2 w-full accent-ink" />
                <p className="mt-1 text-xs text-ink-soft">Move the image inside the crop frame to choose exactly what stays.</p>
              </section>

              <section className="rounded-xl border border-ink/10 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 font-extrabold"><LuType aria-hidden /> Text layers</h3>
                  <button type="button" onClick={() => addText()} className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-2 text-xs font-bold text-paper hover:bg-ink/85">
                    + Add text
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((suggestion) => (
                    <button key={suggestion} type="button" onClick={() => addText(suggestion)} className="rounded-full border border-ink/15 bg-paper px-2.5 py-1.5 text-[10px] font-bold hover:border-ink/40 hover:bg-lime/35">
                      {suggestion}
                    </button>
                  ))}
                </div>

                {editor.layers.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Your text layers">
                    {editor.layers.map((layer, index) => (
                      <button key={layer.id} type="button" onClick={() => setSelectedLayerId(layer.id)} aria-pressed={selectedLayerId === layer.id} className={selectedLayerId === layer.id ? 'max-w-full truncate rounded-lg bg-ink px-2.5 py-1.5 text-xs font-bold text-paper' : 'max-w-full truncate rounded-lg bg-paper px-2.5 py-1.5 text-xs font-bold'}>
                        {index + 1}. {layer.text || 'Empty text'}
                      </button>
                    ))}
                  </div>
                )}

                {selectedLayer ? (
                  <div className="mt-3 space-y-3 border-t border-ink/10 pt-3">
                    <label className="block text-xs font-bold" htmlFor="sticker-layer-text">Text</label>
                    <textarea id="sticker-layer-text" rows={2} maxLength={120} value={selectedLayer.text} onChange={(event) => updateSelected({ text: event.currentTarget.value })} className="w-full rounded-lg border border-ink/20 bg-white p-2 text-sm outline-offset-2" placeholder="Write your text…" />

                    <div className="grid grid-cols-2 gap-2">
                      <label className="block text-xs font-bold">
                        Font
                        <select value={selectedLayer.fontFamily} onChange={(event) => updateSelected({ fontFamily: event.currentTarget.value })} className="mt-1 w-full rounded-lg border border-ink/20 bg-white p-2 text-xs">
                          {BUILT_IN_FONTS.map((font) => <option key={font.family} value={font.family}>{font.label}</option>)}
                          {customFonts.map((font) => <option key={font.family} value={font.family}>{font.label} · uploaded</option>)}
                        </select>
                      </label>
                      <label className="block text-xs font-bold">
                        Alignment
                        <select value={selectedLayer.align} onChange={(event) => updateSelected({ align: event.currentTarget.value as CanvasTextAlign })} className="mt-1 w-full rounded-lg border border-ink/20 bg-white p-2 text-xs">
                          <option value="left">Left</option>
                          <option value="center">Centre</option>
                          <option value="right">Right</option>
                        </select>
                      </label>
                    </div>

                    <label className="block text-xs font-bold" htmlFor="sticker-layer-size">Text size · {selectedLayer.fontSize}px</label>
                    <input id="sticker-layer-size" type="range" min="20" max="112" value={selectedLayer.fontSize} onChange={(event) => updateSelected({ fontSize: Number(event.currentTarget.value) })} className="w-full accent-ink" />

                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center gap-2 text-xs font-bold">
                        Text colour
                        <input type="color" value={selectedLayer.color} onChange={(event) => updateSelected({ color: event.currentTarget.value })} className="size-9 cursor-pointer rounded border border-ink/20 bg-white p-0.5" />
                      </label>
                      <label className="flex items-center gap-2 text-xs font-bold">
                        Outline
                        <input type="checkbox" checked={selectedLayer.outline} onChange={(event) => updateSelected({ outline: event.currentTarget.checked })} className="size-4 accent-ink" />
                        <input type="color" aria-label="Outline colour" value={selectedLayer.outlineColor} onChange={(event) => updateSelected({ outlineColor: event.currentTarget.value })} className="size-9 cursor-pointer rounded border border-ink/20 bg-white p-0.5" />
                      </label>
                      <label className="flex items-center gap-2 text-xs font-bold">
                        Bold
                        <input type="checkbox" checked={selectedLayer.bold} onChange={(event) => updateSelected({ bold: event.currentTarget.checked })} className="size-4 accent-ink" />
                      </label>
                      <label className="flex items-center gap-2 text-xs font-bold">
                        Shadow
                        <input type="checkbox" checked={selectedLayer.shadow} onChange={(event) => updateSelected({ shadow: event.currentTarget.checked })} className="size-4 accent-ink" />
                      </label>
                    </div>

                    <label className="block text-xs font-bold" htmlFor="sticker-layer-rotation">Text rotation · {selectedLayer.rotation}°</label>
                    <input id="sticker-layer-rotation" type="range" min="-45" max="45" value={selectedLayer.rotation} onChange={(event) => updateSelected({ rotation: Number(event.currentTarget.value) })} className="w-full accent-ink" />

                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-ink/20 p-2 text-xs font-bold hover:bg-paper">
                      <LuUpload aria-hidden /> Upload your own font (.ttf/.otf/.woff)
                      <input type="file" accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2" onChange={(event) => void uploadFont(event)} className="sr-only" />
                    </label>
                    {fontError && <p role="alert" className="text-xs font-bold text-danger">{fontError}</p>}

                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={duplicateSelected} className="inline-flex items-center gap-1 rounded-full border border-ink/20 px-3 py-2 text-xs font-bold hover:bg-paper">
                        <LuCopy aria-hidden /> Duplicate
                      </button>
                      <button type="button" onClick={deleteSelected} className="inline-flex items-center gap-1 rounded-full border border-danger/30 px-3 py-2 text-xs font-bold text-danger hover:bg-danger/5">
                        <LuTrash2 aria-hidden /> Delete layer
                      </button>
                    </div>
                    <p className="text-[11px] text-ink-soft">Only upload font files you have permission to use. Text is rendered into your finished sticker image when you apply the design.</p>
                  </div>
                ) : (
                  <p className="mt-3 rounded-lg bg-paper p-3 text-xs text-ink-soft">Add a text layer or choose a suggestion, then select it to change its font, colour, size and effects.</p>
                )}
              </section>
            </div>
          </div>

          {applyError && <p role="alert" className="mt-3 rounded-lg bg-danger/10 p-3 text-sm font-bold text-danger">{applyError}</p>}
          <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-ink/10 pt-4">
            <button type="button" onClick={onClose} disabled={busy} className="rounded-full border border-ink/20 px-5 py-3 text-sm font-bold hover:bg-white disabled:opacity-50">Cancel</button>
            <button type="button" onClick={() => void applyDesign()} disabled={!imageReady || busy} className="btn-primary px-5 py-3 text-sm disabled:opacity-50">
              <LuCheck aria-hidden /> {busy ? 'Applying…' : 'Apply changes'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
