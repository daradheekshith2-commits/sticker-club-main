import { useState, useId } from 'react';
import { LuArrowRight, LuMail, LuRotateCw, LuSparkles } from 'react-icons/lu';
import { Link } from '../../router/router';
import { useCatalogue } from '../../context/CatalogueContext';
import { ProductImage } from '../art/ProductArt';
import { formatPrice } from '../../utils/format';
import type { Product } from '../../types/product';

const SAMPLE_MESSAGES = [
  "Plot twist: you're doing better than you think.",
  "Reminder: rest is productive too.",
  "Main character energy. Even on a Monday.",
  "You're someone's favorite notification.",
];

export function SecretMessageRevealSection() {
  const { products, getProductBySlug } = useCatalogue();
  const [revealed, setRevealed] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const sectionId = useId();

  // The 3 example stickers requested
  const exampleSlugs = ['main-character-energy', 'loading', 'do-not-disturb'];
  const examples: Product[] = exampleSlugs
    .map((slug) => getProductBySlug(slug) || products.find((p) => p.slug === slug || p.id === slug))
    .filter((p): p is Product => Boolean(p));

  function handleReveal() {
    setRevealed(true);
  }

  function handleNextMessage() {
    setAnimating(true);
    setTimeout(() => {
      setMessageIndex((prev) => (prev + 1) % SAMPLE_MESSAGES.length);
      setAnimating(false);
    }, 200);
  }

  return (
    <section
      aria-labelledby={`${sectionId}-heading`}
      className="relative my-12 overflow-hidden rounded-[2rem] border border-mint/20 bg-gradient-to-b from-[#071B18] to-[#03110F] p-6 shadow-2xl sm:p-10 md:p-12"
    >
      {/* Background ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-mint/5 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-cinema-red/10 blur-3xl"
      />

      {/* Header */}
      <div className="relative z-10 max-w-3xl">
        <p className="eyebrow mb-2 flex items-center gap-2 text-mint">
          <LuMail className="size-4" aria-hidden />
          Secret Message Stickers
        </p>
        <h2 id={`${sectionId}-heading`} className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl md:text-5xl">
          Small stickers. Big mood. One little secret.
        </h2>
        <p className="mt-3 text-base leading-relaxed text-ink-soft sm:text-lg">
          Funny, relatable stickers that say what you're thinking—and a hidden message card in every pack. Keep it, gift it, or share the surprise.
        </p>
      </div>

      {/* Main Grid: Sticker Examples on Left, Interactive Reveal Card on Right */}
      <div className="relative z-10 mt-10 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        {/* Left: 3 Sticker Examples */}
        <div>
          <h3 className="text-xs font-bold tracking-widest text-ink-soft uppercase">
            Sticker Examples
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {examples.map((item) => (
              <Link
                key={item.id}
                to={`/product/${item.slug}`}
                className="group relative flex flex-col items-center rounded-2xl border border-mint/15 bg-paper/60 p-4 text-center transition-all duration-300 hover:-translate-y-1 hover:border-mint/40 hover:bg-paper hover:shadow-lg"
              >
                <div className="aspect-square w-24 overflow-hidden rounded-xl bg-paper-deep sm:w-28">
                  <ProductImage product={item} className="size-full object-cover object-center transition-transform duration-300 group-hover:scale-105" />
                </div>
                <span className="mt-3 block font-display text-sm font-bold text-ink">
                  {item.name}
                </span>
                <span className="mt-0.5 block text-xs text-mint">
                  {formatPrice(item.price)}
                </span>
                <span className="mt-2 text-[11px] font-semibold text-ink-soft opacity-80 group-hover:text-cinema-red">
                  View pack →
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Right: Interactive Secret Message Reveal */}
        <div className="flex flex-col items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-mint/25 bg-[#0B2420]/80 p-6 text-center backdrop-blur-sm sm:p-8">
            <span className="inline-block text-sm font-bold text-mint">
              A little secret inside every pack 🤫
            </span>

            {/* Envelope / Message Card with 3D Flip & Sparkle Animation */}
            <div className="my-6 flex min-h-[160px] items-center justify-center">
              {!revealed ? (
                // Sealed Envelope state
                <div
                  className="group relative flex aspect-[1.6/1] w-full max-w-[280px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-mint/40 bg-[#071B18] p-6 shadow-xl transition-all duration-300 hover:border-mint hover:shadow-[0_0_25px_rgba(168,240,220,0.15)]"
                  onClick={handleReveal}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleReveal();
                    }
                  }}
                  aria-label="Click to reveal sample secret message"
                >
                  <div className="grid size-12 place-items-center rounded-full bg-mint/10 text-mint transition-transform duration-300 group-hover:scale-110">
                    <LuMail className="size-6" />
                  </div>
                  <span className="mt-3 text-xs font-bold tracking-wider text-ink-soft uppercase">
                    Sealed Message Card
                  </span>
                  <span className="mt-1 text-[11px] text-mint">
                    Tap to open preview
                  </span>
                </div>
              ) : (
                // Revealed Card state
                <div
                  className={`relative flex min-h-[160px] w-full max-w-[290px] flex-col justify-between rounded-xl border border-mint/40 bg-gradient-to-br from-[#F5F0E6] to-[#E9E3D6] p-5 text-left text-[#121212] shadow-2xl transition-all duration-300 ${
                    animating ? 'scale-95 opacity-50' : 'scale-100 opacity-100'
                  }`}
                >
                  {/* Sparkle badge */}
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold tracking-widest text-[#121212]/70 uppercase">
                    <span className="flex items-center gap-1 text-cinema-red">
                      <LuSparkles className="size-3.5 animate-pulse" /> SECRET NOTE
                    </span>
                    <span className="rounded bg-[#121212]/10 px-1.5 py-0.5">#{messageIndex + 1}/4</span>
                  </div>

                  <p className="my-3 font-display text-base font-extrabold leading-snug sm:text-lg">
                    “{SAMPLE_MESSAGES[messageIndex]}”
                  </p>

                  <p className="text-[10px] font-mono tracking-wider text-[#121212]/60 uppercase">
                    Sticker Club · Surprise Insert
                  </p>
                </div>
              )}
            </div>

            {/* Interaction Buttons */}
            {!revealed ? (
              <button
                type="button"
                onClick={handleReveal}
                className="btn-primary w-full py-3 text-sm font-bold tracking-wide shadow-md hover:shadow-mint/20"
              >
                Reveal a sample message
              </button>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleNextMessage}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-mint/30 bg-[#071B18] px-4 py-2.5 text-xs font-bold text-mint transition-colors hover:bg-mint hover:text-[#03110F]"
                >
                  <LuRotateCw className={`size-3.5 ${animating ? 'animate-spin' : ''}`} />
                  Try another message
                </button>
              </div>
            )}

            {/* Sample Disclaimer Label */}
            <p className="mt-3 text-[11px] text-ink-soft">
              Sample reveal—your pack's message is a surprise.
            </p>
          </div>
        </div>
      </div>

      {/* Shopping CTA Footer */}
      <div className="relative z-10 mt-12 flex flex-col items-center border-t border-mint/15 pt-8 text-center">
        <Link
          to="/shop?category=stickers&type=secret"
          className="inline-flex items-center gap-2 rounded-full bg-cinema-red px-8 py-3.5 font-display text-base font-extrabold text-white shadow-lg transition-all hover:bg-cinema-red/90 hover:shadow-[0_0_25px_rgba(255,16,38,0.4)]"
        >
          Find your sticker mood <LuArrowRight className="size-5" />
        </Link>
        <p className="mt-3 font-mono text-xs tracking-wider text-ink-soft sm:text-sm">
          Pick your stickers → Open your pack → Discover your secret message.
        </p>
      </div>
    </section>
  );
}
