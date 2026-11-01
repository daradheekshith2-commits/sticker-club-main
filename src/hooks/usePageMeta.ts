import { useEffect } from 'react';
import { brand } from '../config/brand';

/** Sets the browser tab title and meta description for the current page. */
export function usePageMeta(title: string | null, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} — ${brand.displayName}` : `${brand.displayName} — Stickers & posters`;
    const desc = description ?? brand.description;
    let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.name = 'description';
      document.head.appendChild(tag);
    }
    tag.content = desc;
  }, [title, description]);
}
