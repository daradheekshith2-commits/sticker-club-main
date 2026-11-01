import type { ReactNode } from 'react';

export function SectionHeading({ eyebrow, title, action, id }: { eyebrow?: string; title: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 id={id} className="text-3xl leading-[1.05] font-extrabold md:text-5xl">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}
