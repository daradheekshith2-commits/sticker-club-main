/**
 * HOMEPAGE HERO STICKERS — the images shown in the animated mosaic.
 *
 * The list itself is generated from the files in public/hero-stickers/ by
 * scripts/generate-hero-sticker-manifest.mjs (it runs before `npm run dev`
 * and `npm run build`), so dropping new images into that folder is enough.
 */
import { heroStickerFiles } from './heroStickers.generated';

export interface HeroStickerFile {
  /** Stable, unique key derived from the filename. */
  key: string;
  /** Public URL, already URL-encoded (spaces and special characters are safe). */
  src: string;
  /** Readable label from the filename. The mosaic is decorative, so it isn't read aloud. */
  alt: string;
  /** Real pixel size, read from the file — used for the tile's aspect ratio. */
  width: number;
  height: number;
  /** True for cutouts with transparency (PNG/WebP/AVIF alpha, SVG). */
  transparent: boolean;
  format: 'png' | 'jpeg' | 'webp' | 'avif' | 'svg';
}

export const heroStickers: HeroStickerFile[] = heroStickerFiles;
