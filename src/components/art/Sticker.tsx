/**
 * Draws ONE sticker (shape + white die-cut border + motif and/or text)
 * inside a 100×100 coordinate box, as an SVG <g> group. Larger artwork
 * (sheets, packs, the hero) places several of these with `transform`.
 */
import type { SVGProps } from 'react';
import type { StickerDesign, StickerShape } from '../../types/product';
import { motifs } from './motifs';

// 14-point scalloped "badge" outline.
const badgePoints = Array.from({ length: 28 }, (_, i) => {
  const angle = (Math.PI * 2 * i) / 28 - Math.PI / 2;
  const r = i % 2 === 0 ? 45 : 38;
  return `${(50 + r * Math.cos(angle)).toFixed(2)},${(50 + r * Math.sin(angle)).toFixed(2)}`;
}).join(' ');

type ShapeProps = SVGProps<SVGPathElement & SVGCircleElement & SVGRectElement & SVGPolygonElement>;

export function ShapeOutline({ shape, ...props }: { shape: StickerShape } & ShapeProps) {
  switch (shape) {
    case 'circle':
      return <circle cx={50} cy={50} r={43} {...props} />;
    case 'rounded':
      return <rect x={7} y={7} width={86} height={86} rx={22} {...props} />;
    case 'pill':
      return <rect x={4} y={22} width={92} height={56} rx={28} {...props} />;
    case 'blob':
      return <path d="M52 6 C78 8 94 25 92 51 C90 77 72 94 47 93 C22 92 6 74 8 48 C10 24 27 4 52 6 Z" {...props} />;
    case 'badge':
      return <polygon points={badgePoints} {...props} />;
  }
}

/** Width available for text inside each shape (in the 100-unit box). */
const textWidth: Record<StickerShape, number> = { circle: 66, rounded: 72, pill: 80, blob: 68, badge: 58 };

function Label({ text, shape, fill, top, maxSize }: { text: string; shape: StickerShape; fill: string; top?: number; maxSize: number }) {
  const lines = text.split('\n');
  const longest = Math.max(...lines.map((l) => l.length));
  // Bold display type is roughly 0.62 × font size wide per character.
  const size = Math.min(maxSize, textWidth[shape] / (0.62 * longest));
  const block = lines.length * size;
  const firstBaseline = (top ?? 50 - block / 2) + size * 0.82;
  return (
    <text
      textAnchor="middle"
      fill={fill}
      fontWeight={800}
      fontSize={size}
      style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={50} y={firstBaseline + i * size}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

interface StickerGroupProps {
  design: StickerDesign;
  /** Soft drop shadow (off for stickers printed flat on a sheet). */
  shadow?: boolean;
  /** Draw a thin cut line around the sticker (for stickers on a sheet). */
  cutLine?: boolean;
}

export function StickerGroup({ design, shadow = true, cutLine = false }: StickerGroupProps) {
  const { shape, bg, fg, accent, motif, label } = design;
  const Motif = motif ? motifs[motif] : null;
  const colors = { fg, bg, accent };

  let content;
  if (Motif && label) {
    content = (
      <>
        <g transform={shape === 'pill' ? 'translate(34 22) scale(0.32)' : 'translate(29 13) scale(0.42)'}>
          <Motif {...colors} />
        </g>
        <Label text={label} shape={shape} fill={fg} top={shape === 'pill' ? 55 : 58} maxSize={shape === 'pill' ? 12 : 13} />
      </>
    );
  } else if (Motif) {
    const t = shape === 'badge' ? 'translate(24 24) scale(0.52)' : 'translate(19 19) scale(0.62)';
    content = (
      <g transform={t}>
        <Motif {...colors} />
      </g>
    );
  } else if (label) {
    content = <Label text={label} shape={shape} fill={fg} maxSize={shape === 'pill' ? 20 : 22} />;
  }

  return (
    <g>
      {shadow && (
        <g transform="translate(1.5 3)" opacity={0.16}>
          <ShapeOutline shape={shape} fill="#000" stroke="#000" strokeWidth={9} strokeLinejoin="round" />
        </g>
      )}
      {cutLine && (
        <g transform="translate(50 50) scale(1.13) translate(-50 -50)">
          <ShapeOutline
            shape={shape}
            fill="none"
            stroke="#121212"
            strokeOpacity={0.22}
            strokeWidth={0.9}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      )}
      {/* White die-cut border, then the coloured sticker on top. */}
      <ShapeOutline shape={shape} fill="#fff" stroke="#fff" strokeWidth={9} strokeLinejoin="round" />
      <ShapeOutline shape={shape} fill={bg} />
      {content}
    </g>
  );
}

/** A standalone sticker as its own <svg>, e.g. for the hero and collection tiles. */
export function StickerSvg({ design, className, title }: { design: StickerDesign; className?: string; title?: string }) {
  return (
    <svg viewBox="-6 -6 112 112" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <StickerGroup design={design} />
    </svg>
  );
}
