/**
 * HOMEPAGE HERO — dark cinematic split: copy and CTAs on the left, the
 * animated sticker mosaic on the right (below the copy on phones).
 * Colours come from the --color-cinema-* tokens in src/index.css.
 */
import { LuArrowRight } from 'react-icons/lu';
import { Link } from '../../router/router';
import { shopUrl } from '../../utils/catalogue';
import { AnimatedStickerMosaic } from './AnimatedStickerMosaic';

export function AnimatedStickerHero() {
  return (
    <section aria-labelledby="hero-title" className="cinema-hero relative isolate overflow-hidden bg-cinema-bg text-cinema-ivory">
      {/* Lighting: a red glow low on the left, a cool mint haze top-right, a faint grain. */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(60%_55%_at_8%_100%,rgba(255,16,38,0.30),transparent_70%),radial-gradient(45%_40%_at_90%_0%,rgba(168,240,220,0.10),transparent_70%)]" />
      <div aria-hidden className="cinema-grain absolute inset-0 -z-10 opacity-[0.06]" />

      <div className="cinema-hero-grid mx-auto grid max-w-7xl items-center gap-10 px-4 pt-10 pb-12 sm:px-6 lg:min-h-[min(calc(100svh-4rem),820px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] lg:gap-8 lg:py-10">
        <div className="relative max-w-xl">
          <h1 id="hero-title" className="cinema-hero-title mt-3 font-hero text-[4.4rem] leading-[0.86] tracking-[0.005em] uppercase sm:text-[6.5rem] lg:text-[7.4rem]">
            <span className="block">Stick your</span>
            <span className="relative inline-block text-cinema-red [text-shadow:0_0_28px_rgba(255,16,38,0.45)]">
              Vibe.
              {/* Overlapping tactile die-cut badge */}
              <span className="absolute -top-4 -right-16 hidden sm:inline-block rotate-12 rounded-lg bg-mint px-2.5 py-1 text-[11px] font-mono font-black text-paper shadow-2xl border-2 border-paper hover:rotate-6 transition-transform cursor-pointer select-none">
                ★ DIE-CUT
              </span>
              {/* hand-drawn swoosh + sparkle */}
              <svg viewBox="0 0 120 40" className="absolute -top-[6%] left-[104%] w-[0.95em]" aria-hidden>
                <path d="M4 30 C40 8 80 4 116 6 M60 30 C80 22 100 18 116 18" stroke="#FF1026" strokeWidth={4} fill="none" strokeLinecap="round" />
              </svg>
              <svg viewBox="0 0 20 20" className="absolute right-[-26%] bottom-[2%] w-[0.22em]" aria-hidden>
                <path d="M10 0 C11 8 12 9 20 10 C12 11 11 12 10 20 C9 12 8 11 0 10 C8 9 9 8 10 0 Z" fill="#FF1026" />
              </svg>
            </span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-cinema-ivory/90">
            Tiny stickers. Big personality.
            <br />
            Discover original designs, build your own pack, and make your everyday things feel like yours.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to={shopUrl({ category: 'stickers' })}
              className="inline-flex items-center gap-3 rounded-full bg-lime px-7 py-4 text-base font-extrabold tracking-wide text-cinema-ivory uppercase shadow-[0_10px_30px_-8px_rgba(255,16,38,0.7)] transition-transform hover:-translate-y-0.5 focus-visible:outline-cinema-ivory"
            >
              Shop stickers <LuArrowRight aria-hidden className="size-5" />
            </Link>
            <Link
              to={shopUrl({ category: 'posters' })}
              className="inline-flex items-center gap-3 rounded-full border-2 border-cinema-mint/70 px-7 py-4 text-base font-extrabold tracking-wide text-cinema-mint uppercase transition-colors hover:bg-cinema-mint/10 focus-visible:outline-cinema-mint"
            >
              Shop posters <LuArrowRight aria-hidden className="size-5" />
            </Link>
          </div>
          <p className="mt-10 flex items-center gap-3 text-xs font-bold tracking-[0.26em] text-cinema-mint uppercase">
            <span aria-hidden className="h-0.5 w-8 rounded bg-cinema-red" />
            Original designs · made for your everyday
          </p>
        </div>

        <AnimatedStickerMosaic className="cinema-hero-mosaic h-[360px] sm:h-[480px] lg:h-[min(76svh,720px)]" />
      </div>
    </section>
  );
}
