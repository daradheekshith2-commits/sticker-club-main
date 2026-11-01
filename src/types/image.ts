/**
 * An image the customer supplied, from either input method.
 * Shared by "Create your stickers" and "Build your own wall".
 */
export type PickedImage =
  | {
      source: 'upload';
      /** Temporary blob: URL (see utils/objectUrls.ts). Lost on page refresh. */
      objectUrl: string;
      fileName: string;
      width: number;
      height: number;
    }
  | {
      source: 'url';
      /** The original link, displayed as-is. We never download or store a copy. */
      url: string;
      width: number;
      height: number;
    };

/** The address to put in an <img> tag. */
export const imageSrc = (img: PickedImage) => (img.source === 'upload' ? img.objectUrl : img.url);
