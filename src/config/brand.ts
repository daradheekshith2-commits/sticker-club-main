/**
 * BRAND CONFIGURATION — the one file to edit when the business details change.
 *
 * Everything here is TEMPORARY. "STICKER CLUB" is a working name, not a final
 * brand decision. Contact fields are deliberately `null` until real accounts
 * exist: the site shows a clear "not set up yet" placeholder instead of
 * inventing an email address or social profile.
 */

export interface SocialLink {
  label: string;
  url: string;
}

export const brand = {
  /** Shown in the header, footer and page titles. */
  name: 'STICKER CLUB',
  /** Friendlier casing used inside sentences. */
  displayName: 'Sticker Club',
  tagline: 'Stick it. Hang it. Own it.',
  description:
    'Original stickers and posters for students: mini stickers, sticker sheets, themed packs, wall posters and ready-made wall packs.',
  city: 'Hyderabad',

  /**
   * The public website address once deployed, e.g. 'https://stickerclub.in'.
   * Printed QR codes (packaging inserts) are generated from this. While null,
   * QR codes are previews only and say so.
   */
  publicUrl: null as string | null,

  currency: 'INR',
  locale: 'en-IN',

  /**
   * True while this is a frontend prototype with no real ordering.
   * Drives the "prototype" notices in the cart, checkout and footer.
   */
  isPrototype: true,

  contact: {
    /** e.g. 'hello@yourbrand.in' — leave null until the inbox exists. */
    email: null as string | null,
    /** e.g. 'https://instagram.com/yourbrand' */
    instagramUrl: null as string | null,
    /** e.g. '@yourbrand' */
    instagramHandle: null as string | null,
    /** International format without '+', e.g. '919876543210'. Null until a business number is set up. */
    whatsappNumber: null as string | null,
    otherSocials: [] as SocialLink[],
  },

  /** Turn whole sections on or off without touching components. */
  features: {
    showPosters: true,
  },
};

/** Builds a wa.me link when a WhatsApp number is configured, otherwise null. */
export function whatsappLink(message?: string): string | null {
  const number = brand.contact.whatsappNumber;
  if (!number) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${number}${text}`;
}

/** True when at least one real way to reach the founders is configured. */
export function hasAnyContact(): boolean {
  const c = brand.contact;
  return Boolean(c.email || c.instagramUrl || c.whatsappNumber || c.otherSocials.length);
}
