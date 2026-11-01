import { useId, useState, type ComponentType, type ReactNode } from 'react';
import { LuLink, LuUpload } from 'react-icons/lu';
import type { PickedImage } from '../../types/image';
import { ImageUploader } from './ImageUploader';
import { ImageUrlInput } from './ImageUrlInput';

export interface ExtraSourceTab {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  content: ReactNode;
}

/**
 * Tabs for choosing where an image comes from: Upload or Image link,
 * plus any extra tabs the page adds (the wall builder adds "Our designs").
 * Both configurators use this, so they behave the same way.
 */
export function ImageSourcePicker({ onPick, extraTabs = [], label = 'Image source' }: { onPick: (img: PickedImage) => void; extraTabs?: ExtraSourceTab[]; label?: string }) {
  const base = useId();
  const tabs: ExtraSourceTab[] = [
    ...extraTabs,
    { id: 'upload', label: 'Upload', icon: LuUpload, content: <ImageUploader onPick={onPick} /> },
    { id: 'url', label: 'Image link', icon: LuLink, content: <ImageUrlInput onPick={onPick} /> },
  ];
  const [active, setActive] = useState(tabs[0].id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <div>
      <div role="tablist" aria-label={label} className={`grid gap-1 rounded-full bg-paper p-1 ${tabs.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${base}-tab-${t.id}`}
            aria-selected={active === t.id}
            aria-controls={`${base}-panel`}
            onClick={() => setActive(t.id)}
            className={`flex items-center justify-center gap-1.5 rounded-full px-2 py-2 text-xs font-bold sm:text-sm ${active === t.id ? 'bg-ink text-paper' : 'hover:bg-paper-deep'}`}
          >
            <t.icon aria-hidden className="size-4 shrink-0" />
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-tab-${current.id}`} className="mt-3">
        {current.content}
      </div>
    </div>
  );
}
