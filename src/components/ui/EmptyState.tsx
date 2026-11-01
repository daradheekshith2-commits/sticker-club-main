import type { ReactNode } from 'react';
import { StickerSvg } from '../art/Sticker';

/** Friendly message for "nothing here" moments: empty cart, no search results, 404. */
export function EmptyState({ title, body, action }: { title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] border-2 border-dashed border-ink/20 px-6 py-12 text-center">
      <StickerSvg
        className="mb-4 size-20 -rotate-6"
        design={{ name: 'empty', motif: 'question', shape: 'badge', bg: '#D4FF3A', fg: '#121212', accent: '#FF5B2E' }}
      />
      <h2 className="text-2xl font-extrabold">{title}</h2>
      {body && <div className="mt-2 max-w-md text-ink-soft">{body}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
