import { useMemo } from 'react';
import { encodeQr } from '../../utils/qr';

/** Draws a QR code as crisp SVG squares with the standard 4-module quiet zone. */
export function QrCode({ value, className = '', label }: { value: string; className?: string; label: string }) {
  const modules = useMemo(() => encodeQr(value), [value]);
  const n = modules.length;
  const path = modules.flatMap((row, y) => row.map((dark, x) => (dark ? `M${x + 4} ${y + 4}h1v1h-1z` : ''))).join('');
  return (
    <svg viewBox={`0 0 ${n + 8} ${n + 8}`} className={className} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width={n + 8} height={n + 8} fill="#fff" />
      <path d={path} fill="#121212" />
    </svg>
  );
}
