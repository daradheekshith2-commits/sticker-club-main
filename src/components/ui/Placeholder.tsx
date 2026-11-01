import type { ReactNode } from 'react';
import { LuInfo } from 'react-icons/lu';

/**
 * Marks something the founders still have to fill in (contact details,
 * policies...). Deliberately visible so it can't be mistaken for final copy.
 */
export function Placeholder({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-tomato/70 bg-tomato/10 px-2 py-0.5 text-sm font-medium text-danger">
      <LuInfo aria-hidden className="size-3.5 shrink-0" />
      {children}
    </span>
  );
}

/** A highlighted notice box, used for "prototype" messages. */
export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'demo' }) {
  const styles = tone === 'demo' ? 'border-mint/60 bg-mint/10' : 'border-ink/15 bg-white';
  return (
    <div role="note" className={`flex gap-3 rounded-2xl border-2 ${styles} p-4 text-sm leading-relaxed`}>
      <LuInfo aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
