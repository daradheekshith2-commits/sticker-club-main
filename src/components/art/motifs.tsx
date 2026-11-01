/**
 * ORIGINAL ICON MOTIFS for the demo stickers.
 * Each motif is drawn inside a 100×100 box using three colours:
 *   fg = main drawing colour, bg = sticker background, accent = highlight.
 * Replace these with real artwork files whenever your designs are ready.
 */
import type { ReactElement } from 'react';
import type { MotifId } from '../../types/product';

interface MotifColors {
  fg: string;
  bg: string;
  accent: string;
}

type MotifFn = (c: MotifColors) => ReactElement;

const round = { strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

// Pixel heart map: 1 = filled pixel.
const heartMap = [
  '0110001100',
  '1111011110',
  '1111111111',
  '1111111111',
  '0111111110',
  '0011111100',
  '0001111000',
  '0000110000',
];

export const motifs: Record<MotifId, MotifFn> = {
  chai: ({ fg, accent }) => (
    <g>
      <path d="M40 30 q-5 -6 0 -12 q5 -6 0 -12 M52 30 q-5 -6 0 -12 q5 -6 0 -12" stroke={accent} strokeWidth={4} fill="none" {...round} />
      <path d="M26 38 h44 v20 a16 16 0 0 1 -16 16 h-12 a16 16 0 0 1 -16 -16 z" fill={fg} />
      <rect x={26} y={38} width={44} height={7} fill={accent} />
      <path d="M70 44 h5 a9 9 0 0 1 0 18 h-6" stroke={fg} strokeWidth={6} fill="none" {...round} />
      <rect x={18} y={78} width={60} height={7} rx={3.5} fill={fg} />
    </g>
  ),
  code: ({ fg, accent }) => (
    <g fill="none" strokeWidth={10} {...round}>
      <path d="M34 28 L14 50 L34 72" stroke={fg} />
      <path d="M66 28 L86 50 L66 72" stroke={fg} />
      <path d="M57 22 L43 78" stroke={accent} />
    </g>
  ),
  bug: ({ fg, bg, accent }) => (
    <g>
      <g stroke={fg} strokeWidth={5} {...round}>
        <path d="M33 48 H18 M33 60 H16 M35 72 H20 M67 48 H82 M67 60 H84 M65 72 H80 M44 22 L38 12 M56 22 L62 12" />
      </g>
      <ellipse cx={50} cy={60} rx={19} ry={24} fill={fg} />
      <circle cx={50} cy={32} r={11} fill={fg} />
      <path d="M50 38 V82" stroke={bg} strokeWidth={3} />
      <circle cx={42} cy={54} r={4} fill={accent} />
      <circle cx={58} cy={66} r={4} fill={accent} />
    </g>
  ),
  books: ({ fg, bg, accent }) => (
    <g stroke={fg} strokeWidth={4} {...round}>
      <rect x={16} y={64} width={68} height={16} rx={4} fill={accent} />
      <rect x={22} y={46} width={58} height={16} rx={4} fill={bg} />
      <rect x={18} y={28} width={56} height={16} rx={4} fill={fg} transform="rotate(-7 46 36)" />
      <path d="M28 72 h30" stroke={fg} />
    </g>
  ),
  clock: ({ fg, accent }) => (
    <g {...round}>
      <circle cx={50} cy={52} r={34} fill="none" stroke={fg} strokeWidth={7} />
      <path d="M50 30 V52 L64 60" stroke={accent} strokeWidth={7} fill="none" />
      <path d="M30 14 L20 24 M70 14 L80 24" stroke={fg} strokeWidth={7} />
    </g>
  ),
  moon: ({ fg, accent }) => (
    <g>
      <path d="M62 14 A36 36 0 1 0 86 62 A28 28 0 1 1 62 14 Z" fill={fg} />
      <path d="M78 22 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z" fill={accent} />
    </g>
  ),
  car: ({ fg, bg, accent }) => (
    <g>
      <path d="M6 66 q0 -12 12 -14 l16 -4 l14 -14 q4 -4 10 -4 h14 q8 0 12 8 l6 12 q10 2 10 12 v6 h-94 z" fill={fg} />
      <path d="M40 48 l10 -10 h10 v10 z M64 38 h6 q4 0 6 4 l3 6 h-15 z" fill={bg} />
      <rect x={10} y={58} width={84} height={4} fill={accent} />
      <circle cx={28} cy={72} r={10} fill={fg} stroke={bg} strokeWidth={3} />
      <circle cx={74} cy={72} r={10} fill={fg} stroke={bg} strokeWidth={3} />
      <circle cx={28} cy={72} r={3.5} fill={bg} />
      <circle cx={74} cy={72} r={3.5} fill={bg} />
    </g>
  ),
  helmet: ({ fg, bg, accent }) => (
    <g>
      <path d="M16 66 a34 34 0 0 1 68 -6 v14 h-68 z" fill={fg} />
      <path d="M48 46 h34 q4 0 4 4 v8 h-38 z" fill={accent} />
      <path d="M26 40 q10 -14 26 -16" stroke={bg} strokeWidth={5} fill="none" strokeLinecap="round" />
      <rect x={14} y={72} width={72} height={8} rx={4} fill={fg} />
    </g>
  ),
  flag: ({ fg, bg }) => {
    const cells = [];
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 5; c++)
        cells.push(<rect key={`${r}-${c}`} x={28 + c * 11} y={18 + r * 11} width={11} height={11} fill={(r + c) % 2 ? bg : fg} />);
    return (
      <g>
        <rect x={20} y={14} width={6} height={74} rx={3} fill={fg} />
        <g transform="skewY(-6) translate(0 6)">
          <rect x={28} y={18} width={55} height={44} fill={bg} stroke={fg} strokeWidth={3} />
          {cells}
        </g>
      </g>
    );
  },
  pixelHeart: ({ fg, accent }) => (
    <g>
      {heartMap.flatMap((row, y) =>
        row.split('').map((cell, x) =>
          cell === '1' ? <rect key={`${x}-${y}`} x={10 + x * 8} y={18 + y * 8} width={8.4} height={8.4} fill={fg} /> : null,
        ),
      )}
      <rect x={26} y={34} width={8} height={8} fill={accent} />
    </g>
  ),
  controller: ({ fg, bg, accent }) => (
    <g>
      <path d="M22 34 h56 q14 0 16 18 l2 14 q2 14 -10 14 q-8 0 -14 -10 h-44 q-6 10 -14 10 q-12 0 -10 -14 l2 -14 q2 -18 16 -18 z" fill={fg} />
      <path d="M26 50 h6 v-6 h6 v6 h6 v6 h-6 v6 h-6 v-6 h-6 z" fill={bg} />
      <circle cx={66} cy={50} r={5} fill={accent} />
      <circle cx={76} cy={60} r={5} fill={accent} />
    </g>
  ),
  cloud: ({ fg, accent }) => (
    <g>
      <path d="M26 72 a16 16 0 0 1 0 -32 a22 22 0 0 1 40 -6 a18 18 0 0 1 10 38 z" fill={fg} stroke="#121212" strokeWidth={3} />
      <path d="M38 52 q4 4 8 0 M56 52 q4 4 8 0" stroke="#121212" strokeWidth={3} fill="none" strokeLinecap="round" />
      <circle cx={34} cy={60} r={4} fill={accent} opacity={0.7} />
      <circle cx={68} cy={60} r={4} fill={accent} opacity={0.7} />
      <text x={74} y={30} fontSize={12} fontWeight={800} fill="#121212" fontFamily="var(--font-display)">z</text>
      <text x={82} y={20} fontSize={9} fontWeight={800} fill="#121212" fontFamily="var(--font-display)">z</text>
    </g>
  ),
  cat: ({ fg, bg, accent }) => (
    <g>
      <path d="M20 40 L24 12 L42 28 H58 L76 12 L80 40 Q84 80 50 82 Q16 80 20 40 Z" fill={fg} />
      <circle cx={38} cy={50} r={5} fill={bg} />
      <circle cx={62} cy={50} r={5} fill={bg} />
      <path d="M46 60 h8 l-4 5 z" fill={accent} />
      <path d="M50 65 v3 M28 62 h-14 M28 68 l-12 4 M72 62 h14 M72 68 l12 4" stroke={bg} strokeWidth={2.5} strokeLinecap="round" />
    </g>
  ),
  cassette: ({ fg, bg, accent }) => (
    <g>
      <rect x={10} y={22} width={80} height={56} rx={8} fill={fg} />
      <rect x={18} y={30} width={64} height={24} rx={4} fill={accent} />
      <circle cx={36} cy={42} r={7} fill={bg} />
      <circle cx={64} cy={42} r={7} fill={bg} />
      <rect x={43} y={39} width={14} height={6} fill={fg} />
      <path d="M28 78 l6 -14 h32 l6 14 z" fill={bg} opacity={0.35} />
    </g>
  ),
  headphones: ({ fg, accent }) => (
    <g {...round}>
      <path d="M20 62 V50 a30 30 0 0 1 60 0 V62" stroke={fg} strokeWidth={8} fill="none" />
      <rect x={12} y={54} width={18} height={28} rx={8} fill={accent} stroke={fg} strokeWidth={4} />
      <rect x={70} y={54} width={18} height={28} rx={8} fill={accent} stroke={fg} strokeWidth={4} />
    </g>
  ),
  sparkle: ({ fg, accent }) => (
    <g>
      <path d="M46 10 C50 38 54 42 82 46 C54 50 50 54 46 86 C42 54 38 50 10 46 C38 42 42 38 46 10 Z" fill={fg} />
      <path d="M78 66 C79 74 80 75 88 76 C80 77 79 78 78 86 C77 78 76 77 68 76 C76 75 77 74 78 66 Z" fill={accent} />
    </g>
  ),
  smiley: ({ fg, accent }) => (
    <g {...round}>
      <circle cx={50} cy={50} r={36} fill={accent} stroke={fg} strokeWidth={5} />
      <path d="M38 40 v6 M62 40 v6" stroke={fg} strokeWidth={6} />
      <path d="M34 58 q16 16 32 0" stroke={fg} strokeWidth={5} fill="none" />
    </g>
  ),
  bolt: ({ fg, accent }) => (
    <path d="M58 8 L22 56 H46 L38 92 L78 40 H54 Z" fill={accent} stroke={fg} strokeWidth={5} strokeLinejoin="round" />
  ),
  samosa: ({ fg, accent }) => (
    <g>
      <path d="M50 14 Q54 14 56 18 L86 74 Q88 82 80 82 H20 Q12 82 14 74 L44 18 Q46 14 50 14 Z" fill={accent} stroke={fg} strokeWidth={5} strokeLinejoin="round" />
      <path d="M30 70 q20 -8 40 0" stroke={fg} strokeWidth={3} fill="none" strokeLinecap="round" />
      <circle cx={46} cy={46} r={2.5} fill={fg} />
      <circle cx={56} cy={56} r={2.5} fill={fg} />
      <circle cx={42} cy={60} r={2.5} fill={fg} />
    </g>
  ),
  question: ({ fg, accent }) => (
    <g>
      <text x={50} y={74} textAnchor="middle" fontSize={78} fontWeight={800} fill={fg} fontFamily="var(--font-display)">?</text>
      <circle cx={78} cy={22} r={7} fill={accent} />
    </g>
  ),
  /** The window cat, curled up asleep (pairs with `cat`). */
  catNap: ({ fg, bg, accent }) => (
    <g>
      <path d="M14 70 Q12 40 42 38 L46 24 L56 34 L66 24 L68 40 Q90 46 86 70 Q84 82 50 82 Q16 82 14 70 Z" fill={fg} />
      <path d="M44 56 q4 4 8 0 M60 56 q4 4 8 0" stroke={bg} strokeWidth={3} fill="none" strokeLinecap="round" />
      <circle cx={56} cy={64} r={3} fill={accent} />
      <path d="M86 66 Q96 76 84 84 Q74 88 62 82" stroke={fg} strokeWidth={8} fill="none" strokeLinecap="round" />
      <text x={70} y={20} fontSize={13} fontWeight={800} fill={fg} fontFamily="var(--font-display)">z</text>
      <text x={80} y={10} fontSize={10} fontWeight={800} fill={fg} fontFamily="var(--font-display)">z</text>
    </g>
  ),
  plug: ({ fg, accent }) => (
    <g {...round}>
      <path d="M36 18 V36 M64 18 V36" stroke={fg} strokeWidth={8} />
      <path d="M24 36 H76 V54 a26 26 0 0 1 -52 0 Z" fill={fg} />
      <path d="M50 80 V94" stroke={fg} strokeWidth={8} />
      <circle cx={50} cy={56} r={6} fill={accent} />
    </g>
  ),
  socket: ({ fg, accent }) => (
    <g>
      <rect x={16} y={16} width={68} height={68} rx={18} fill={fg} />
      <circle cx={50} cy={50} r={22} fill="none" stroke={accent} strokeWidth={4} />
      <rect x={36} y={38} width={8} height={18} rx={4} fill={accent} />
      <rect x={56} y={38} width={8} height={18} rx={4} fill={accent} />
    </g>
  ),
  /** A progress bar, part-filled. */
  loading: ({ fg, accent }) => (
    <g>
      <rect x={10} y={38} width={80} height={24} rx={12} fill="none" stroke={fg} strokeWidth={5} />
      <rect x={16} y={44} width={44} height={12} rx={6} fill={accent} />
    </g>
  ),
  /** A battery that's almost empty. */
  battery: ({ fg, accent }) => (
    <g {...round}>
      <rect x={14} y={30} width={64} height={40} rx={8} fill="none" stroke={fg} strokeWidth={6} />
      <rect x={80} y={42} width={8} height={16} rx={3} fill={fg} />
      <rect x={22} y={38} width={12} height={24} rx={3} fill={accent} />
    </g>
  ),
  /** An ORIGINAL anime-style character: bob haircut, star clip, sparkly eyes. Not based on any existing character. */
  animeFace: ({ fg, accent }) => (
    <g>
      <path d="M17 58 Q14 16 50 14 Q86 16 83 58 L84 80 Q74 72 71 60 L29 60 Q26 72 16 80 Z" fill={fg} />
      <ellipse cx={50} cy={58} rx={26} ry={25} fill="#FFE6D3" />
      <path d="M23 54 Q24 25 50 23 Q76 25 77 54 L69 42 L62 54 L55 39 L47 54 L40 41 L33 54 Z" fill={fg} />
      <ellipse cx={39} cy={63} rx={5.5} ry={8} fill="#121212" />
      <ellipse cx={61} cy={63} rx={5.5} ry={8} fill="#121212" />
      <circle cx={41} cy={59.5} r={2.4} fill="#fff" />
      <circle cx={63} cy={59.5} r={2.4} fill="#fff" />
      <circle cx={37.5} cy={67} r={1.2} fill="#fff" />
      <circle cx={59.5} cy={67} r={1.2} fill="#fff" />
      <ellipse cx={31} cy={73} rx={4.5} ry={2.2} fill={accent} opacity={0.55} />
      <ellipse cx={69} cy={73} rx={4.5} ry={2.2} fill={accent} opacity={0.55} />
      <path d="M46 75 q4 4 8 0" stroke="#121212" strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <path d="M74 22 l3.5 7 7.5 1 -5.5 5 1.5 7.5 -7 -3.8 -7 3.8 1.5 -7.5 -5.5 -5 7.5 -1 z" fill="#FFD447" stroke="#121212" strokeWidth={1.5} strokeLinejoin="round" />
    </g>
  ),
  ramen: ({ fg, accent }) => (
    <g {...round}>
      <path d="M80 12 L50 44 M90 20 L56 46" stroke={fg} strokeWidth={4.5} />
      <path d="M22 50 q8 -14 16 0 q8 -14 16 0 q8 -14 16 0" stroke="#FFF3C4" strokeWidth={5} fill="none" />
      <circle cx={36} cy={44} r={9} fill="#fff" stroke={fg} strokeWidth={2.5} />
      <circle cx={36} cy={44} r={4.5} fill="#FFB020" />
      <path d="M12 50 H88 Q86 84 50 84 Q14 84 12 50 Z" fill={fg} />
      <rect x={10} y={47} width={80} height={7} rx={3.5} fill={accent} />
      <path d="M30 66 h40" stroke={accent} strokeWidth={4} />
    </g>
  ),
  speedStar: ({ fg, accent }) => (
    <g {...round}>
      <path d="M8 40 h20 M4 52 h22 M10 64 h16" stroke={accent} strokeWidth={4} />
      <path d="M60 14 l9 19 21 3 -15 15 4 21 -19 -10 -19 10 4 -21 -15 -15 21 -3 z" fill={fg} />
    </g>
  ),
  clapper: ({ fg, bg, accent }) => (
    <g>
      <g transform="rotate(-12 18 34)">
        <rect x={14} y={22} width={72} height={14} rx={2} fill={fg} />
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M${22 + i * 17} 22 l9 0 -7 14 -9 0 z`} fill={bg} />
        ))}
      </g>
      <rect x={14} y={40} width={72} height={46} rx={4} fill={fg} />
      <rect x={14} y={40} width={72} height={10} fill={accent} />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${18 + i * 17} 40 l9 0 -7 10 -9 0 z`} fill={bg} />
      ))}
      <path d="M22 62 h40 M22 72 h26" stroke={bg} strokeWidth={4} strokeLinecap="round" />
    </g>
  ),
  ticket: ({ fg, accent }) => (
    <g>
      <path d="M10 30 h80 v12 a8 8 0 0 0 0 16 v12 h-80 v-12 a8 8 0 0 0 0 -16 z" fill={fg} />
      <path d="M66 32 v36" stroke={accent} strokeWidth={3} strokeDasharray="4 4" />
      <path d="M38 38 l3.5 7 7.5 1 -5.5 5 1.5 7.5 -7 -4 -7 4 1.5 -7.5 -5.5 -5 7.5 -1 z" fill={accent} />
    </g>
  ),
  popcorn: ({ fg, accent }) => (
    <g>
      {[
        [30, 32, 12], [46, 24, 13], [62, 30, 12], [72, 42, 10], [22, 44, 10], [50, 38, 12],
      ].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="#FFF6DA" stroke="#121212" strokeWidth={2.5} />
      ))}
      <path d="M18 46 H82 L74 90 H26 Z" fill={accent} stroke="#121212" strokeWidth={3} strokeLinejoin="round" />
      <path d="M32 46 L36 90 M50 46 V90 M68 46 L64 90" stroke={fg} strokeWidth={6} />
    </g>
  ),
  quoteMarks: ({ fg, accent }) => (
    <g>
      <path d="M14 56 q0 -26 22 -32 l3 7 q-12 5 -12 15 h10 v22 h-23 z" fill={fg} />
      <path d="M50 56 q0 -26 22 -32 l3 7 q-12 5 -12 15 h10 v22 h-23 z" fill={fg} />
      <circle cx={84} cy={78} r={6} fill={accent} />
    </g>
  ),
  /** An ORIGINAL masked hero silhouette. Deliberately generic — not any existing character. */
  hero: ({ fg, bg, accent }) => (
    <g {...round}>
      <path d="M32 42 Q18 70 12 92 H88 Q82 70 68 42 Z" fill={accent} />
      <path d="M34 50 Q50 42 66 50 L70 92 H30 Z" fill={fg} />
      <circle cx={50} cy={28} r={15} fill={fg} />
      <path d="M35 25 Q50 19 65 25 V33 Q50 29 35 33 Z" fill={accent} />
      <ellipse cx={44} cy={28.5} rx={3.2} ry={2} fill="#fff" />
      <ellipse cx={56} cy={28.5} rx={3.2} ry={2} fill="#fff" />
      <path d="M52 56 L42 70 H50 L46 82 L58 66 H50 Z" fill={bg} />
    </g>
  ),
  /** An ORIGINAL hero-team emblem: a bolt inside a hexagon. */
  emblem: ({ fg, accent }) => (
    <g strokeLinejoin="round">
      <path d="M50 8 L86 29 V71 L50 92 L14 71 V29 Z" fill={fg} />
      <path d="M50 18 L77 34 V66 L50 82 L23 66 V34 Z" fill="none" stroke={accent} strokeWidth={3.5} />
      <path d="M56 26 L36 54 H50 L44 76 L66 46 H52 Z" fill={accent} />
    </g>
  ),
  envelope: ({ fg, bg, accent }) => (
    <g {...round}>
      <rect x={12} y={24} width={76} height={54} rx={6} fill={bg} stroke={fg} strokeWidth={5} />
      <path d="M14 28 L50 56 L86 28" stroke={fg} strokeWidth={5} fill="none" />
      <circle cx={50} cy={56} r={8} fill={accent} stroke={fg} strokeWidth={3} />
    </g>
  ),
};
