import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeQr, isLocalAddress } from './qr';

/** The 7×7 finder pattern: dark border, light ring, dark 3×3 centre. */
function hasFinder(m: boolean[][], x0: number, y0: number): boolean {
  for (let y = 0; y < 7; y++)
    for (let x = 0; x < 7; x++) {
      const ring = Math.max(Math.abs(x - 3), Math.abs(y - 3));
      if (m[y0 + y][x0 + x] !== (ring !== 2)) return false;
    }
  return true;
}

test('QR codes have the right size and the three finder patterns', () => {
  for (const [text, size] of [
    ['HELLO', 21],
    ['https://stickerclub.in/vote-next-drop', 29],
    ['x'.repeat(150), 49],
  ] as const) {
    const m = encodeQr(text);
    assert.equal(m.length, size, text);
    assert.ok(m.every((row) => row.length === size));
    assert.ok(hasFinder(m, 0, 0) && hasFinder(m, size - 7, 0) && hasFinder(m, 0, size - 7), `finders for ${text}`);
    assert.equal(m[size - 8][8], true, 'the always-dark module');
  }
  assert.throws(() => encodeQr('x'.repeat(400)), /too long/);
});

test('local addresses are recognised so the page can warn about them', () => {
  assert.ok(isLocalAddress('http://localhost:5173/vote-next-drop'));
  assert.ok(isLocalAddress('http://127.0.0.1:4173/x'));
  assert.ok(isLocalAddress('http://192.168.1.4:5173/x'));
  assert.ok(!isLocalAddress('https://stickerclub.in/vote-next-drop'));
  assert.ok(!isLocalAddress('https://sticker-club.vercel.app/vote-next-drop'));
});
