import { useEffect, useRef, useState } from 'react';

/**
 * Plays an entrance animation ONCE, when an element first scrolls into view.
 *
 * Returns a ref for the element and its state:
 * - 'pending' → not yet seen (CSS keeps the items invisible, see .reveal-item in index.css)
 * - 'shown'   → animate in; never goes back, so scrolling doesn't retrigger it.
 *
 * Starts as 'shown' (no animation) when the visitor prefers reduced motion or
 * the browser has no IntersectionObserver, so content is never hidden.
 */
export function useReveal<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [state, setState] = useState<'pending' | 'shown'>(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return 'shown';
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'shown' : 'pending';
  });

  useEffect(() => {
    if (state === 'shown' || !ref.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState('shown');
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [state]);

  return [ref, state] as const;
}
