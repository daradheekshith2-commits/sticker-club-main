import type { PosterDesign, Product, StickerDesign, Variant } from '../types/product';
import type { RarityId } from '../types/collectible';
import { series } from './rarity';

/**
 * DEMO CATALOGUE — stickers and posters
 * ---------------------------------------------------------------------------
 * Every product, price and description lives in this one file.
 * - Prices are TEST prices from the pricing plan, not final selling prices.
 * - Size, material and finish are intentionally left out: add them only once
 *   a supplier has confirmed them (the product page then shows them).
 * - All artwork is original and drawn in SVG from the `art` descriptions.
 *   To use real photos, add an `images` array to a product.
 */

// Colour shortcuts so the designs below stay readable.
const ink = '#121212';
const paper = '#F5F0E6';
const white = '#FFFFFF';
const lime = '#D4FF3A';
const tomato = '#FF5B2E';
const bubble = '#FFB3D1';
const sky = '#8FD3FF';
const grape = '#8A6CFF';
const sun = '#FFD447';
const mint = '#7FE0B5';
const kraft = '#D9B98C';

// ---------- Individual sticker designs (reused inside sheets and packs) ----------
export const d = {
  chaiFirst: { name: 'Chai First', motif: 'chai', label: 'CHAI FIRST', shape: 'circle', bg: sun, fg: ink, accent: tomato },
  worksOnMyMachine: { name: 'Works On My Machine', label: 'WORKS ON\nMY MACHINE', shape: 'pill', bg: ink, fg: lime, accent: lime },
  seventyFive: { name: '75% Club', label: '75%\nCLUB', shape: 'badge', bg: tomato, fg: white, accent: sun },
  jugaad: { name: 'Jugaad Certified', label: 'JUGAAD\nCERTIFIED', shape: 'badge', bg: lime, fg: ink, accent: ink },
  pixelHeart: { name: 'Pixel Heart', motif: 'pixelHeart', shape: 'rounded', bg: grape, fg: tomato, accent: white },
  redline: { name: 'Redline Coupe', motif: 'car', shape: 'pill', bg: sky, fg: ink, accent: tomato },
  sleepyCloud: { name: 'Sleepy Cloud', motif: 'cloud', shape: 'blob', bg: bubble, fg: white, accent: tomato },
  cassette: { name: 'Side A', motif: 'cassette', shape: 'rounded', bg: mint, fg: ink, accent: sun },
  sparkle: { name: 'Tiny Sparkle', motif: 'sparkle', shape: 'circle', bg: ink, fg: paper, accent: lime },
  doItScared: { name: 'Do It Scared', motif: 'bolt', label: 'DO IT SCARED', shape: 'circle', bg: paper, fg: ink, accent: sun },
  apex: { name: 'Apex Flag', motif: 'flag', shape: 'rounded', bg: lime, fg: ink, accent: white },
  bug: { name: 'Little Bug', motif: 'bug', shape: 'circle', bg: lime, fg: ink, accent: tomato },
  code: { name: 'Angle Brackets', motif: 'code', shape: 'rounded', bg: sky, fg: ink, accent: tomato },
  deadline: { name: 'Deadline Clock', motif: 'clock', label: 'BAS 5 MIN', shape: 'circle', bg: white, fg: ink, accent: tomato },
  books: { name: 'Book Stack', motif: 'books', shape: 'blob', bg: sky, fg: ink, accent: sun },
  backbencher: { name: 'Backbencher', label: 'BACK\nBENCHER', shape: 'pill', bg: grape, fg: white, accent: sun },
  oneMoreEp: { name: 'One More Episode', motif: 'moon', label: 'ONE MORE EP', shape: 'circle', bg: ink, fg: sun, accent: white },
  samosa: { name: 'Samosa Hour', motif: 'samosa', shape: 'blob', bg: mint, fg: ink, accent: sun },
  ekNumber: { name: 'Ek Number', label: 'EK\nNUMBER', shape: 'circle', bg: tomato, fg: white, accent: ink },
  adjust: { name: 'Adjust Kar Lo', label: 'ADJUST\nKAR LO', shape: 'pill', bg: sun, fg: ink, accent: ink },
  helmet: { name: 'Lid On', motif: 'helmet', shape: 'circle', bg: tomato, fg: ink, accent: white },
  flagTwo: { name: 'Chequered', motif: 'flag', shape: 'pill', bg: white, fg: ink, accent: lime },
  pitLane: { name: 'Pit Lane', label: 'PIT\nLANE', shape: 'badge', bg: ink, fg: lime, accent: lime },
  controller: { name: 'Pocket Controller', motif: 'controller', shape: 'rounded', bg: lime, fg: ink, accent: tomato },
  pressStart: { name: 'Press Start', label: 'PRESS\nSTART', shape: 'pill', bg: ink, fg: tomato, accent: tomato },
  lifeUp: { name: '1-Up Heart', motif: 'pixelHeart', shape: 'circle', bg: sun, fg: tomato, accent: white },
  cat: { name: 'Window Cat', motif: 'cat', shape: 'blob', bg: sun, fg: ink, accent: bubble },
  smiley: { name: 'Soft Smile', motif: 'smiley', shape: 'circle', bg: bubble, fg: ink, accent: sun },
  headphones: { name: 'Headphones On', motif: 'headphones', shape: 'rounded', bg: bubble, fg: ink, accent: grape },
  softDays: { name: 'Soft Days', label: 'SOFT\nDAYS', shape: 'blob', bg: mint, fg: ink, accent: white },
  // rare (demo classification)
  midnightChai: { name: 'Midnight Chai', motif: 'chai', shape: 'badge', bg: ink, fg: lime, accent: sun },
  ghostBug: { name: 'Ghost Bug', motif: 'bug', shape: 'rounded', bg: grape, fg: white, accent: lime },
  goldenCassette: { name: 'Golden Hour Tape', motif: 'cassette', shape: 'rounded', bg: sun, fg: ink, accent: tomato },
  polePosition: { name: 'Pole Position', motif: 'flag', shape: 'badge', bg: tomato, fg: ink, accent: white },
  // limited edition concepts
  foundersBolt: { name: 'Founders’ Bolt', motif: 'bolt', shape: 'badge', bg: ink, fg: lime, accent: lime },
  dropOne: { name: 'Drop 01', label: 'DROP\n01', shape: 'circle', bg: lime, fg: ink, accent: ink },
  // matching duos
  dayCat: { name: 'Window Cat (awake)', motif: 'cat', shape: 'blob', bg: sun, fg: ink, accent: bubble },
  napCat: { name: 'Window Cat (napping)', motif: 'catNap', shape: 'blob', bg: sky, fg: ink, accent: bubble },
  plug: { name: 'Plug', motif: 'plug', shape: 'rounded', bg: lime, fg: ink, accent: tomato },
  socket: { name: 'Socket', motif: 'socket', shape: 'rounded', bg: ink, fg: lime, accent: tomato },
  halfHeart: { name: 'Half a Heart', motif: 'pixelHeart', shape: 'circle', bg: bubble, fg: tomato, accent: white },
  nightShiftLaptop: { name: 'Night Shift (laptop)', motif: 'moon', label: 'NIGHT SHIFT', shape: 'circle', bg: ink, fg: sun, accent: lime },
  nightShiftPhone: { name: 'Night Shift (phone)', motif: 'moon', shape: 'pill', bg: ink, fg: sun, accent: lime },
  // secret message stickers (original phrases)
  mainCharacter: { name: 'Main Character Energy', label: 'MAIN\nCHARACTER\nENERGY', shape: 'circle', bg: sun, fg: ink, accent: tomato },
  loading: { name: 'Loading…', motif: 'loading', label: 'LOADING…', shape: 'pill', bg: ink, fg: lime, accent: lime },
  doNotDisturb: { name: 'Do Not Disturb', label: 'DO NOT\nDISTURB', shape: 'rounded', bg: tomato, fg: white, accent: sun },
  socialBattery: { name: 'Social Battery Low', motif: 'battery', label: 'SOCIAL BATTERY', shape: 'circle', bg: mint, fg: ink, accent: tomato },
  itCompiled: { name: 'It Compiled', label: 'IT\nCOMPILED.', shape: 'pill', bg: sky, fg: ink, accent: tomato },
  tinySteps: { name: 'Tiny Steps Count', label: 'TINY\nSTEPS\nCOUNT', shape: 'blob', bg: bubble, fg: ink, accent: white },
  // anime-inspired (original characters and props)
  sparkleEyes: { name: 'Sparkle Eyes', motif: 'animeFace', shape: 'circle', bg: bubble, fg: grape, accent: tomato },
  ramenBreak: { name: 'Ramen Break', motif: 'ramen', shape: 'blob', bg: sun, fg: ink, accent: tomato },
  speedStar: { name: 'Speed Star', motif: 'speedStar', shape: 'badge', bg: ink, fg: sun, accent: white },
  plotTwist: { name: 'Plot Twist!?', label: 'PLOT\nTWIST!?', shape: 'rounded', bg: tomato, fg: white, accent: sun },
  // movies (original props, no film titles or posters)
  takeOne: { name: 'Take One', motif: 'clapper', shape: 'rounded', bg: white, fg: ink, accent: tomato },
  admitOne: { name: 'Admit One', motif: 'ticket', label: 'ADMIT ONE', shape: 'pill', bg: sun, fg: ink, accent: tomato },
  popcorn: { name: 'Popcorn Hour', motif: 'popcorn', shape: 'circle', bg: sky, fg: tomato, accent: white },
  // life quotes (original phrases)
  kindOverCool: { name: 'Kind Over Cool', label: 'KIND\nOVER\nCOOL', shape: 'circle', bg: mint, fg: ink, accent: white },
  stillBecoming: { name: 'Still Becoming', motif: 'quoteMarks', label: 'STILL BECOMING', shape: 'rounded', bg: paper, fg: ink, accent: tomato },
  // superhero-inspired: ORIGINAL characters and marks only (no licensed characters or logos)
  capeMode: { name: 'Cape Mode', motif: 'hero', shape: 'rounded', bg: grape, fg: ink, accent: tomato },
  kaPow: { name: 'Ka-Pow!', label: 'KA-\nPOW!', shape: 'badge', bg: sun, fg: tomato, accent: ink },
  heroEmblem: { name: 'Hero Emblem', motif: 'emblem', shape: 'circle', bg: tomato, fg: ink, accent: sun },
  // devotion (spiritual & sacred art)
  omLotus: { name: 'Sacred Om', motif: 'sparkle', shape: 'circle', bg: sun, fg: ink, accent: tomato },
  shivaTrishul: { name: 'Mahadev Trishul', motif: 'sparkle', shape: 'badge', bg: sky, fg: ink, accent: white },
  bansuriFlute: { name: 'Divine Bansuri', motif: 'sparkle', shape: 'pill', bg: mint, fg: ink, accent: sun },
  ganeshaBless: { name: 'Vighnaharta Ganesha', motif: 'sparkle', shape: 'circle', bg: tomato, fg: white, accent: sun },
  hanumanSanjeevani: { name: 'Sankatmochan', motif: 'bolt', shape: 'rounded', bg: sun, fg: tomato, accent: ink },
  // sports (athletic icons & stadium moments)
  cricketFever: { name: 'Cricket Stadium', motif: 'bolt', shape: 'circle', bg: mint, fg: ink, accent: white },
  jerseySeven: { name: 'Legend Jersey 7', motif: 'bolt', shape: 'badge', bg: sky, fg: ink, accent: sun },
  slamDunk: { name: 'Slam Dunk', motif: 'speedStar', shape: 'pill', bg: tomato, fg: white, accent: sun },
  goldenBoot: { name: 'Golden Goal', motif: 'flag', shape: 'rounded', bg: sun, fg: ink, accent: tomato },
  runnerStride: { name: 'Never Stop Running', motif: 'bolt', shape: 'circle', bg: lime, fg: ink, accent: ink },
} satisfies Record<string, StickerDesign>;

/**
 * Builds a single mini-sticker product so the many singles below stay short.
 * `rarity` and `seriesId` are DEMO classifications (see src/data/rarity.ts).
 */
function single(p: {
  id: string; slug: string; design: StickerDesign; shortDescription: string; description: string; price: number;
  collections: Product['collections']; tags: string[]; backdrop: string; seriesId: string; rarity: RarityId;
  displayOrder: number; featured?: boolean; isNew?: boolean;
}): Product {
  return {
    id: p.id, slug: p.slug, name: p.design.name, shortDescription: p.shortDescription, description: p.description,
    price: p.price, category: 'stickers', productType: 'single', collections: p.collections, tags: p.tags,
    featured: p.featured ?? false, isNew: p.isNew ?? false, displayOrder: p.displayOrder, status: 'demo',
    rarity: p.rarity, seriesId: p.seriesId,
    art: { kind: 'single', backdrop: p.backdrop, design: p.design },
  };
}

// ---------- Poster sizes ----------
// Standard ISO paper sizes calculated via 1 cm² = 0.8 rs formula
export const posterSizes: Variant[] = [
  { id: 'a5', label: 'A5', detail: '14.8 × 21 cm', price: 249 },
  { id: 'a4', label: 'A4', detail: '21 × 29.7 cm', price: 499 },
  { id: 'a3', label: 'A3', detail: '29.7 × 42 cm', price: 998 },
];

/** Builds a single-poster product with the standard sizes, so each poster entry stays short. */
function poster(p: {
  id: string; slug: string; name: string; shortDescription: string; description: string;
  collections: Product['collections']; tags: string[]; featured: boolean; isNew: boolean; displayOrder: number;
  design: PosterDesign; backdrop: string;
}): Product {
  return {
    id: p.id, slug: p.slug, name: p.name, shortDescription: p.shortDescription, description: p.description,
    price: Math.min(...posterSizes.map((s) => s.price)),
    variants: posterSizes,
    category: 'posters', productType: 'poster', collections: p.collections, tags: ['poster', ...p.tags],
    featured: p.featured, isNew: p.isNew, displayOrder: p.displayOrder, status: 'demo',
    art: { kind: 'poster', backdrop: p.backdrop, poster: p.design },
  };
}

// ---------- Products ----------
export const products: Product[] = [
  // ===== Individual mini stickers =====
  {
    id: 'stk-001', slug: 'chai-first', name: 'Chai First',
    shortDescription: 'A round reminder of life’s real priority.',
    description: 'A sunny round sticker for anyone whose day doesn’t begin until the chai does. Made for laptop lids, notebooks and the flask you carry to every lab.',
    price: 20, category: 'stickers', productType: 'single', collections: [],
    tags: ['chai', 'desi', 'funny', 'round'], featured: true, isNew: true, displayOrder: 1, status: 'demo', rarity: 'common', seriesId: 'S01',
    art: { kind: 'single', backdrop: '#FFE9A8', design: d.chaiFirst },
  },
  {
    id: 'stk-002', slug: 'works-on-my-machine', name: 'Works On My Machine',
    shortDescription: 'The developer’s favourite defence, in sticker form.',
    description: 'A lime-on-black pill sticker for every coder who has ever said it with a straight face. Looks great next to your other dev stickers.',
    price: 20, category: 'stickers', productType: 'single', collections: [],
    tags: ['coding', 'developer', 'funny', 'text'], featured: true, isNew: false, displayOrder: 2, status: 'demo', rarity: 'common', seriesId: 'S02',
    art: { kind: 'single', backdrop: '#D6F0FF', design: d.worksOnMyMachine },
  },
  {
    id: 'stk-003', slug: 'seventy-five-percent-club', name: '75% Club',
    shortDescription: 'For those who calculate attendance to the decimal.',
    description: 'A scalloped badge celebrating the bare minimum, achieved with precision. A small, loud sticker for the back of a notebook.',
    price: 20, category: 'stickers', productType: 'single', collections: [],
    tags: ['attendance', 'college', 'funny', 'badge'], featured: true, isNew: true, displayOrder: 3, status: 'demo', rarity: 'common', seriesId: 'S01',
    art: { kind: 'single', backdrop: '#FFD9CC', design: d.seventyFive },
  },
  {
    id: 'stk-004', slug: 'jugaad-certified', name: 'Jugaad Certified',
    shortDescription: 'Official recognition for creative problem solving.',
    description: 'A lime badge for people who can fix anything with a rubber band and confidence.',
    price: 20, category: 'stickers', productType: 'single', collections: [],
    tags: ['jugaad', 'desi', 'funny', 'badge'], featured: true, isNew: false, displayOrder: 4, status: 'demo', rarity: 'common', seriesId: 'S01',
    art: { kind: 'single', backdrop: '#EEFFC2', design: d.jugaad },
  },
  {
    id: 'stk-005', slug: 'pixel-heart', name: 'Pixel Heart',
    shortDescription: 'An original 8-bit heart on a grape square.',
    description: 'Hand-placed pixels, one full heart. A small square sticker that fits in the gaps between bigger ones.',
    price: 15, category: 'stickers', productType: 'single', collections: ['gaming', 'cute'],
    tags: ['pixel', 'gaming', 'heart', 'square'], featured: true, isNew: false, displayOrder: 5, status: 'demo', rarity: 'uncommon', seriesId: 'S04',
    art: { kind: 'single', backdrop: '#E2DAFF', design: d.pixelHeart },
  },
  {
    id: 'stk-006', slug: 'redline-coupe', name: 'Redline Coupe',
    shortDescription: 'An original little coupe with a tomato stripe.',
    description: 'A clean side-profile coupe drawn from scratch — no badges, no brands, just the shape. For car people and people who wish they were.',
    price: 25, category: 'stickers', productType: 'single', collections: ['quotes'],
    tags: ['car', 'automotive', 'illustration', 'pill'], featured: true, isNew: true, displayOrder: 6, status: 'demo', rarity: 'uncommon', seriesId: 'S04',
    art: { kind: 'single', backdrop: '#D6F0FF', design: d.redline },
  },
  {
    id: 'stk-007', slug: 'sleepy-cloud', name: 'Sleepy Cloud',
    shortDescription: 'A pink blob holding a very tired cloud.',
    description: 'For 8 AM lectures and everyone who feels them deeply. Soft colours, rounded edges.',
    price: 15, category: 'stickers', productType: 'single', collections: ['cute'],
    tags: ['cute', 'aesthetic', 'cloud', 'pastel'], featured: true, isNew: false, displayOrder: 7, status: 'demo', rarity: 'common', seriesId: 'S03',
    art: { kind: 'single', backdrop: '#FFE0EC', design: d.sleepyCloud },
  },
  {
    id: 'stk-008', slug: 'side-a-cassette', name: 'Side A',
    shortDescription: 'A mint cassette for your loudest playlist.',
    description: 'A rounded-square cassette sticker for music people. Pairs well with headphones and a long bus ride.',
    price: 20, category: 'stickers', productType: 'single', collections: ['music'],
    tags: ['music', 'cassette', 'retro'], featured: false, isNew: false, displayOrder: 8, status: 'demo', rarity: 'uncommon', seriesId: 'S03',
    art: { kind: 'single', backdrop: '#D3F6E6', design: d.cassette },
  },
  {
    id: 'stk-009', slug: 'tiny-sparkle', name: 'Tiny Sparkle',
    shortDescription: 'A minimal four-point star. Goes with everything.',
    description: 'The quiet one in the collection. A simple sparkle on black that fills a gap on any laptop layout.',
    price: 15, category: 'stickers', productType: 'single', collections: ['minimal'],
    tags: ['minimal', 'icon', 'star'], featured: false, isNew: false, displayOrder: 9, status: 'demo', rarity: 'common', seriesId: 'S02',
    art: { kind: 'single', backdrop: '#E9E3D6', design: d.sparkle },
  },
  {
    id: 'stk-010', slug: 'do-it-scared', name: 'Do It Scared',
    shortDescription: 'A pocket-sized push before exams and interviews.',
    description: 'A lightning bolt and three words for the moments you need them. Small enough for a phone case, bold enough to notice.',
    price: 20, category: 'stickers', productType: 'single', collections: ['motivation', 'minimal'],
    tags: ['motivation', 'text', 'bolt'], featured: true, isNew: true, displayOrder: 10, status: 'demo', rarity: 'common', seriesId: 'S01',
    art: { kind: 'single', backdrop: '#FFF0B8', design: d.doItScared },
  },
  {
    id: 'stk-011', slug: 'apex-flag', name: 'Apex Flag',
    shortDescription: 'A chequered flag for track-day dreamers.',
    description: 'An original motorsport-inspired chequered flag on lime. No team logos — just the finish line.',
    price: 25, category: 'stickers', productType: 'single', collections: ['quotes'],
    tags: ['motorsport', 'racing', 'flag'], featured: false, isNew: false, displayOrder: 11, status: 'demo', rarity: 'common', seriesId: 'S04',
    art: { kind: 'single', backdrop: '#EEFFC2', design: d.apex },
  },

  single({ id: 'stk-012', slug: 'deadline-clock', design: d.deadline, price: 20, collections: [], tags: ['deadline', 'college', 'funny', 'clock'], backdrop: '#FFFFFF', seriesId: 'S01', rarity: 'common', displayOrder: 20,
    shortDescription: '“Bas 5 min” — the most optimistic clock in college.', description: 'A round clock sticker for everyone who has ever submitted at 11:59 PM. Pairs well with the 75% Club.' }),
  single({ id: 'stk-013', slug: 'backbencher', design: d.backbencher, price: 20, collections: [], tags: ['college', 'text', 'funny'], backdrop: '#E2DAFF', seriesId: 'S01', rarity: 'common', displayOrder: 21,
    shortDescription: 'Last bench, best view.', description: 'A grape pill sticker for the row that knows everything that happens in class.' }),
  single({ id: 'stk-014', slug: 'samosa-hour', design: d.samosa, price: 20, collections: [], tags: ['samosa', 'desi', 'food'], backdrop: '#D3F6E6', seriesId: 'S01', rarity: 'uncommon', displayOrder: 22,
    shortDescription: 'An original samosa on mint, for the 4 PM canteen run.', description: 'A blob-shaped sticker for the snack break that holds the timetable together.' }),
  single({ id: 'stk-015', slug: 'ek-number', design: d.ekNumber, price: 20, collections: [], tags: ['desi', 'text', 'funny'], backdrop: '#FFD9CC', seriesId: 'S01', rarity: 'common', displayOrder: 23,
    shortDescription: 'The highest compliment, in two words.', description: 'A round tomato sticker for things — and people — that are simply ek number.' }),
  single({ id: 'stk-016', slug: 'little-bug', design: d.bug, price: 15, collections: [], tags: ['coding', 'bug', 'developer'], backdrop: '#EEFFC2', seriesId: 'S02', rarity: 'common', displayOrder: 24,
    shortDescription: 'A friendly bug. Still a bug.', description: 'A small lime circle sticker for the bug you’ll fix tomorrow. Probably.' }),
  single({ id: 'stk-017', slug: 'angle-brackets', design: d.code, price: 15, collections: ['minimal'], tags: ['coding', 'html', 'icon'], backdrop: '#D6F0FF', seriesId: 'S02', rarity: 'common', displayOrder: 25,
    shortDescription: 'Angle brackets on sky blue.', description: 'A clean rounded-square icon for anyone who writes code — or wants people to think so.' }),
  single({ id: 'stk-018', slug: 'one-more-episode', design: d.oneMoreEp, price: 20, collections: ['music'], tags: ['night', 'moon', 'funny'], backdrop: '#E9E3D6', seriesId: 'S02', rarity: 'common', displayOrder: 26,
    shortDescription: 'It’s 2 AM. One more.', description: 'A moon-and-type sticker for late nights spent building, studying or not sleeping.' }),
  single({ id: 'stk-019', slug: 'window-cat', design: d.cat, price: 20, collections: ['cute'], tags: ['cat', 'cute', 'aesthetic'], backdrop: '#FFF0B8', seriesId: 'S03', rarity: 'common', displayOrder: 27,
    shortDescription: 'An original cat, watching the world.', description: 'A sunny blob sticker of a cat with opinions. Drawn by us, not borrowed from any cartoon.' }),
  single({ id: 'stk-020', slug: 'soft-smile', design: d.smiley, price: 15, collections: ['cute', 'minimal'], tags: ['smile', 'cute', 'pastel'], backdrop: '#FFE0EC', seriesId: 'S03', rarity: 'common', displayOrder: 28,
    shortDescription: 'A small, soft smile.', description: 'A pastel circle sticker for days that need one.' }),
  single({ id: 'stk-021', slug: 'headphones-on', design: d.headphones, price: 20, collections: ['music'], tags: ['music', 'headphones'], backdrop: '#FFE0EC', seriesId: 'S03', rarity: 'common', displayOrder: 29,
    shortDescription: 'Headphones on, world off.', description: 'A rounded-square sticker for the bus ride, the library and the hostel corridor.' }),
  single({ id: 'stk-022', slug: 'lid-on', design: d.helmet, price: 25, collections: ['quotes'], tags: ['helmet', 'bikes', 'safety'], backdrop: '#FFD9CC', seriesId: 'S04', rarity: 'common', displayOrder: 30,
    shortDescription: 'An original helmet. Wear yours.', description: 'A round tomato sticker for riders. No brand logos — just a helmet and a good habit.' }),
  single({ id: 'stk-023', slug: 'pit-lane', design: d.pitLane, price: 20, collections: ['quotes'], tags: ['motorsport', 'text', 'racing'], backdrop: '#EEFFC2', seriesId: 'S04', rarity: 'uncommon', displayOrder: 31,
    shortDescription: 'Pit-lane type on a black badge.', description: 'A scalloped badge for track-day dreamers and anyone who parks like it’s a pit stop.' }),
  single({ id: 'stk-024', slug: 'pocket-controller', design: d.controller, price: 20, collections: ['gaming'], tags: ['gaming', 'controller'], backdrop: '#EEFFC2', seriesId: 'S04', rarity: 'common', displayOrder: 32,
    shortDescription: 'An original pocket controller.', description: 'A lime rounded-square sticker. Original drawing — no console or game logos.' }),
  single({ id: 'stk-025', slug: 'press-start', design: d.pressStart, price: 20, collections: ['gaming'], tags: ['gaming', 'arcade', 'text'], backdrop: '#E9E3D6', seriesId: 'S04', rarity: 'common', displayOrder: 33,
    shortDescription: 'Arcade-style type for your next start.', description: 'A black pill sticker with tomato type. Good on a laptop lid before exams, interviews and new semesters.' }),

  // ===== Anime-inspired (original characters — no existing anime characters) =====
  single({ id: 'stk-026', slug: 'sparkle-eyes', design: d.sparkleEyes, price: 25, collections: ['anime'], tags: ['anime', 'character', 'kawaii', 'original'], backdrop: '#FFE0EC', seriesId: 'S05', rarity: 'common', displayOrder: 34, isNew: true, featured: true,
    shortDescription: 'An original character with very big feelings.', description: 'Our own anime-inspired character — star clip, sparkly eyes, zero chill. Drawn by us, not taken from any show.' }),
  single({ id: 'stk-027', slug: 'ramen-break', design: d.ramenBreak, price: 20, collections: ['anime'], tags: ['anime', 'ramen', 'food', 'original'], backdrop: '#FFF0B8', seriesId: 'S05', rarity: 'common', displayOrder: 35, isNew: true,
    shortDescription: 'A steaming bowl for the filler episode.', description: 'A blob sticker of a ramen bowl, egg and chopsticks — every anime’s favourite break.' }),
  single({ id: 'stk-028', slug: 'speed-star', design: d.speedStar, price: 20, collections: ['anime'], tags: ['anime', 'star', 'action', 'original'], backdrop: '#E9E3D6', seriesId: 'S05', rarity: 'common', displayOrder: 36, isNew: true,
    shortDescription: 'A star moving at plot speed.', description: 'A yellow star with action lines on a black badge. For laptops that are always mid-episode.' }),
  single({ id: 'stk-029', slug: 'plot-twist', design: d.plotTwist, price: 20, collections: ['anime'], tags: ['anime', 'text', 'reaction', 'original'], backdrop: '#FFD9CC', seriesId: 'S05', rarity: 'uncommon', displayOrder: 37, isNew: true,
    shortDescription: 'The reaction face, in sticker form.', description: 'A tomato rounded-square with the only acceptable response to episode twelve.' }),
  poster({
    id: 'pst-014', slug: 'final-arc-poster', name: 'Final Arc',
    shortDescription: 'Our original character on a sunburst.',
    description: 'Sparkle Eyes, wall-sized, on a sunburst of pink. An original anime-inspired print for the room where you binge.',
    collections: ['anime'], tags: ['anime', 'character', 'original'], featured: false, isNew: true, displayOrder: 111,
    design: { title: 'FINAL\nARC', bg: bubble, fg: ink, accent: grape, motif: 'animeFace', pattern: 'sun' }, backdrop: '#FFE0EC',
  }),

  // ===== Movies (original film props — no film titles, stills or logos) =====
  single({ id: 'stk-030', slug: 'take-one', design: d.takeOne, price: 20, collections: ['movies'], tags: ['movies', 'film', 'clapperboard'], backdrop: '#D6F0FF', seriesId: 'S05', rarity: 'common', displayOrder: 38, isNew: true, featured: true,
    shortDescription: 'Scene one, take one. Action.', description: 'A clapperboard sticker for film students, movie nights and anyone who narrates their own life.' }),
  single({ id: 'stk-031', slug: 'admit-one', design: d.admitOne, price: 20, collections: ['movies'], tags: ['movies', 'ticket', 'cinema'], backdrop: '#FFF0B8', seriesId: 'S05', rarity: 'common', displayOrder: 39, isNew: true,
    shortDescription: 'A ticket that never expires.', description: 'A sunny pill-shaped cinema ticket. Valid for one more first-day-first-show.' }),
  single({ id: 'stk-032', slug: 'popcorn-hour', design: d.popcorn, price: 20, collections: ['movies'], tags: ['movies', 'popcorn', 'snack'], backdrop: '#D6F0FF', seriesId: 'S05', rarity: 'common', displayOrder: 40, isNew: true,
    shortDescription: 'Interval essentials.', description: 'A striped popcorn bucket on sky blue — the real reason anyone goes to the movies.' }),
  poster({
    id: 'pst-015', slug: 'midnight-show-poster', name: 'Midnight Show',
    shortDescription: 'A clapperboard under stage-light stripes.',
    description: 'An original typographic film poster for late screenings and movie-night corners. No film titles, stills or logos.',
    collections: ['movies'], tags: ['movies', 'cinema', 'typography'], featured: false, isNew: true, displayOrder: 112,
    design: { title: 'MIDNIGHT\nSHOW', bg: ink, fg: sun, accent: tomato, motif: 'clapper', pattern: 'stripes' }, backdrop: '#D6F0FF',
  }),

  // ===== Life quotes (original phrases) =====
  single({ id: 'stk-033', slug: 'kind-over-cool', design: d.kindOverCool, price: 20, collections: [], tags: ['quote', 'text', 'kindness'], backdrop: '#D3F6E6', seriesId: 'S03', rarity: 'common', displayOrder: 41, isNew: true,
    shortDescription: 'A small rule for big days.', description: 'Three words on a mint circle. A quiet reminder for your bottle, laptop or notebook.' }),
  single({ id: 'stk-034', slug: 'still-becoming', design: d.stillBecoming, price: 20, collections: [], tags: ['quote', 'text', 'growth'], backdrop: '#FFD9CC', seriesId: 'S03', rarity: 'common', displayOrder: 42, isNew: true,
    shortDescription: 'Work in progress, proudly.', description: 'Big quote marks and two words for anyone figuring it out. Original phrase and lettering.' }),

  // ===== Superhero-inspired =====
  single({ id: 'stk-035', slug: 'cape-mode', design: d.capeMode, price: 20, collections: ['marvel'], tags: ['superhero', 'hero'], backdrop: '#E2DAFF', seriesId: 'S05', rarity: 'common', displayOrder: 43, isNew: true, featured: true,
    shortDescription: 'An original masked hero, cape out.', description: 'Our own masked hero with a tomato cape.' }),
  single({ id: 'stk-036', slug: 'ka-pow', design: d.kaPow, price: 20, collections: ['marvel'], tags: ['superhero', 'comic', 'text'], backdrop: '#FFF0B8', seriesId: 'S05', rarity: 'common', displayOrder: 44, isNew: true,
    shortDescription: 'A comic-book sound effect for your laptop.', description: 'Bold comic lettering on a scalloped sun badge.' }),
  single({ id: 'stk-037', slug: 'hero-emblem', design: d.heroEmblem, price: 20, collections: ['marvel'], tags: ['superhero', 'emblem'], backdrop: '#FFD9CC', seriesId: 'S05', rarity: 'uncommon', displayOrder: 45, isNew: true,
    shortDescription: 'An original hero emblem: a bolt in a hexagon.', description: 'Our own emblem for an imaginary hero team.' }),
  poster({
    id: 'pst-016', slug: 'hero-mode-poster', name: 'Hero Mode',
    shortDescription: 'Our original caped hero on a sunburst.',
    description: 'Cape Mode, wall-sized. An original superhero-inspired poster.',
    collections: ['marvel'], tags: ['superhero', 'hero'], featured: false, isNew: true, displayOrder: 113,
    design: { title: 'HERO\nMODE', bg: tomato, fg: ink, accent: sun, motif: 'hero', pattern: 'sun' }, backdrop: '#FFD9CC',
  }),

  // ===== Devotion =====
  single({ id: 'stk-048', slug: 'sacred-om', design: d.omLotus, price: 20, collections: ['devotion'], tags: ['devotion', 'om', 'spiritual'], backdrop: '#FFF0B8', seriesId: 'devotion', rarity: 'common', displayOrder: 46, isNew: true, featured: true,
    shortDescription: 'Sacred Om on a golden lotus disc.', description: 'A spiritual emblem sticker for calmness and positivity.' }),
  single({ id: 'stk-049', slug: 'mahadev-trishul', design: d.shivaTrishul, price: 20, collections: ['devotion'], tags: ['devotion', 'shiva', 'trishul'], backdrop: '#D6F0FF', seriesId: 'devotion', rarity: 'common', displayOrder: 47, isNew: true,
    shortDescription: 'The divine trishul of Lord Shiva.', description: 'Sacred trishul and damru motif on deep sky badge.' }),
  single({ id: 'stk-050', slug: 'divine-bansuri', design: d.bansuriFlute, price: 20, collections: ['devotion'], tags: ['devotion', 'krishna', 'bansuri'], backdrop: '#D3F6E6', seriesId: 'devotion', rarity: 'common', displayOrder: 48, isNew: true,
    shortDescription: 'The enchanting flute of Krishna.', description: 'A soothing pastel pill sticker with peacock feather accent.' }),
  single({ id: 'stk-051', slug: 'vighnaharta-ganesha', design: d.ganeshaBless, price: 20, collections: ['devotion'], tags: ['devotion', 'ganesha', 'blessing'], backdrop: '#FFD9CC', seriesId: 'devotion', rarity: 'common', displayOrder: 49, isNew: true,
    shortDescription: 'Lord Ganesha for new beginnings.', description: 'Warm auspicious red-and-gold Ganesha emblem sticker.' }),
  single({ id: 'stk-052', slug: 'sankatmochan', design: d.hanumanSanjeevani, price: 20, collections: ['devotion'], tags: ['devotion', 'hanuman', 'strength'], backdrop: '#FFF0B8', seriesId: 'devotion', rarity: 'uncommon', displayOrder: 50, isNew: true,
    shortDescription: 'Courage and unwavering devotion.', description: 'Golden sun emblem representing strength, courage, and faith.' }),

  // ===== Sports =====
  single({ id: 'stk-053', slug: 'cricket-stadium', design: d.cricketFever, price: 20, collections: ['sports'], tags: ['sports', 'cricket', 'game'], backdrop: '#D3F6E6', seriesId: 'sports', rarity: 'common', displayOrder: 51, isNew: true, featured: true,
    shortDescription: 'Cricket floodlights and stadium energy.', description: 'For every weekend cricketer and tournament watcher.' }),
  single({ id: 'stk-054', slug: 'legend-jersey-7', design: d.jerseySeven, price: 20, collections: ['sports'], tags: ['sports', 'jersey', 'champion'], backdrop: '#D6F0FF', seriesId: 'sports', rarity: 'common', displayOrder: 52, isNew: true,
    shortDescription: 'The iconic number seven jersey.', description: 'A championship badge for fans who believe till the last ball.' }),
  single({ id: 'stk-055', slug: 'slam-dunk', design: d.slamDunk, price: 20, collections: ['sports'], tags: ['sports', 'basketball', 'dunk'], backdrop: '#FFD9CC', seriesId: 'sports', rarity: 'common', displayOrder: 53, isNew: true,
    shortDescription: 'High-flying court action.', description: 'Bold pill sticker celebrating court speed and rim-rattling dunks.' }),
  single({ id: 'stk-056', slug: 'golden-goal', design: d.goldenBoot, price: 20, collections: ['sports'], tags: ['sports', 'football', 'goal'], backdrop: '#FFF0B8', seriesId: 'sports', rarity: 'common', displayOrder: 54, isNew: true,
    shortDescription: 'Top-corner net-ripping finish.', description: 'Golden rounded-square sticker for the love of the beautiful game.' }),
  single({ id: 'stk-057', slug: 'never-stop-running', design: d.runnerStride, price: 20, collections: ['sports'], tags: ['sports', 'running', 'fitness'], backdrop: '#EEFFC2', seriesId: 'sports', rarity: 'uncommon', displayOrder: 55, isNew: true,
    shortDescription: 'Mile after mile, every morning.', description: 'A high-contrast lime circle for runners, sprinters and 5K finishers.' }),

  // ===== Rare designs (demo classification: planned for occasional small batches) =====
  single({ id: 'rar-001', slug: 'midnight-chai', design: d.midnightChai, price: 30, collections: [], tags: ['chai', 'rare', 'badge'], backdrop: '#E9E3D6', seriesId: 'S01', rarity: 'rare', displayOrder: 40,
    shortDescription: 'The after-dark version of Chai First.', description: 'A lime-on-black badge of our chai cup. Planned as a rare design: printed in occasional small batches instead of staying in the range.' }),
  single({ id: 'rar-002', slug: 'ghost-bug', design: d.ghostBug, price: 30, collections: [], tags: ['bug', 'rare', 'coding'], backdrop: '#E2DAFF', seriesId: 'S02', rarity: 'rare', displayOrder: 41,
    shortDescription: 'The bug that only appears in production.', description: 'A grape-and-white version of Little Bug. Planned as a rare design for occasional small batches.' }),
  single({ id: 'rar-003', slug: 'golden-hour-tape', design: d.goldenCassette, price: 30, collections: ['music'], tags: ['music', 'rare', 'cassette'], backdrop: '#FFF0B8', seriesId: 'S03', rarity: 'rare', displayOrder: 42,
    shortDescription: 'Side A, in golden-hour yellow.', description: 'A warm yellow take on our cassette sticker. Planned as a rare design for occasional small batches.' }),
  single({ id: 'rar-004', slug: 'pole-position', design: d.polePosition, price: 30, collections: ['quotes'], tags: ['motorsport', 'rare', 'flag'], backdrop: '#FFD9CC', seriesId: 'S04', rarity: 'rare', displayOrder: 43,
    shortDescription: 'A chequered flag on a tomato badge.', description: 'The rare version of Apex Flag. Planned for occasional small batches.' }),

  // ===== Limited editions (concepts: one fixed run, size not decided yet) =====
  {
    id: 'ltd-001', slug: 'founders-bolt', name: 'Founders’ Bolt',
    shortDescription: 'A one-run badge for our very first customers.',
    description: 'A planned limited edition: one fixed print run, never reprinted. We’ll publish the run size and number each sticker only once the run is confirmed with the printer.',
    price: 49, category: 'stickers', productType: 'single', collections: ['minimal', 'motivation'],
    tags: ['limited edition', 'badge', 'bolt'], featured: false, isNew: true, displayOrder: 44, status: 'coming-soon',
    rarity: 'limited', seriesId: 'S01', edition: { runSize: null, confirmed: false },
    note: 'Limited edition concept. Run size and edition numbers aren’t decided yet, so none are shown.',
    art: { kind: 'single', backdrop: '#E9E3D6', design: d.foundersBolt },
  },
  {
    id: 'ltd-002', slug: 'drop-01-badge', name: 'Drop 01 Badge',
    shortDescription: 'Marks the first community-voted drop.',
    description: 'A planned limited edition for the first drop chosen by community vote. Run size and edition numbers will be published only once the run is confirmed.',
    price: 49, category: 'stickers', productType: 'single', collections: ['minimal'],
    tags: ['limited edition', 'drop', 'badge'], featured: false, isNew: true, displayOrder: 45, status: 'coming-soon',
    rarity: 'limited', seriesId: 'S02', edition: { runSize: null, confirmed: false },
    note: 'Limited edition concept. Run size and edition numbers aren’t decided yet, so none are shown.',
    art: { kind: 'single', backdrop: '#EEFFC2', design: d.dropOne },
  },

  // ===== Matching Duos: two coordinated stickers, one product =====
  {
    id: 'duo-001', slug: 'window-cat-day-and-night', name: 'Window Cat: Day & Night',
    shortDescription: 'One original cat in two poses — awake and napping.',
    description: 'Our window cat, twice: wide awake on sunny yellow and fast asleep on sky blue. Put one on your laptop and one on your phone, or split them with a friend.',
    price: 39, category: 'stickers', productType: 'duo', collections: ['cute'],
    tags: ['duo', 'pair', 'cat', 'cute', 'friends'], featured: true, isNew: true, displayOrder: 50, status: 'demo', seriesId: 'S03', rarity: 'common',
    duo: { pairing: 'two-poses', partA: 'Awake', partB: 'Napping', pairNote: 'The same character in two poses. They make sense on their own and tell a little story together.' },
    art: { kind: 'duo', backdrop: '#FFF0B8', designs: [d.dayCat, d.napCat], pairing: 'two-poses' },
  },
  {
    id: 'duo-002', slug: 'plug-and-socket', name: 'Plug & Socket',
    shortDescription: 'Two complementary symbols that only make sense together.',
    description: 'A lime plug and a black socket. Give one to your best friend, your project partner or your roommate — you’re the other half of the circuit.',
    price: 39, category: 'stickers', productType: 'duo', collections: [],
    tags: ['duo', 'pair', 'friends', 'tech'], featured: true, isNew: true, displayOrder: 51, status: 'demo', seriesId: 'S02', rarity: 'common',
    duo: { pairing: 'complementary', partA: 'Plug', partB: 'Socket', pairNote: 'Complementary symbols: each sticker is complete, and they connect when placed side by side.' },
    art: { kind: 'duo', backdrop: '#EEFFC2', designs: [d.plug, d.socket], pairing: 'complementary' },
  },
  {
    id: 'duo-003', slug: 'half-a-heart', name: 'Half a Heart',
    shortDescription: 'One pixel heart, cut into two halves.',
    description: 'A single original pixel-heart illustration split down the middle. Keep one half, give the other away — the picture is only complete when both are together.',
    price: 39, category: 'stickers', productType: 'duo', collections: ['cute', 'gaming'],
    tags: ['duo', 'pair', 'friends', 'heart', 'pixel'], featured: false, isNew: true, displayOrder: 52, status: 'demo', seriesId: 'S04', rarity: 'uncommon',
    duo: { pairing: 'halves', partA: 'Left half', partB: 'Right half', pairNote: 'Two halves of one illustration. Each half is its own die-cut sticker.' },
    art: { kind: 'duo', backdrop: '#FFE0EC', designs: [d.halfHeart, d.halfHeart], pairing: 'halves' },
  },
  {
    id: 'duo-004', slug: 'night-shift-set', name: 'Night Shift Set',
    shortDescription: 'A matching laptop sticker and phone-case sticker.',
    description: 'The same moon design in two formats: a round sticker sized for a laptop lid and a slim pill for a phone case, so your devices match.',
    price: 45, category: 'stickers', productType: 'duo', collections: ['minimal'],
    tags: ['duo', 'pair', 'laptop', 'phone case', 'moon'], featured: false, isNew: false, displayOrder: 53, status: 'demo', seriesId: 'S02', rarity: 'common',
    duo: { pairing: 'laptop-phone', partA: 'Laptop sticker', partB: 'Phone-case sticker', pairNote: 'One design in two formats — a larger one for a laptop lid and a slimmer one for a phone case. Exact sizes will be confirmed after printer samples.' },
    art: { kind: 'duo', backdrop: '#E9E3D6', designs: [d.nightShiftLaptop, d.nightShiftPhone], pairing: 'laptop-phone' },
  },
  {
    id: 'duo-005', slug: 'chai-and-samosa', name: 'Chai & Samosa',
    shortDescription: 'The original pair. Better together.',
    description: 'A chai cup and a samosa — two complementary stickers for you and the friend who always joins the canteen run.',
    price: 39, category: 'stickers', productType: 'duo', collections: [],
    tags: ['duo', 'pair', 'friends', 'chai', 'samosa', 'desi'], featured: false, isNew: false, displayOrder: 54, status: 'demo', seriesId: 'S01', rarity: 'common',
    duo: { pairing: 'complementary', partA: 'Chai', partB: 'Samosa', pairNote: 'Complementary symbols: a classic combination, one sticker each.' },
    art: { kind: 'duo', backdrop: '#FFE9A8', designs: [d.chaiFirst, d.samosa], pairing: 'complementary' },
  },

  // ===== Secret Message stickers: each comes with a sealed message card =====
  {
    id: 'sec-001', slug: 'main-character-energy', name: 'Main Character Energy',
    shortDescription: 'A loud little sticker, plus a sealed message card.',
    description: 'A sunny round sticker for people who walk into the canteen like it’s their scene. It comes with a sealed card from our Student Life series — the message inside stays a surprise.',
    price: 29, category: 'stickers', productType: 'secret', collections: ['motivation'],
    tags: ['secret message', 'text', 'funny', 'card'], featured: true, isNew: true, displayOrder: 60, status: 'demo', seriesId: 'S01', rarity: 'common',
    messageCardId: 'mc-student-life', messageCardCount: 1,
    imageUrl: '/PNG/Life quotes/be-your-own-inspiration.webp',
    art: { kind: 'secret', backdrop: '#FFF0B8', design: d.mainCharacter, envelope: kraft },
  },
  {
    id: 'sec-002', slug: 'loading', name: 'Loading…',
    shortDescription: 'For when your brain is still buffering.',
    description: 'A black pill sticker with a lime progress bar. Comes with a sealed card from our Coding & Tech series.',
    price: 29, category: 'stickers', productType: 'secret', collections: [],
    tags: ['secret message', 'coding', 'text', 'card'], featured: true, isNew: true, displayOrder: 61, status: 'demo', seriesId: 'S02', rarity: 'common',
    messageCardId: 'mc-tech', messageCardCount: 1,
    imageUrl: '/PNG/Swag/limited-edition-black-and-white.webp',
    art: { kind: 'secret', backdrop: '#EEFFC2', design: d.loading, envelope: kraft },
  },
  {
    id: 'sec-003', slug: 'do-not-disturb', name: 'Do Not Disturb',
    shortDescription: 'A clear sign for headphones-on hours.',
    description: 'A tomato rounded-square sticker for your laptop lid or door. Comes with a sealed card from our Introvert Hours series.',
    price: 29, category: 'stickers', productType: 'secret', collections: ['minimal', 'music'],
    tags: ['secret message', 'introvert', 'text', 'card'], featured: false, isNew: true, displayOrder: 62, status: 'demo', seriesId: 'S03', rarity: 'common',
    messageCardId: 'mc-introvert', messageCardCount: 1,
    imageUrl: '/PNG/Swag/dont-touch-hand-symbol.webp',
    art: { kind: 'secret', backdrop: '#FFD9CC', design: d.doNotDisturb, envelope: kraft },
  },
  {
    id: 'sec-004', slug: 'social-battery-low', name: 'Social Battery Low',
    shortDescription: 'A polite way to say you need a minute.',
    description: 'A mint circle sticker with a low battery. Comes with a sealed card from our Introvert Hours series.',
    price: 29, category: 'stickers', productType: 'secret', collections: ['cute'],
    tags: ['secret message', 'introvert', 'battery', 'card'], featured: false, isNew: false, displayOrder: 63, status: 'demo', seriesId: 'S03', rarity: 'common',
    messageCardId: 'mc-introvert', messageCardCount: 1,
    art: { kind: 'secret', backdrop: '#D3F6E6', design: d.socialBattery, envelope: kraft },
  },
  {
    id: 'sec-005', slug: 'it-compiled', name: 'It Compiled.',
    shortDescription: 'Small victories deserve stickers.',
    description: 'A sky-blue pill for the rare first-try build. Comes with a sealed card from our Coding & Tech series.',
    price: 29, category: 'stickers', productType: 'secret', collections: [],
    tags: ['secret message', 'coding', 'text', 'card'], featured: false, isNew: false, displayOrder: 64, status: 'demo', seriesId: 'S02', rarity: 'common',
    messageCardId: 'mc-tech', messageCardCount: 1,
    art: { kind: 'secret', backdrop: '#D6F0FF', design: d.itCompiled, envelope: kraft },
  },
  {
    id: 'sec-006', slug: 'tiny-steps-count', name: 'Tiny Steps Count',
    shortDescription: 'A gentle push for slow weeks.',
    description: 'A pink blob sticker for progress you can’t see yet. Comes with a sealed card from our Motivation series.',
    price: 29, category: 'stickers', productType: 'secret', collections: ['motivation', 'cute'],
    tags: ['secret message', 'motivation', 'text', 'card'], featured: false, isNew: false, displayOrder: 65, status: 'demo', seriesId: 'S03', rarity: 'common',
    messageCardId: 'mc-motivation', messageCardCount: 1,
    art: { kind: 'secret', backdrop: '#FFE0EC', design: d.tinySteps, envelope: kraft },
  },
  {
    id: 'sec-007', slug: 'sealed-notes-pack', name: 'Sealed Notes Pack',
    shortDescription: 'Four message stickers and four sealed cards.',
    description: 'Main Character Energy, Loading…, Do Not Disturb and Tiny Steps Count, each with its own sealed message card from a different series. A good gift — or open one a week.',
    price: 99, category: 'stickers', productType: 'secret', collections: ['motivation'],
    tags: ['secret message', 'pack', 'gift', 'card', 'bundle'], featured: true, isNew: true, displayOrder: 66, status: 'demo',
    messageCardId: 'mc-mixed', messageCardCount: 4,
    art: { kind: 'secret-pack', backdrop: '#E9E3D6', designs: [d.mainCharacter, d.loading, d.doNotDisturb, d.tinySteps], envelope: kraft },
  },

  // ===== Mini sticker sheets =====
  {
    id: 'sht-001', slug: 'campus-survival-sheet', name: 'Campus Survival Sheet',
    shortDescription: 'Eight small stickers for the full college experience.',
    description: 'Everything a semester feels like, on one sheet: attendance maths, deadline panic, last-bench pride and the chai that holds it together. Peel them one at a time or keep the sheet whole.',
    price: 99, category: 'stickers', productType: 'sheet', collections: [],
    tags: ['sheet', 'college', 'funny', 'bundle'], featured: true, isNew: true, displayOrder: 12, status: 'demo',
    art: { kind: 'sheet', backdrop: '#FFE9A8', designs: [d.seventyFive, d.deadline, d.books, d.chaiFirst, d.backbencher, d.oneMoreEp, d.samosa, d.sparkle] },
  },
  {
    id: 'sht-002', slug: 'dev-mode-sheet', name: 'Dev Mode Sheet',
    shortDescription: 'Bugs, brackets and excuses — eight to a sheet.',
    description: 'A sheet of tech stickers for the laptop that compiles your projects and your excuses. Mix of icons and one-liners.',
    price: 99, category: 'stickers', productType: 'sheet', collections: [],
    tags: ['sheet', 'coding', 'developer'], featured: true, isNew: false, displayOrder: 13, status: 'demo',
    art: { kind: 'sheet', backdrop: '#D6F0FF', designs: [d.worksOnMyMachine, d.bug, d.code, d.jugaad, d.deadline, d.pixelHeart, d.oneMoreEp, d.sparkle] },
  },
  {
    id: 'sht-003', slug: 'soft-days-sheet', name: 'Soft Days Sheet',
    shortDescription: 'Nine pastel minis for journals and phone cases.',
    description: 'A gentle sheet of clouds, cats and small smiles. Made for journaling, gifting, and decorating without shouting.',
    price: 89, category: 'stickers', productType: 'sheet', collections: ['cute'],
    tags: ['sheet', 'cute', 'pastel', 'journal'], featured: false, isNew: true, displayOrder: 14, status: 'demo',
    art: { kind: 'sheet', backdrop: '#FFE0EC', designs: [d.sleepyCloud, d.cat, d.smiley, d.softDays, d.pixelHeart, d.sparkle, d.headphones, d.lifeUp, d.cassette] },
  },

  // ===== Curated packs =====
  {
    id: 'pck-001', slug: 'desi-starter-pack', name: 'Desi Starter Pack',
    shortDescription: 'Six separate stickers with maximum desi energy.',
    description: 'A curated pack of six individual stickers: chai, samosa, jugaad and a few phrases you’ve definitely heard at home. A good first pack or an easy gift for a roommate.',
    price: 129, category: 'stickers', productType: 'pack', collections: [],
    tags: ['pack', 'desi', 'gift', 'bundle'], featured: true, isNew: false, displayOrder: 15, status: 'demo',
    art: { kind: 'pack', backdrop: '#FFD9CC', card: kraft, designs: [d.chaiFirst, d.samosa, d.jugaad, d.ekNumber, d.adjust, d.deadline] },
  },
  {
    id: 'pck-002', slug: 'garage-pack', name: 'Garage Pack',
    shortDescription: 'Six original car and bike stickers.',
    description: 'A pack for the automotive crowd: an original coupe, a helmet, chequered flags and pit-lane type. Everything drawn from scratch, nothing borrowed from real brands.',
    price: 139, category: 'stickers', productType: 'pack', collections: ['quotes'],
    tags: ['pack', 'cars', 'bikes', 'motorsport', 'bundle'], featured: true, isNew: true, displayOrder: 16, status: 'demo',
    art: { kind: 'pack', backdrop: '#EEFFC2', card: '#2A2A2A', designs: [d.redline, d.helmet, d.apex, d.flagTwo, d.pitLane, d.doItScared] },
  },
  {
    id: 'pck-003', slug: 'press-start-pack', name: 'Press Start Pack',
    shortDescription: 'Five original gaming-inspired stickers.',
    description: 'Pixel hearts, a pocket controller and a couple of arcade-style lines. All original artwork — no characters or game logos.',
    price: 119, category: 'stickers', productType: 'pack', collections: ['gaming'],
    tags: ['pack', 'gaming', 'pixel', 'bundle'], featured: false, isNew: false, displayOrder: 17, status: 'demo',
    art: { kind: 'pack', backdrop: '#E2DAFF', card: grape, designs: [d.controller, d.pixelHeart, d.pressStart, d.lifeUp, d.oneMoreEp] },
  },
  {
    id: 'mys-001', slug: 'mystery-pack', name: 'Mystery Sticker Pack',
    shortDescription: 'Five guaranteed stickers from your theme, plus one mystery sticker.',
    description: 'Pick a series theme and get a sealed pack of six stickers: five different designs from that theme, plus one extra mystery sticker chosen by us. You always know what the five are drawn from — only the sixth is a surprise.',
    price: 129, category: 'stickers', productType: 'mystery', collections: ['cute'],
    tags: ['mystery', 'surprise', 'bundle', 'gift', 'collectible'], featured: true, isNew: true, displayOrder: 18, status: 'demo',
    variantLabel: 'Theme',
    // One option per primary store theme.
    variants: series
      .filter((s) => !s.id.startsWith('S0'))
      .map((s) => ({ id: s.id.toLowerCase(), label: s.name, detail: s.blurb, price: 129 })),
    packQuantity: 6,
    mystery: {
      guaranteedCount: 5,
      mysteryCount: 1,
      guaranteedRule: 'Five different designs from the theme you choose, picked from the list shown on this page. No duplicates within the five.',
      mysteryRule: 'One extra sticker chosen by us from any series. It’s a surprise — not a guaranteed rare, and it could be a design you already own.',
      packaging: 'A sealed kraft envelope printed with the series code and a pack number.',
      // Holographic stock doesn't exist yet, so it is NOT part of the pack and no chance is advertised.
      specialVariants: [{ id: 'holo-sparkle', name: 'Holographic special design', inventoryConfirmed: false }],
      odds: null,
    },
    art: { kind: 'mystery', backdrop: '#E9E3D6', card: kraft, peek: [d.chaiFirst, d.worksOnMyMachine, d.sleepyCloud] },
  },

  // ===== Posters & wall art =====
  // Sizes and prices for single posters come from `posterSizes` above.
  poster({
    id: 'pst-001', slug: 'one-more-chapter-poster', name: 'One More Chapter',
    shortDescription: 'A late-night study poster for the desk wall.',
    description: 'Moon, deadline, one more chapter. A dark typographic poster for anyone who does their best work after midnight.',
    collections: ['minimal'], tags: ['study', 'night', 'typography'], featured: true, isNew: true, displayOrder: 101,
    design: { title: 'ONE MORE\nCHAPTER', bg: ink, fg: paper, accent: lime, motif: 'moon', pattern: 'dots' }, backdrop: '#E9E3D6',
  }),
  poster({
    id: 'pst-004', slug: 'chai-o-clock-poster', name: 'Chai O’Clock',
    shortDescription: 'It’s always chai time somewhere.',
    description: 'A warm yellow poster for the corner where the kettle lives. Bold type, a steaming cup and a lot of opinions about chai.',
    collections: [], tags: ['chai', 'desi', 'kitchen', 'typography'], featured: true, isNew: false, displayOrder: 102,
    design: { title: 'CHAI\nO’CLOCK', bg: sun, fg: ink, accent: tomato, motif: 'chai', pattern: 'sun' }, backdrop: '#FFE9A8',
  }),
  poster({
    id: 'pst-005', slug: 'ship-it-poster', name: 'Ship It',
    shortDescription: 'Two words for every developer’s wall.',
    description: 'A blue grid, angle brackets and a reminder that done beats perfect. Made for the room where projects get finished at 3 AM.',
    collections: [], tags: ['coding', 'developer', 'motivation'], featured: true, isNew: true, displayOrder: 103,
    design: { title: 'SHIP\nIT', bg: sky, fg: ink, accent: tomato, motif: 'code', pattern: 'grid' }, backdrop: '#D6F0FF',
  }),
  poster({
    id: 'pst-006', slug: 'redline-poster', name: 'Redline',
    shortDescription: 'An original coupe on racing stripes.',
    description: 'Our own side-profile coupe on tomato-red stripes — no real car brands, just speed. For car people and their walls.',
    collections: ['quotes'], tags: ['cars', 'automotive', 'stripes'], featured: true, isNew: false, displayOrder: 104,
    design: { title: 'REDLINE', bg: tomato, fg: paper, accent: ink, motif: 'car', pattern: 'stripes' }, backdrop: '#FFD9CC',
  }),
  poster({
    id: 'pst-007', slug: 'last-lap-poster', name: 'Last Lap',
    shortDescription: 'A chequered flag for track-day dreamers.',
    description: 'An original motorsport-inspired poster: chequered flag, lime background, no team logos. Pairs with the Redline poster.',
    collections: ['quotes', 'motivation'], tags: ['motorsport', 'racing', 'flag'], featured: false, isNew: false, displayOrder: 105,
    design: { title: 'LAST\nLAP', bg: lime, fg: ink, accent: ink, motif: 'flag', pattern: 'grid' }, backdrop: '#EEFFC2',
  }),
  poster({
    id: 'pst-008', slug: 'press-start-poster', name: 'Press Start',
    shortDescription: 'Original controller art in arcade purple.',
    description: 'A pocket controller on a grape background with arcade-style type. Original artwork — no game characters or logos.',
    collections: ['gaming'], tags: ['gaming', 'arcade', 'controller'], featured: true, isNew: true, displayOrder: 106,
    design: { title: 'PRESS\nSTART', bg: grape, fg: paper, accent: lime, motif: 'controller', pattern: 'dots' }, backdrop: '#E2DAFF',
  }),
  poster({
    id: 'pst-009', slug: 'side-a-poster', name: 'Side A',
    shortDescription: 'A mint cassette for the music corner.',
    description: 'A big cassette and a sunburst, for the wall next to your speaker. Play the A-side first.',
    collections: ['music'], tags: ['music', 'retro', 'cassette'], featured: false, isNew: false, displayOrder: 107,
    design: { title: 'SIDE\nA', bg: mint, fg: ink, accent: sun, motif: 'cassette', pattern: 'sun' }, backdrop: '#D3F6E6',
  }),
  poster({
    id: 'pst-010', slug: 'soft-days-poster', name: 'Soft Days',
    shortDescription: 'A pastel cloud for slow mornings.',
    description: 'Pink polka dots, one very sleepy cloud. A gentle poster for a calm corner of the room.',
    collections: ['cute'], tags: ['cute', 'pastel', 'aesthetic'], featured: false, isNew: true, displayOrder: 108,
    design: { title: 'SOFT\nDAYS', bg: bubble, fg: ink, accent: paper, motif: 'cloud', pattern: 'dots' }, backdrop: '#FFE0EC',
  }),
  poster({
    id: 'pst-011', slug: 'do-it-scared-poster', name: 'Do It Scared',
    shortDescription: 'The motivation sticker, now wall-sized.',
    description: 'A lightning bolt and three words in big type. Hang it where you’ll see it before exams and interviews.',
    collections: ['motivation'], tags: ['motivation', 'typography', 'bolt'], featured: false, isNew: false, displayOrder: 109,
    design: { title: 'DO IT\nSCARED', bg: ink, fg: sun, accent: sun, motif: 'bolt', pattern: 'stripes' }, backdrop: '#FFF0B8',
  }),
  poster({
    id: 'pst-012', slug: 'tiny-sparks-poster', name: 'Tiny Sparks',
    shortDescription: 'A quiet, minimal print that goes with anything.',
    description: 'One sparkle on a soft grid. The calm poster in the collection — easy to pair with louder ones.',
    collections: ['minimal'], tags: ['minimal', 'icon', 'star'], featured: false, isNew: false, displayOrder: 110,
    design: { title: 'TINY\nSPARKS', bg: paper, fg: ink, accent: tomato, motif: 'sparkle', pattern: 'grid' }, backdrop: '#E9E3D6',
  }),

  // ----- Poster sets (fixed A4 size) -----
  {
    id: 'pst-002', slug: 'room-reset-poster-set', name: 'Room Reset Set',
    shortDescription: 'Three matching A4 prints for a quick room refresh.',
    description: 'Three coordinated prints in matching colours, designed to hang together above a desk or bed. Sold as a set of A4 posters.',
    price: 229, category: 'posters', productType: 'poster-set', collections: ['minimal', 'motivation'],
    tags: ['poster set', 'wall art', 'bundle', 'A4'], featured: true, isNew: false, displayOrder: 120, status: 'demo',
    wallLayoutId: 'pack-trio-a4',
    art: {
      kind: 'poster-set', backdrop: '#FFE9A8',
      posters: [
        { title: 'SLOW\nMORNINGS', bg: tomato, fg: paper, accent: sun, motif: 'chai', pattern: 'sun' },
        { title: 'STAY\nCURIOUS', bg: sky, fg: ink, accent: paper, motif: 'sparkle', pattern: 'dots' },
        { title: 'KEEP\nGOING', bg: lime, fg: ink, accent: tomato, motif: 'bolt', pattern: 'stripes' },
      ],
    },
  },
  {
    id: 'pst-013', slug: 'desk-wall-pack', name: 'Desk Wall Pack',
    shortDescription: 'Five A4 posters for the wall above your desk.',
    description: 'A ready-made wall setup: five A4 prints across tech, music and motivation that look good side by side. The easiest way to fill an empty wall.',
    price: 329, category: 'posters', productType: 'poster-set', collections: ['music', 'motivation'],
    tags: ['wall pack', 'poster set', 'bundle', 'A4'], featured: true, isNew: true, displayOrder: 121, status: 'demo',
    wallLayoutId: 'pack-five-a4',
    art: {
      kind: 'poster-set', backdrop: '#D6F0FF',
      posters: [
        { title: 'SHIP\nIT', bg: sky, fg: ink, accent: tomato, motif: 'code', pattern: 'grid' },
        { title: 'SIDE\nA', bg: mint, fg: ink, accent: sun, motif: 'cassette', pattern: 'sun' },
        { title: 'DO IT\nSCARED', bg: ink, fg: sun, accent: sun, motif: 'bolt', pattern: 'stripes' },
        { title: 'PRESS\nSTART', bg: grape, fg: paper, accent: lime, motif: 'controller', pattern: 'dots' },
        { title: 'TINY\nSPARKS', bg: paper, fg: ink, accent: tomato, motif: 'sparkle', pattern: 'grid' },
      ],
    },
  },

  // ----- Coming later -----
  {
    id: 'pst-003', slug: 'photo-collage', name: 'Your Photos, Collaged',
    shortDescription: 'A personalised collage from your own photos.',
    description: 'A future custom product: a single printed collage made from your photos. It can’t be ordered yet — to try the idea now, use Build your own wall, which lets you place your photos on separate posters.',
    price: 199, category: 'posters', productType: 'collage', collections: ['cute'],
    tags: ['personalised', 'photo', 'gift'], featured: false, isNew: false, displayOrder: 130, status: 'coming-soon',
    art: { kind: 'collage', backdrop: '#D3F6E6' },
  },
];
