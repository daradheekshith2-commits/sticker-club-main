/**
 * IMAGE SOURCES for the wall builder: validating files and links.
 *
 * Nothing here uploads, downloads or scrapes anything. Files stay on the
 * customer's device (as temporary blob: URLs); links are only displayed by the
 * browser with an <img> tag.
 *
 * A pasted link only works when it points straight at an image file. Pages
 * such as a Pinterest Pin or a Google Images result are web pages, not images,
 * and we do not try to extract images from them.
 */

// ---------- Files ----------

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const ACCEPT_ATTRIBUTE = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB

export type FileCheck = { ok: true } | { ok: false; message: string };

export function validateImageFile(file: { type: string; size: number; name: string }): FileCheck {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, message: `“${file.name}” isn’t a supported image. Please use a JPG, PNG or WebP file.` };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return { ok: false, message: `“${file.name}” is ${mb} MB. The limit is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.` };
  }
  if (file.size === 0) return { ok: false, message: `“${file.name}” is empty.` };
  return { ok: true };
}

// ---------- Links ----------

// ---- Customer-facing copy (exact wording agreed for both configurators) ----
export const URL_GUIDANCE = 'Paste a direct link to an image, such as JPG, PNG or WebP.';
export const URL_PAGE_EXPLANATION =
  'Pinterest Pins and Google Images search results link to webpages, not the image itself. For those, download the image and upload the file instead.';
/** Shown whenever a link can't be used as an image: invalid, a web page, or it failed to load. */
export const NOT_DIRECT_IMAGE_MESSAGE =
  "This link doesn't appear to be a direct image. Upload the image file or paste a publicly accessible image URL. (Pinterest page links open a web page, not the image itself.)";

export type UrlCheck =
  | { ok: true; url: string }
  /** `message` is always shown; `hint` (optional) adds a specific tip under it. */
  | { ok: false; reason: 'empty' | 'invalid' | 'scheme' | 'page'; message: string; hint?: string };

/**
 * Known web PAGES that are often mistaken for images. Image CDN hosts such as
 * i.pinimg.com are deliberately NOT listed — those links are real images.
 */
const pagePatterns: { test: (u: URL) => boolean; site: string }[] = [
  { site: 'Pinterest', test: (u) => /(^|\.)pinterest\.[a-z.]+$/.test(u.hostname) || u.hostname === 'pin.it' },
  {
    site: 'Google',
    test: (u) =>
      (/(^|\.)google\.[a-z.]+$/.test(u.hostname) && /^\/(search|imgres|url)/.test(u.pathname)) || u.hostname === 'share.google',
  },
];

/**
 * Specific tips for things people paste that aren't web links. The main
 * message stays the agreed wording; the tip says what was pasted and what to do.
 */
export function schemeHint(raw: string): string {
  if (/^[a-z]:[\\/]/i.test(raw) || /^\\\\/.test(raw) || /^file:/i.test(raw)) {
    return 'That’s a file on your computer, not a web link. Use the Upload tab to add it instead.';
  }
  if (/^data:/i.test(raw)) {
    return 'That’s image data copied from a web page (Google Images thumbnails do this), not a link. Save the image to your device and upload the file instead.';
  }
  if (/^blob:/i.test(raw)) {
    return 'That’s a temporary link that only works inside the page it came from. Save the image to your device and upload the file instead.';
  }
  return 'Only http:// and https:// links are supported.';
}

/** "www.site.com/a.jpg" or "i.pinimg.com/…" — a web address missing its https:// */
const looksLikeBareAddress = (s: string) => /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?(\/\S*)?$/i.test(s);

/** Checks a pasted link before we try to show it. Does not contact the site. */
export function validateImageUrl(input: string): UrlCheck {
  let raw = input.trim();
  if (!raw) return { ok: false, reason: 'empty', message: 'Paste an image link first.' };
  if (raw.startsWith('//')) raw = `https:${raw}`;
  else if (looksLikeBareAddress(raw)) raw = `https://${raw}`;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: 'invalid', message: NOT_DIRECT_IMAGE_MESSAGE, hint: 'A complete link starts with https://' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { ok: false, reason: 'scheme', message: NOT_DIRECT_IMAGE_MESSAGE, hint: schemeHint(raw) };
  }
  if (!url.hostname.includes('.') && url.hostname !== 'localhost') {
    return { ok: false, reason: 'invalid', message: NOT_DIRECT_IMAGE_MESSAGE, hint: 'A complete link starts with https://' };
  }
  const page = pagePatterns.find((p) => p.test(url));
  if (page) {
    return { ok: false, reason: 'page', message: NOT_DIRECT_IMAGE_MESSAGE, hint: `${page.site} links open a web page. ${URL_PAGE_EXPLANATION}` };
  }
  return { ok: true, url: url.href };
}

// ---------- Resolving a link to something displayable ----------

export interface ResolvedImage {
  /** URL to display. */
  src: string;
  width: number;
  height: number;
}

/**
 * Turns a validated link into a displayable image. Only the direct resolver
 * exists today. A future, approved integration (e.g. an official Pinterest
 * API on a backend) can be added as another resolver without touching the UI.
 */
export interface ImageResolver {
  name: string;
  canResolve(url: URL): boolean;
  resolve(url: URL): Promise<ResolvedImage>;
}

/** Loads an image in the browser to confirm it exists and read its size. */
export function loadImage(src: string, timeoutMs = 20000): Promise<ResolvedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = window.setTimeout(() => {
      img.src = '';
      reject(new Error('timeout'));
    }, timeoutMs);
    img.onload = () => {
      window.clearTimeout(timer);
      if (!img.naturalWidth || !img.naturalHeight) reject(new Error('empty'));
      else resolve({ src, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error('load-failed'));
    };
    img.referrerPolicy = 'no-referrer';
    img.src = src;
  });
}

export const directImageResolver: ImageResolver = {
  name: 'direct',
  canResolve: () => true,
  resolve: (url) => loadImage(url.href),
};

/** Ordered list; the first resolver that can handle a URL is used. */
export const imageResolvers: ImageResolver[] = [directImageResolver];

export async function resolveImageUrl(href: string): Promise<ResolvedImage> {
  const url = new URL(href);
  const resolver = imageResolvers.find((r) => r.canResolve(url))!;
  return resolver.resolve(url);
}
