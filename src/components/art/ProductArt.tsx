/**
 * PRODUCT ARTWORK
 * Turns a product's `art` description into a 400×400 SVG illustration.
 * Three views are available for the product gallery:
 *   'main'    — the product on its coloured backdrop
 *   'detail'  — a zoomed-in crop
 *   'context' — how it might look in use (laptop lid / wall)
 *
 * When a product has real `images`, <ProductImage> shows those instead.
 */
import { createContext, useContext, useId, useState, type ReactNode } from 'react';
import type { PosterDesign, Product, ProductArt as Art, StickerDesign } from '../../types/product';
import { brand } from '../../config/brand';
import { motifs } from './motifs';
import { StickerGroup } from './Sticker';
import { apiUrl } from '../../context/AuthContext';

export type ArtView = 'main' | 'detail' | 'context';

const font = { fontFamily: 'var(--font-display)' };

/** Picks black or white text for a background colour. */
function readableOn(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#121212' : '#FFFFFF';
}

/**
 * Soft shadow filter. Each <ProductArtSvg> defines its own copy with a unique
 * id (several SVGs share one page), and passes the id down via ShadowContext.
 */
const ShadowContext = createContext<string | null>(null);

function ShadowFilter({ id }: { id: string }) {
  return (
    <filter id={id} x="-30%" y="-30%" width="160%" height="170%" colorInterpolationFilters="sRGB">
      {/* a tight contact shadow plus a wide, soft one = "sitting on a surface" */}
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#2a2016" floodOpacity="0.28" />
      <feDropShadow dx="0" dy="9" stdDeviation="8" floodColor="#2a2016" floodOpacity="0.16" />
    </filter>
  );
}

/** Wraps children in the soft shadow (when one is available). */
function Soft({ children }: { children: ReactNode }) {
  const id = useContext(ShadowContext);
  return id ? <g filter={`url(#${id})`}>{children}</g> : <>{children}</>;
}

/** Place a 100-unit sticker at (x, y) with a given pixel size and rotation. */
function Placed({ design, x, y, size, rotate = 0, shadow = true, cutLine = false }: {
  design: StickerDesign; x: number; y: number; size: number; rotate?: number; shadow?: boolean; cutLine?: boolean;
}) {
  const s = size / 100;
  const sticker = (
    <g transform={`translate(${x} ${y}) rotate(${rotate} ${size / 2} ${size / 2}) scale(${s})`}>
      <StickerGroup design={design} shadow={false} cutLine={cutLine} />
    </g>
  );
  return shadow ? <Soft>{sticker}</Soft> : sticker;
}

/** One die-cut sticker, slightly rotated, casting a soft shadow. */
function Single({ design }: { design: StickerDesign }) {
  return <Placed design={design} x={84} y={80} size={232} rotate={-6} />;
}

/** A backing sheet with a printed header and several stickers, each with its own cut line. */
function Sheet({ designs, name }: { designs: StickerDesign[]; name: string }) {
  const cols = 3;
  const rows = Math.ceil(designs.length / cols);
  const cell = 74;
  const gap = 8;
  const gridW = cols * cell + (cols - 1) * gap;
  const gridH = rows * cell + (rows - 1) * gap;
  const x0 = 200 - gridW / 2;
  const y0 = 100 + (250 - gridH) / 2;
  const sheet = { x: 70, y: 24, w: 260, h: 356 };
  return (
    <g transform="rotate(-2 200 200)">
      <Soft>
        <rect x={sheet.x} y={sheet.y} width={sheet.w} height={sheet.h} rx={10} fill="#FFFDF8" />
      </Soft>
      {/* printed header band */}
      <path d={`M${sheet.x} ${sheet.y + 10} a10 10 0 0 1 10 -10 h${sheet.w - 20} a10 10 0 0 1 10 10 v52 h-${sheet.w} z`} fill="#121212" />
      <text x={sheet.x + 18} y={sheet.y + 30} fontSize={13} fontWeight={800} fill="#F5F0E6" style={font}>{name.toUpperCase()}</text>
      <text x={sheet.x + 18} y={sheet.y + 47} fontSize={9} fontWeight={700} fill="#D4FF3A" style={font}>
        {brand.name} · {designs.length} STICKERS
      </text>
      {designs.map((dz, i) => (
        <Placed
          key={dz.name + i}
          design={dz}
          x={x0 + (i % cols) * (cell + gap) + 7}
          y={y0 + Math.floor(i / cols) * (cell + gap) + 7}
          size={cell - 14}
          rotate={[-4, 3, -2, 4, -3, 2][i % 6]}
          shadow={false}
          cutLine
        />
      ))}
      {/* lifted corner of the backing paper */}
      <path d={`M${sheet.x + sheet.w} ${sheet.y + sheet.h - 30} L${sheet.x + sheet.w - 30} ${sheet.y + sheet.h} L${sheet.x + sheet.w - 10} ${sheet.y + sheet.h} a10 10 0 0 0 10 -10 z`} fill="#E9E3D6" />
      <path d={`M${sheet.x + sheet.w} ${sheet.y + sheet.h - 30} L${sheet.x + sheet.w - 30} ${sheet.y + sheet.h} L${sheet.x + sheet.w - 26} ${sheet.y + sheet.h - 26} z`} fill="#FFFFFF" />
    </g>
  );
}

const fanPositions = [
  { x: 86, y: 140, r: -12, s: 108 },
  { x: 200, y: 128, r: 9, s: 104 },
  { x: 112, y: 236, r: 6, s: 100 },
  { x: 214, y: 232, r: -9, s: 96 },
];

/** A backing card in a clear sleeve, with stickers fanned out in front. */
function Pack({ designs, card, name }: { designs: StickerDesign[]; card: string; name: string }) {
  const text = readableOn(card);
  const c = { x: 62, y: 30, w: 276, h: 346 };
  return (
    <g>
      <Soft>
        <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={18} fill={card} />
      </Soft>
      {/* hang slot */}
      <rect x={176} y={c.y + 14} width={48} height={12} rx={6} fill="#000" opacity={0.28} />
      {/* label */}
      <text x={c.x + 22} y={c.y + 62} fontSize={18} fontWeight={800} fill={text} style={font}>{name.toUpperCase()}</text>
      <text x={c.x + 22} y={c.y + 80} fontSize={10} fontWeight={700} fill={text} opacity={0.7} style={font}>
        {brand.name} · {designs.length} STICKERS
      </text>
      <circle cx={c.x + c.w - 34} cy={c.y + 64} r={22} fill="#D4FF3A" stroke="#121212" strokeWidth={2.5} />
      <text x={c.x + c.w - 34} y={c.y + 71} textAnchor="middle" fontSize={17} fontWeight={800} fill="#121212" style={font}>×{designs.length}</text>
      {designs.slice(0, 4).map((dz, i) => (
        <Placed key={dz.name + i} design={dz} x={fanPositions[i].x} y={fanPositions[i].y} size={fanPositions[i].s} rotate={fanPositions[i].r} />
      ))}
      {/* clear sleeve: edge highlight, top seal and a diagonal sheen */}
      <rect x={c.x + 4} y={c.y + 4} width={c.w - 8} height={c.h - 8} rx={15} fill="none" stroke="#fff" strokeOpacity={0.45} strokeWidth={2} />
      <line x1={c.x + 10} y1={c.y + 36} x2={c.x + c.w - 10} y2={c.y + 36} stroke="#fff" strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="2 3" />
      <path d={`M${c.x} ${c.y + 300} L${c.x + c.w} ${c.y + 170} V${c.y + 205} L${c.x} ${c.y + 335} Z`} fill="#fff" opacity={0.1} />
    </g>
  );
}

/**
 * A sealed kraft envelope: three stickers peek out of the top, the front shows
 * the pack format (5 + 1), the series code and a visibly DEMO pack number.
 */
function Mystery({
  card,
  peek,
  quantity,
  themeName,
  themeCode,
}: {
  card: string;
  peek: StickerDesign[];
  quantity?: number;
  themeName?: string;
  themeCode?: string;
}) {
  const q: StickerDesign = { name: '?', motif: 'question', shape: 'circle', bg: '#D4FF3A', fg: '#121212', accent: '#FF5B2E' };
  const env = { x: 64, y: 118, w: 272, h: 250 };
  const titleText = themeName ? `${themeName.toUpperCase()}` : 'MYSTERY PACK';
  const packNo = themeCode || 'DEMO-000';
  return (
    <g>
      {/* stickers sliding out of the envelope */}
      {peek.slice(0, 3).map((dz, i) => (
        <Placed key={dz.name + i} design={dz} x={[86, 150, 222][i]} y={[66, 46, 70][i]} size={[96, 100, 92][i]} rotate={[-14, 4, 14][i]} />
      ))}
      <Soft>
        <rect x={env.x} y={env.y} width={env.w} height={env.h} rx={14} fill={card} />
      </Soft>
      {/* envelope flap + seal */}
      <path d={`M${env.x} ${env.y + 6} Q${env.x} ${env.y} ${env.x + 8} ${env.y} H${env.x + env.w - 8} Q${env.x + env.w} ${env.y} ${env.x + env.w} ${env.y + 6} L200 ${env.y + 74} Z`} fill="#000" opacity={0.08} />
      <path d={`M${env.x + 2} ${env.y + 4} L200 ${env.y + 70} L${env.x + env.w - 2} ${env.y + 4}`} stroke="#121212" strokeOpacity={0.35} strokeWidth={2} fill="none" />
      <Placed design={q} x={172} y={env.y + 42} size={56} rotate={-8} shadow={false} />
      {/* printed front */}
      <text x={env.x + 22} y={env.y + 148} fontSize={titleText.length > 13 ? 18 : 22} fontWeight={800} fill="#121212" style={font}>
        {titleText}
      </text>
      <text x={env.x + 22} y={env.y + 172} fontSize={11} fontWeight={700} fill="#121212" opacity={0.75} style={font}>
        {brand.name} · {quantity ?? 6} STICKERS
      </text>
      <g transform={`translate(${env.x + 22} ${env.y + 190})`}>
        <rect width={112} height={36} rx={18} fill="#121212" />
        <text x={56} y={24} textAnchor="middle" fontSize={17} fontWeight={800} fill="#D4FF3A" style={font}>5 + 1 ?</text>
      </g>
      <g transform={`translate(${env.x + env.w - 116} ${env.y + 190})`}>
        <rect width={96} height={36} rx={8} fill="none" stroke="#121212" strokeWidth={2} strokeDasharray="4 3" />
        <text x={48} y={15} textAnchor="middle" fontSize={8} fontWeight={800} fill="#121212" style={font}>PACK NO.</text>
        <text x={48} y={28} textAnchor="middle" fontSize={9} fontWeight={800} fill="#121212" style={font}>
          {packNo}
        </text>
      </g>
    </g>
  );
}

/** Two coordinated stickers. 'halves' draws one design split down the middle. */
function Duo({ designs, pairing }: { designs: [StickerDesign, StickerDesign]; pairing: string }) {
  const clip = 'half' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  if (pairing === 'halves') {
    const size = 236;
    const x = 82;
    const y = 82;
    return (
      <g>
        <defs>
          <clipPath id={`${clip}L`}>
            <rect x={0} y={0} width={200} height={400} />
          </clipPath>
          <clipPath id={`${clip}R`}>
            <rect x={200} y={0} width={200} height={400} />
          </clipPath>
        </defs>
        <g className="transition-transform duration-300 ease-out group-hover:translate-x-4 group-hover:-translate-y-2 group-hover:rotate-0" transform="translate(-16 8) rotate(-5 200 200)">
          <g clipPath={`url(#${clip}L)`}>
            <Placed design={designs[0]} x={x} y={y} size={size} />
          </g>
        </g>
        <g className="transition-transform duration-300 ease-out group-hover:-translate-x-4 group-hover:translate-y-2 group-hover:rotate-0" transform="translate(16 -8) rotate(5 200 200)">
          <g clipPath={`url(#${clip}R)`}>
            <Placed design={designs[0]} x={x} y={y} size={size} />
          </g>
        </g>
      </g>
    );
  }
  if (pairing === 'laptop-phone') {
    return (
      <g className="transition-all duration-300">
        <g className="transition-transform duration-300 ease-out group-hover:-translate-x-2 group-hover:rotate-[-4deg]">
          <Placed design={designs[0]} x={40} y={86} size={210} rotate={-6} />
        </g>
        <g className="transition-transform duration-300 ease-out group-hover:translate-x-2 group-hover:rotate-[10deg]">
          <Placed design={designs[1]} x={236} y={150} size={130} rotate={8} />
        </g>
      </g>
    );
  }
  return (
    <g className="transition-all duration-300">
      <g className="transition-transform duration-300 ease-out group-hover:-translate-x-3 group-hover:rotate-[-4deg]">
        <Placed design={designs[0]} x={30} y={98} size={176} rotate={-8} />
      </g>
      <g className="transition-transform duration-300 ease-out group-hover:translate-x-3 group-hover:rotate-[4deg]">
        <Placed design={designs[1]} x={196} y={118} size={176} rotate={7} />
      </g>
    </g>
  );
}

/** A sealed message card in a small envelope, with a wax-style seal. */
function SealedCard({ x, y, w, color, rotate = 0 }: { x: number; y: number; w: number; color: string; rotate?: number }) {
  const h = w * 0.66;
  return (
    <g transform={`rotate(${rotate} ${x + w / 2} ${y + h / 2})`}>
      <Soft>
        <rect x={x} y={y} width={w} height={h} rx={w * 0.04} fill={color} />
      </Soft>
      <path d={`M${x + 3} ${y + 3} L${x + w / 2} ${y + h * 0.55} L${x + w - 3} ${y + 3}`} stroke="#121212" strokeOpacity={0.3} strokeWidth={2} fill="none" />
      <circle cx={x + w / 2} cy={y + h * 0.55} r={w * 0.09} fill="#121212" />
      <text x={x + w / 2} y={y + h * 0.55 + w * 0.045} textAnchor="middle" fontSize={w * 0.11} fontWeight={800} fill="#D4FF3A" style={font}>?</text>
      <text x={x + w / 2} y={y + h - w * 0.06} textAnchor="middle" fontSize={w * 0.065} fontWeight={800} fill="#121212" opacity={0.75} style={font}>
        SEALED MESSAGE
      </text>
    </g>
  );
}

function Secret({ design, envelope }: { design: StickerDesign; envelope: string }) {
  return (
    <g>
      <SealedCard x={150} y={188} w={210} color={envelope} rotate={6} />
      <Placed design={design} x={40} y={56} size={210} rotate={-7} />
    </g>
  );
}

function SecretPack({ designs, envelope }: { designs: StickerDesign[]; envelope: string }) {
  return (
    <g>
      <SealedCard x={150} y={232} w={200} color={envelope} rotate={-4} />
      <SealedCard x={160} y={214} w={200} color="#E9D3AE" rotate={5} />
      {designs.slice(0, 4).map((dz, i) => (
        <Placed key={dz.name + i} design={dz} x={fanPositions[i].x - 30} y={fanPositions[i].y - 70} size={fanPositions[i].s + 6} rotate={fanPositions[i].r} />
      ))}
    </g>
  );
}

/** Background decoration drawn inside a poster's printed area. */
function PosterPattern({ pattern, x, y, w, h, color }: { pattern: PosterDesign['pattern']; x: number; y: number; w: number; h: number; color: string }) {
  if (!pattern) return null;
  const items = [];
  if (pattern === 'dots') {
    const step = w / 8;
    for (let px = x + step / 2; px < x + w; px += step)
      for (let py = y + step / 2; py < y + h; py += step) items.push(<circle key={`${px}-${py}`} cx={px} cy={py} r={step * 0.14} />);
  } else if (pattern === 'stripes') {
    const step = h / 12;
    for (let i = 0; i < 12; i += 2) items.push(<rect key={i} x={x} y={y + i * step} width={w} height={step} />);
  } else if (pattern === 'grid') {
    const step = w / 7;
    for (let px = x + step; px < x + w; px += step) items.push(<rect key={`v${px}`} x={px} y={y} width={w * 0.006} height={h} />);
    for (let py = y + step; py < y + h; py += step) items.push(<rect key={`h${py}`} x={x} y={py} width={w} height={w * 0.006} />);
  } else if (pattern === 'sun') {
    const cx = x + w / 2;
    const cy = y + h * 0.36;
    const r = Math.max(w, h);
    for (let i = 0; i < 18; i += 2) {
      const a1 = (Math.PI * 2 * i) / 18;
      const a2 = (Math.PI * 2 * (i + 1)) / 18;
      items.push(<path key={i} d={`M${cx} ${cy} L${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} L${cx + r * Math.cos(a2)} ${cy + r * Math.sin(a2)} Z`} />);
    }
  }
  return (
    <g fill={color} opacity={0.14}>
      {items}
    </g>
  );
}

function PosterFrame({ poster, x, y, w }: { poster: PosterDesign; x: number; y: number; w: number }) {
  const clipId = 'clip' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const h = w * 1.414; // A-series paper ratio
  const Motif = poster.motif ? motifs[poster.motif] : null;
  const lines = poster.title.split('\n');
  const longest = Math.max(...lines.map((l) => l.length));
  const size = Math.min(w * 0.17, (w * 0.78) / (0.62 * longest));
  const inner = { x: x + w * 0.05, y: y + w * 0.05, w: w * 0.9, h: h - w * 0.1 };
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect x={inner.x} y={inner.y} width={inner.w} height={inner.h} />
        </clipPath>
      </defs>
      <rect x={x} y={y} width={w} height={h} fill="#000" opacity={0.16} transform="translate(4 6)" />
      <rect x={x} y={y} width={w} height={h} fill="#fff" />
      <rect x={inner.x} y={inner.y} width={inner.w} height={inner.h} fill={poster.bg} />
      <g clipPath={`url(#${clipId})`}>
        <PosterPattern pattern={poster.pattern} {...inner} color={poster.fg} />
      </g>
      {Motif && (
        <g transform={`translate(${x + w * 0.2} ${y + w * 0.14}) scale(${(w * 0.6) / 100})`}>
          <Motif fg={poster.accent === poster.bg ? poster.fg : poster.accent} bg={poster.bg} accent={poster.fg} />
        </g>
      )}
      <text fontSize={size} fontWeight={800} fill={poster.fg} style={{ ...font, letterSpacing: '-0.03em' }}>
        {lines.map((l, i) => (
          <tspan key={i} x={x + w * 0.12} y={y + h - w * 0.15 - (lines.length - 1 - i) * size}>
            {l}
          </tspan>
        ))}
      </text>
      <rect x={x + w * 0.12} y={y + h - w * 0.1} width={w * 0.24} height={w * 0.025} fill={poster.fg} />
      {/* tape */}
      <rect x={x + w / 2 - w * 0.12} y={y - w * 0.04} width={w * 0.24} height={w * 0.08} fill="#fff" opacity={0.6} transform={`rotate(-4 ${x + w / 2} ${y})`} />
    </g>
  );
}

/** Lays out 2–6 posters as a small gallery wall. */
function PosterSet({ posters }: { posters: PosterDesign[] }) {
  if (posters.length <= 3) {
    return (
      <g>
        {posters.map((p, i) => (
          <PosterFrame key={p.title + i} poster={p} x={34 + i * 116} y={96 + (i % 2) * 22} w={104} />
        ))}
      </g>
    );
  }
  // Gallery-wall arrangement: two rows.
  const spots = [
    { x: 40, y: 40, w: 96 },
    { x: 152, y: 26, w: 96 },
    { x: 264, y: 40, w: 96 },
    { x: 96, y: 208, w: 96 },
    { x: 208, y: 214, w: 96 },
    { x: 300, y: 222, w: 80 },
  ];
  return (
    <g>
      {posters.slice(0, spots.length).map((p, i) => (
        <PosterFrame key={p.title + i} poster={p} x={spots[i].x} y={spots[i].y} w={spots[i].w} />
      ))}
    </g>
  );
}

function Collage() {
  const tiles = ['#FFB3D1', '#8FD3FF', '#FFD447', '#7FE0B5', '#8A6CFF', '#FF5B2E'];
  return (
    <g>
      <rect x={90} y={40} width={220} height={311} fill="#000" opacity={0.15} transform="translate(4 6)" />
      <rect x={90} y={40} width={220} height={311} fill="#fff" />
      {tiles.map((c, i) => {
        const tx = 104 + (i % 2) * 98;
        const ty = 54 + Math.floor(i / 2) * 92;
        return (
          <g key={c}>
            <rect x={tx} y={ty} width={94} height={86} fill={c} />
            <circle cx={tx + 70} cy={ty + 22} r={9} fill="#fff" opacity={0.8} />
            <path d={`M${tx} ${ty + 86} L${tx + 34} ${ty + 46} L${tx + 56} ${ty + 70} L${tx + 70} ${ty + 56} L${tx + 94} ${ty + 86} Z`} fill="#121212" opacity={0.25} />
          </g>
        );
      })}
      <rect x={140} y={322} width={120} height={22} rx={11} fill="#121212" />
      <text x={200} y={337} textAnchor="middle" fontSize={10} fontWeight={800} fill="#fff" style={font}>YOUR PHOTOS</text>
    </g>
  );
}

function MainArt({ art, product }: { art: Art; product: Product }) {
  switch (art.kind) {
    case 'single':
      return <Single design={art.design} />;
    case 'sheet':
      return <Sheet designs={art.designs} name={product.name} />;
    case 'pack':
      return <Pack designs={art.designs} card={art.card} name={product.name} />;
    case 'mystery':
      return <Mystery card={art.card} peek={art.peek} quantity={product.packQuantity} themeName={art.themeName} themeCode={art.themeCode} />;
    case 'duo':
      return <Duo designs={art.designs} pairing={art.pairing} />;
    case 'secret':
      return <Secret design={art.design} envelope={art.envelope} />;
    case 'secret-pack':
      return <SecretPack designs={art.designs} envelope={art.envelope} />;
    case 'poster':
      return <PosterFrame poster={art.poster} x={98} y={42} w={204} />;
    case 'poster-set':
      return <PosterSet posters={art.posters} />;
    case 'collage':
      return <Collage />;
  }
}

/** Every sticker design inside a product (for the laptop "in use" view). */
function designsOf(art: Art): StickerDesign[] {
  if (art.kind === 'single' || art.kind === 'secret') return [art.design];
  if (art.kind === 'sheet' || art.kind === 'pack' || art.kind === 'secret-pack') return art.designs;
  if (art.kind === 'duo') return art.pairing === 'halves' ? [] : art.designs;
  return [];
}

const laptopSpots = [
  { x: 96, y: 112, s: 96, r: -10 },
  { x: 214, y: 100, s: 84, r: 8 },
  { x: 150, y: 196, s: 78, r: 4 },
  { x: 250, y: 200, s: 70, r: -6 },
  { x: 92, y: 226, s: 62, r: 12 },
];

function ContextArt({ art, product }: { art: Art; product: Product }) {
  const designs = designsOf(art);
  if (designs.length) {
    // Stickers on a laptop lid.
    const spots = designs.length === 1 ? [{ x: 136, y: 136, s: 128, r: -8 }] : laptopSpots;
    return (
      <g>
        <rect x={52} y={60} width={296} height={236} rx={18} fill="#2B2B30" />
        <rect x={52} y={60} width={296} height={236} rx={18} fill="none" stroke="#fff" strokeOpacity={0.08} strokeWidth={4} />
        <rect x={30} y={296} width={340} height={20} rx={8} fill="#3A3A40" />
        <rect x={160} y={296} width={80} height={8} rx={4} fill="#1F1F23" />
        {designs.slice(0, spots.length).map((dz, i) => (
          <Placed key={dz.name + i} design={dz} x={spots[i].x} y={spots[i].y} size={spots[i].s} rotate={spots[i].r} />
        ))}
      </g>
    );
  }
  // Posters on a wall above a desk.
  return (
    <g>
      <rect x={0} y={300} width={400} height={100} fill="#000" opacity={0.08} />
      <rect x={70} y={300} width={260} height={12} rx={4} fill="#121212" opacity={0.75} />
      <g transform="translate(60 22) scale(0.7)">
        <MainArt art={art} product={product} />
      </g>
    </g>
  );
}

function viewBoxFor(view: ArtView, kind: Art['kind']): string {
  if (view !== 'detail') return '0 0 400 400';
  if (kind === 'sheet') return '76 88 250 250';
  if (kind === 'pack') return '72 112 270 270';
  if (kind === 'poster') return '98 130 210 210';
  if (kind === 'poster-set') return '30 20 250 250';
  if (kind === 'duo') return '20 60 300 300';
  if (kind === 'secret') return '30 40 240 240';
  return '90 80 220 220';
}

const viewLabels: Record<ArtView, string> = {
  main: 'product illustration',
  detail: 'close-up illustration',
  context: 'illustration of how it could look in use',
};

export function ProductArtSvg({ product, view = 'main', className }: { product: Product; view?: ArtView; className?: string }) {
  const art = product.art;
  const shadowId = 'soft' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <svg viewBox={viewBoxFor(view, art.kind)} className={className} role="img" aria-label={`${product.name} — ${viewLabels[view]} (demo artwork)`}>
      <defs>
        <ShadowFilter id={shadowId} />
      </defs>
      <rect x={-10} y={-10} width={420} height={420} fill={view === 'context' ? '#E9E3D6' : art.backdrop} />
      <ShadowContext.Provider value={shadowId}>
        {view === 'context' ? <ContextArt art={art} product={product} /> : <MainArt art={art} product={product} />}
      </ShadowContext.Provider>
    </svg>
  );
}

/** Which gallery views make sense for a product. */
export function viewsFor(product: Product): ArtView[] {
  if (product.art.kind === 'mystery') return ['main'];
  if (product.art.kind === 'duo' && product.art.pairing === 'halves') return ['main', 'detail'];
  if (product.art.kind === 'collage') return ['main', 'context'];
  return ['main', 'detail', 'context'];
}

/**
 * The single entry point components should use for product images.
 * Uses real photos when `product.images` exists; otherwise the SVG artwork.
 */
export function ProductImage({ product, view = 'main', index = 0, className }: {
  product: Product; view?: ArtView; index?: number; className?: string;
}) {
  const photo = product.images?.[index];
  const [loadError, setLoadError] = useState(false);
  if (photo && !loadError) {
    const raw = photo.src;
    const src = raw.startsWith('http') || !apiUrl ? raw : `${apiUrl}${raw.startsWith('/') ? '' : '/'}${raw}`;
    const isPoster = product.category === 'posters' || product.productType === 'poster';
    const fitClass = className?.includes('object-') ? '' : (isPoster ? 'object-cover object-center' : 'object-cover');

    // Fast-loading WebP alternative
    const webpSrc = src.replace(/\.(png|jpe?g)$/i, '.webp');
    const isStaticAsset = src.startsWith('/PNG/') || src.startsWith('/Stickers/') || src.startsWith('/Poster/') || src.startsWith('/hero-stickers/') || src.startsWith('/cute/');
    const safeWebpSrc = encodeURI(webpSrc);
    const safeSrc = encodeURI(src);

    return (
      <picture className="contents">
        {isStaticAsset && <source srcSet={safeWebpSrc} type="image/webp" />}
        <img
          src={isStaticAsset ? safeWebpSrc : safeSrc}
          alt={photo.alt || product.name}
          className={`${className ?? ''} ${fitClass}`.trim()}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            const target = e.currentTarget;
            if (isStaticAsset && target.src.endsWith('.webp') && !src.endsWith('.webp')) {
              target.src = safeSrc;
            } else {
              setLoadError(true);
            }
          }}
        />
      </picture>
    );
  }
  return <ProductArtSvg product={product} view={view} className={className} />;
}

/** A single poster drawn on its own (used in the homepage hero). */
export function PosterSvg({ poster, className }: { poster: PosterDesign; className?: string }) {
  return (
    <svg viewBox="-6 -10 112 162" className={className} aria-hidden>
      <PosterFrame poster={poster} x={0} y={0} w={100} />
    </svg>
  );
}

/**
 * The printed face of a poster, edge to edge, with no frame or tape.
 * Used inside wall slots, where the slot itself is the frame.
 */
export function PosterFaceSvg({ poster, className }: { poster: PosterDesign; className?: string }) {
  const clipId = 'face' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const w = 100;
  const h = 141.4;
  const Motif = poster.motif ? motifs[poster.motif] : null;
  const lines = poster.title.split('\n');
  const longest = Math.max(...lines.map((l) => l.length));
  const size = Math.min(w * 0.18, (w * 0.8) / (0.62 * longest));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <rect width={w} height={h} />
        </clipPath>
      </defs>
      <rect width={w} height={h} fill={poster.bg} />
      <g clipPath={`url(#${clipId})`}>
        <PosterPattern pattern={poster.pattern} x={0} y={0} w={w} h={h} color={poster.fg} />
      </g>
      {Motif && (
        <g transform={`translate(${w * 0.18} ${w * 0.12}) scale(${(w * 0.64) / 100})`}>
          <Motif fg={poster.accent === poster.bg ? poster.fg : poster.accent} bg={poster.bg} accent={poster.fg} />
        </g>
      )}
      <text fontSize={size} fontWeight={800} fill={poster.fg} style={{ ...font, letterSpacing: '-0.03em' }}>
        {lines.map((l, i) => (
          <tspan key={i} x={w * 0.1} y={h - w * 0.13 - (lines.length - 1 - i) * size}>
            {l}
          </tspan>
        ))}
      </text>
      <rect x={w * 0.1} y={h - w * 0.08} width={w * 0.26} height={w * 0.03} fill={poster.fg} />
    </svg>
  );
}
