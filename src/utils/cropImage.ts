import { paperSizes, type PaperSizeId } from '../data/wallLayouts';
import type { Area } from 'react-easy-crop';

export interface CropAspectOption {
  id: 'sheet' | 'a-portrait' | 'a-landscape' | 'square' | '4:5' | '16:9' | 'free';
  label: string;
  ratio?: number;
}

export function getRadianAngle(degreeValue: number): number {
  return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the bounding box size of a rotated rectangle.
 */
export function rotateSize(width: number, height: number, rotation: number): { width: number; height: number } {
  const rotRad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

/**
 * Calculate aspect ratio for a given paper size and orientation.
 */
export function getSheetAspectRatio(size: PaperSizeId, orientation: 'portrait' | 'landscape' = 'portrait'): number {
  const p = paperSizes[size];
  if (!p) return 1 / 1.4142;
  return orientation === 'landscape' ? p.h / p.w : p.w / p.h;
}

/**
 * Get the numeric aspect ratio for a chosen preset or freeform mode.
 */
export function getAspectValue(
  option: CropAspectOption['id'],
  size: PaperSizeId,
  orientation: 'portrait' | 'landscape' = 'portrait',
  customFreeRatio = 1
): number | undefined {
  switch (option) {
    case 'sheet':
      return getSheetAspectRatio(size, orientation);
    case 'a-portrait':
      return 1 / 1.4142;
    case 'a-landscape':
      return 1.4142;
    case 'square':
      return 1;
    case '4:5':
      return 4 / 5;
    case '16:9':
      return 16 / 9;
    case 'free':
      return customFreeRatio;
    default:
      return getSheetAspectRatio(size, orientation);
  }
}

/**
 * Calculate effective resolution and DPI of a cropped area when printed on physical paper.
 */
export function calculatePrintQuality(
  sourceWidth: number | undefined,
  sourceHeight: number | undefined,
  croppedArea: Area | undefined,
  size: PaperSizeId,
  orientation: 'portrait' | 'landscape' = 'portrait'
): {
  dpi: number;
  effectiveWidth: number;
  effectiveHeight: number;
  isLowRes: boolean;
  qualityLevel: 'excellent' | 'good' | 'low';
} {
  if (!sourceWidth || !sourceHeight || sourceWidth <= 0 || sourceHeight <= 0) {
    return { dpi: 0, effectiveWidth: 0, effectiveHeight: 0, isLowRes: false, qualityLevel: 'good' };
  }

  const p = paperSizes[size];
  const paperWidthCm = orientation === 'landscape' ? p.h : p.w;
  const paperHeightCm = orientation === 'landscape' ? p.w : p.h;

  const cropFractionW = croppedArea ? Math.max(0.01, croppedArea.width / 100) : 1;
  const cropFractionH = croppedArea ? Math.max(0.01, croppedArea.height / 100) : 1;

  const effectiveWidth = Math.round(sourceWidth * cropFractionW);
  const effectiveHeight = Math.round(sourceHeight * cropFractionH);

  const paperWidthInches = paperWidthCm / 2.54;
  const paperHeightInches = paperHeightCm / 2.54;

  const dpiW = effectiveWidth / paperWidthInches;
  const dpiH = effectiveHeight / paperHeightInches;
  const dpi = Math.round(Math.min(dpiW, dpiH));

  const isLowRes = dpi < 100;
  const qualityLevel = dpi >= 250 ? 'excellent' : dpi >= 120 ? 'good' : 'low';

  return { dpi, effectiveWidth, effectiveHeight, isLowRes, qualityLevel };
}

/**
 * Loads an image with crossOrigin = 'anonymous' for canvas processing.
 */
export const createDomImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
    image.src = url;
  });

/**
 * Crops and rotates an image in-memory using an HTML Canvas, preserving print quality.
 * Returns a data URL on success, or null if cross-origin policy prevents canvas reading.
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0
): Promise<string | null> {
  if (typeof document === 'undefined') return null; // Node test environment safety

  try {
    const image = await createDomImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const rotRad = getRadianAngle(rotation);
    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.naturalWidth, image.naturalHeight, rotation);

    canvas.width = Math.max(1, Math.round(bBoxWidth));
    canvas.height = Math.max(1, Math.round(bBoxHeight));

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rotRad);
    ctx.translate(-image.naturalWidth / 2, -image.naturalHeight / 2);
    ctx.drawImage(image, 0, 0);

    const croppedCanvas = document.createElement('canvas');
    const croppedCtx = croppedCanvas.getContext('2d');
    if (!croppedCtx) return null;

    croppedCanvas.width = Math.max(1, Math.round(pixelCrop.width));
    croppedCanvas.height = Math.max(1, Math.round(pixelCrop.height));

    croppedCtx.drawImage(
      canvas,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      croppedCanvas.width,
      croppedCanvas.height
    );

    return croppedCanvas.toDataURL('image/jpeg', 0.95);
  } catch (err) {
    // If external host blocks CORS canvas extraction, log and return null so CSS fallback is used seamlessly
    console.warn('Canvas export skipped due to cross-origin restriction; using live CSS framing:', err);
    return null;
  }
}
