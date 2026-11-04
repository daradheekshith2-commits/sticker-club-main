import { LuMessageCircle } from 'react-icons/lu';
import { whatsappLink } from '../../config/brand';

export function FloatingWhatsApp() {
  const wa = whatsappLink('Hey! I am interested to buy stickers');
  if (!wa) return null;

  return (
    <aside aria-label="Support chat" className="fixed bottom-6 right-6 z-40 print:hidden">
      <a
        href={wa}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp: Hey! I am interested to buy stickers"
        className="group flex items-center gap-2.5 rounded-full border-2 border-ink bg-[#25D366] px-4 py-3 text-white shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_6px_22px_rgba(37,211,102,0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <LuMessageCircle aria-hidden className="size-6 shrink-0 transition-transform duration-200 group-hover:scale-110" />
        <span className="hidden font-display text-sm font-extrabold sm:inline">
          Chat on WhatsApp
        </span>
      </a>
    </aside>
  );
}
