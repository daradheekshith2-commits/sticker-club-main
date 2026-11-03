import { useState, useId } from 'react';
import { LuArrowRight, LuMail, LuPenLine, LuRotateCw, LuSparkles } from 'react-icons/lu';
import { Link } from '../../router/router';
import { formatPrice } from '../../utils/format';

const SAMPLE_MESSAGES = [
  "Plot twist: you're doing better than you think.",
  "Reminder: rest is productive too.",
  "Main character energy. Even on a Monday.",
  "You're someone's favorite notification.",
  "Small steps still make big miles.",
];

// Rich sticker examples tailored to each theme shown in the photo
const STICKER_CARDS = [
  {
    id: 'sec-001',
    slug: 'main-character-energy',
    name: 'Main Character Energy',
    price: 29,
    image: '/PNG/Life quotes/be-your-own-inspiration.webp',
    fallbackImg: '/PNG/Life quotes/be-your-own-inspiration.png',
    badge: 'Inspiration',
    tagline: 'Step into your scene',
    accent: '#FFD447',
  },
  {
    id: 'sec-002',
    slug: 'loading',
    name: 'Loading…',
    price: 29,
    image: '/PNG/Swag/limited-edition-black-and-white.webp',
    fallbackImg: '/PNG/Swag/limited-edition-black-and-white.png',
    badge: 'Limited Edition',
    tagline: 'Buffering greatness',
    accent: '#D4FF3A',
  },
  {
    id: 'sec-003',
    slug: 'do-not-disturb',
    name: 'Do Not Disturb',
    price: 29,
    image: '/PNG/Swag/dont-touch-hand-symbol.webp',
    fallbackImg: '/PNG/Swag/dont-touch-hand-symbol.png',
    badge: 'Don’t Touch',
    tagline: 'Headphones on mode',
    accent: '#FF5B2E',
  },
];

export function SecretMessageRevealSection() {
  const [revealed, setRevealed] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [mode, setMode] = useState<'sample' | 'custom'>('sample');
  const [customText, setCustomText] = useState('');
  const sectionId = useId();

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

  const activeMessage = mode === 'custom'
    ? (customText.trim() || 'Type your message above to preview it sealed inside...')
    : SAMPLE_MESSAGES[messageIndex];

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
        <h2 id={`${sectionId}-heading`} className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
          Small stickers. Big mood. One little secret.
        </h2>
        <p className="mt-3 text-base leading-relaxed text-[#F4F0E8]/80 sm:text-lg">
          Funny, relatable stickers that say what you're thinking—and a hidden message card wax-sealed in every envelope. Keep it, personalize it, or surprise a friend.
        </p>
      </div>

      {/* Main Grid: Sticker Examples on Left, Interactive Reveal Card on Right */}
      <div className="relative z-10 mt-10 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-start">
        {/* Left: 3 Sticker Examples */}
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold tracking-widest text-[#A8F0DC] uppercase font-mono">
              Sticker Examples
            </h3>
            <span className="text-[11px] text-[#F4F0E8]/60">Includes sealed card</span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {STICKER_CARDS.map((item) => (
              <Link
                key={item.id}
                to={`/product/${item.slug}`}
                className="group relative flex flex-col items-center rounded-2xl border border-mint/20 bg-[#0B2420]/80 p-4 text-center transition-all duration-300 hover:-translate-y-1 hover:border-mint/60 hover:bg-[#0F2F2A] hover:shadow-xl"
              >
                {/* Artwork display with mini envelope seal badge */}
                <div className="relative aspect-square w-28 overflow-hidden rounded-xl bg-[#03110F] p-2 flex items-center justify-center sm:w-32 border border-white/10 group-hover:border-mint/30 transition-colors">
                  <picture className="contents">
                    <source srcSet={item.image} type="image/webp" />
                    <img
                      src={item.fallbackImg}
                      alt={item.name}
                      className="size-full object-contain transition-transform duration-300 group-hover:scale-108"
                      loading="lazy"
                    />
                  </picture>

                  {/* Envelope badge preview */}
                  <div
                    className="absolute -bottom-1 -right-1 flex items-center gap-1 rounded-md border border-ink/40 px-1.5 py-0.5 text-[9px] font-extrabold uppercase shadow-md"
                    style={{ backgroundColor: '#D9B98C', color: '#121212' }}
                    title="Sealed envelope card included"
                  >
                    <span>✉</span>
                    <span>SEALED</span>
                  </div>
                </div>

                <span className="mt-3 block font-display text-sm font-bold text-white group-hover:text-mint transition-colors">
                  {item.name}
                </span>
                <span className="mt-0.5 block text-xs font-bold text-mint font-mono">
                  {formatPrice(item.price)}
                </span>
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-cinema-red group-hover:text-white transition-colors">
                  View pack →
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Right: Interactive Secret Message Personalizer & Reveal */}
        <div className="flex flex-col items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-mint/25 bg-[#0B2420]/90 p-6 text-center backdrop-blur-md sm:p-7 shadow-2xl">
            <div className="flex items-center justify-between border-b border-mint/15 pb-3">
              <span className="text-xs font-bold text-mint uppercase tracking-wider flex items-center gap-1.5">
                <LuMail className="size-3.5" /> Sealed Envelope Preview
              </span>
              <div className="flex rounded-lg bg-black/40 p-0.5 text-[11px] font-semibold border border-white/10">
                <button
                  type="button"
                  onClick={() => setMode('sample')}
                  className={`rounded-md px-2.5 py-1 transition ${mode === 'sample' ? 'bg-mint text-ink font-bold' : 'text-white/70 hover:text-white'}`}
                >
                  Curated
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('custom');
                    setRevealed(true);
                  }}
                  className={`rounded-md px-2.5 py-1 transition ${mode === 'custom' ? 'bg-mint text-ink font-bold' : 'text-white/70 hover:text-white'}`}
                >
                  Write Your Own
                </button>
              </div>
            </div>

            {/* Custom message typing input */}
            {mode === 'custom' && (
              <div className="mt-4 text-left">
                <label htmlFor="custom-secret-input" className="block text-xs font-bold text-white mb-1.5 flex items-center justify-between">
                  <span>Enter your custom secret message:</span>
                  <span className="text-[10px] font-mono text-mint">{customText.length}/100</span>
                </label>
                <div className="relative">
                  <input
                    id="custom-secret-input"
                    type="text"
                    maxLength={100}
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="e.g. You are capable of amazing things! Happy Birthday 🎉"
                    className="w-full rounded-xl border border-mint/30 bg-[#071B18] px-3.5 py-2.5 text-xs text-white placeholder:text-white/40 focus:border-mint focus:outline-none focus:ring-2 focus:ring-mint/20"
                  />
                  <LuPenLine className="absolute right-3 top-3 size-3.5 text-mint/60 pointer-events-none" />
                </div>
                <p className="mt-1 text-[11px] text-[#A8F0DC]/70">
                  This exact note will be printed and wax-sealed inside the envelope card with your sticker!
                </p>
              </div>
            )}

            {/* Envelope / Message Card with 3D Flip & Sparkle Animation */}
            <div className="my-5 flex min-h-[160px] items-center justify-center">
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
                  aria-label="Click to reveal sealed message"
                >
                  <div className="grid size-12 place-items-center rounded-full bg-mint/10 text-mint transition-transform duration-300 group-hover:scale-110">
                    <LuMail className="size-6" />
                  </div>
                  <span className="mt-3 text-xs font-bold tracking-wider text-white/80 uppercase">
                    Sealed Message Card
                  </span>
                  <span className="mt-1 text-[11px] text-mint font-semibold">
                    Tap to unseal &amp; read
                  </span>
                </div>
              ) : (
                // Revealed Card state
                <div
                  className={`relative flex min-h-[160px] w-full max-w-[290px] flex-col justify-between rounded-xl border border-mint/40 bg-gradient-to-br from-[#F5F0E6] to-[#E9D3AE] p-5 text-left text-[#121212] shadow-2xl transition-all duration-300 ${
                    animating ? 'scale-95 opacity-50' : 'scale-100 opacity-100'
                  }`}
                >
                  {/* Card top badge */}
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold tracking-widest text-[#121212]/70 uppercase">
                    <span className="flex items-center gap-1 text-cinema-red">
                      <LuSparkles className="size-3.5 animate-pulse" />
                      {mode === 'custom' ? 'CUSTOM SECRET NOTE' : 'SURPRISE NOTE'}
                    </span>
                    <span className="rounded bg-[#121212]/10 px-1.5 py-0.5">
                      {mode === 'custom' ? 'PERSONAL' : `#${messageIndex + 1}/${SAMPLE_MESSAGES.length}`}
                    </span>
                  </div>

                  <p className="my-3 font-display text-base font-extrabold leading-snug sm:text-lg text-[#121212]">
                    “{activeMessage}”
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-mono tracking-wider text-[#121212]/60 uppercase border-t border-[#121212]/10 pt-2">
                    <span>Pixwora · Sealed Insert</span>
                    <span className="text-[#121212] font-bold">Wax Seal ✉</span>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            {!revealed ? (
              <button
                type="button"
                onClick={handleReveal}
                className="btn-primary w-full py-3 text-sm font-bold tracking-wide shadow-md hover:shadow-mint/20"
              >
                Reveal a sample message
              </button>
            ) : mode === 'sample' ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleNextMessage}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-mint/30 bg-[#071B18] px-4 py-2.5 text-xs font-bold text-mint transition-colors hover:bg-mint hover:text-[#03110F]"
                >
                  <LuRotateCw className={`size-3.5 ${animating ? 'animate-spin' : ''}`} />
                  Try another message
                </button>
                <button
                  type="button"
                  onClick={() => setRevealed(false)}
                  className="rounded-full border border-white/20 bg-transparent px-3 py-2.5 text-xs font-bold text-white hover:bg-white/10"
                >
                  Seal
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRevealed(false)}
                  className="btn-primary flex-1 py-2.5 text-xs font-bold shadow-md"
                >
                  Seal into envelope ✉
                </button>
              </div>
            )}

            <p className="mt-3 text-[11px] text-[#A8F0DC]/70">
              {mode === 'custom'
                ? 'Your custom message will be printed and sealed in kraft envelope.'
                : 'Curated surprise—your pack arrives with a secret message inside.'}
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
          Explore all secret message stickers <LuArrowRight className="size-5" />
        </Link>
        <p className="mt-3 font-mono text-xs tracking-wider text-[#F4F0E8]/70 sm:text-sm">
          Pick your stickers → Personalize or surprise → Peel &amp; enjoy.
        </p>
      </div>
    </section>
  );
}
