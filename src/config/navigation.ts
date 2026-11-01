/**
 * MAIN MENU CONTENTS
 * The two dropdowns (Stickers, Posters) and the plain links next to them.
 * Edit labels and links here; SiteHeader.tsx only handles how they look.
 */
import { collections } from '../data/collections';
import { allSizes, shopUrl } from '../utils/catalogue';
import type { Category } from '../types/product';

export interface MenuLink {
  label: string;
  to: string;
  note?: string;
}

export interface MegaMenu {
  id: Category;
  label: string;
  /** Link for the menu's own "shop all" entry. */
  allLink: MenuLink;
  formats: MenuLink[];
  /** Small pill links, e.g. sizes. */
  pills?: { title: string; links: MenuLink[] };
  /** Product slug shown as a picture card in the menu. */
  promoSlug: string;
  promoLabel: string;
}

export const megaMenus: MegaMenu[] = [
  {
    id: 'stickers',
    label: 'Stickers',
    allLink: { label: 'All stickers', to: shopUrl({ category: 'stickers' }) },
    formats: [
      { label: 'Mini stickers', to: shopUrl({ types: ['single'] }), note: 'One design each' },
      { label: 'Sticker sheets', to: shopUrl({ types: ['sheet'] }), note: 'Many minis on one sheet' },
      { label: 'Sticker packs', to: shopUrl({ types: ['pack'] }), note: 'Themed bundles' },
      { label: 'Mystery pack', to: '/product/mystery-pack', note: '5 guaranteed + 1 mystery' },
      { label: 'Build your own pack', to: '/build-your-pack', note: 'Pick 5 or 10, get +1 surprise' },
      { label: 'Matching duos', to: '/matching-duos', note: 'Two stickers that go together' },
      { label: 'Secret messages', to: '/secret-messages', note: 'Sticker + sealed message card' },
      { label: 'Create your own stickers', to: '/create-your-stickers', note: 'Your image, made into a sticker' },
    ],
    promoSlug: 'mystery-pack',
    promoLabel: 'New · 5 guaranteed + 1 mystery',
  },
  {
    id: 'posters',
    label: 'Posters',
    allLink: { label: 'All posters', to: shopUrl({ category: 'posters' }) },
    formats: [
      { label: 'Single posters', to: shopUrl({ category: 'posters', types: ['poster'] }), note: 'Pick your size' },
      { label: 'Wall packs & sets', to: shopUrl({ category: 'posters', types: ['poster-set'] }), note: 'Matching prints, one price' },
      { label: 'Build your own wall', to: '/build-your-wall', note: 'Our designs + your photos' },
      { label: 'Photo collage', to: shopUrl({ types: ['collage'] }), note: 'Coming later' },
    ],
    pills: {
      title: 'Shop by size',
      links: allSizes().map((s) => ({ label: s, to: shopUrl({ category: 'posters', sizes: [s] }) })),
    },
    promoSlug: 'desk-wall-pack',
    promoLabel: 'Fill a wall',
  },
];

/** Vibe links used inside both menus, scoped to that category. */
export function vibeLinks(category: Category): MenuLink[] {
  return collections.map((c) => ({ label: c.name, to: shopUrl({ category, collections: [c.id] }) }));
}

export const plainLinks: MenuLink[] = [
  { label: 'Create your own', to: '/create-your-stickers' },
  { label: 'Vibes', to: '/vibes' },
  { label: 'About', to: '/about' },
];
