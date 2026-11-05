/**
 * ABOUT, FAQ, CONTACT, POLICIES and 404.
 * All copy here is a first draft. Policy pages are placeholders on purpose:
 * replace them with real, founder-approved terms before taking real orders.
 */
import type { ReactNode } from 'react';
import { LuArrowRight, LuCheck, LuInstagram, LuMail, LuMessageCircle, LuPhone, LuSparkles } from 'react-icons/lu';
import { brand, hasAnyContact, whatsappLink } from '../config/brand';
import { usePageMeta } from '../hooks/usePageMeta';
import { Link, useParams } from '../router/router';
import { shopUrl } from '../utils/catalogue';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { EmptyState } from '../components/ui/EmptyState';
import { Notice, Placeholder } from '../components/ui/Placeholder';
import { d } from '../data/products';
import { StickerSvg } from '../components/art/Sticker';

function Page({ title, crumb, intro, children }: { title: string; crumb: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: crumb }]} />
      <h1 className="mt-4 text-5xl leading-[0.95] font-extrabold md:text-7xl">{title}</h1>
      {intro && <p className="mt-5 text-xl text-ink-soft">{intro}</p>}
      <div className="mt-10 space-y-6 text-lg leading-relaxed [&_h2]:mt-10 [&_h2]:text-3xl [&_h2]:font-extrabold">{children}</div>
    </div>
  );
}

// Interactive sticker marquee items for the endless ribbon
const marqueeStickers = [
  { design: d.chaiFirst, badge: 'CHAI LOVER' },
  { design: d.worksOnMyMachine, badge: 'DEV VIBES' },
  { design: d.jugaad, badge: 'HYD ORIGINAL' },
  { design: d.pixelHeart, badge: '1-UP' },
  { design: d.seventyFive, badge: '75% ATTENDANCE' },
  { design: d.redline, badge: 'RACE DAY' },
  { design: d.sleepyCloud, badge: 'SOFT MOOD' },
  { design: d.controller, badge: 'GAME ON' },
  { design: d.samosa, badge: 'CAMPUS LIFE' },
  { design: d.doItScared, badge: 'BOLD' },
  { design: d.cassette, badge: 'LO-FI' },
  { design: d.cat, badge: 'PET' },
  { design: d.oneMoreEp, badge: 'BINGE' },
  { design: d.backbencher, badge: 'BACKBENCH' },
];

export function AboutPage() {
  usePageMeta('About', 'Boring was never our thing. Meet Sticker Club.');

  const collections = [
    {
      title: 'Stickers',
      copy: 'Little designs with a lot to say.',
      to: shopUrl({ category: 'stickers' }),
      color: '#FFE16B',
      sticker: d.chaiFirst,
      tag: 'ORIGINAL MINIS',
    },
    {
      title: 'Posters',
      copy: 'Give the walls a personality of their own.',
      to: shopUrl({ category: 'posters' }),
      color: '#A6DFF4',
      sticker: d.redline,
      tag: 'A5 · A4 · A3',
    },
    {
      title: 'Cars & Bikes',
      copy: 'For track-day dreamers and everyday riders.',
      to: shopUrl({ collections: ['quotes'] }),
      color: '#FF5B2E',
      sticker: d.helmet,
      tag: 'TRACK READY',
    },
    {
      title: 'Shop Your Own',
      copy: 'Your design, your shape, your rules.',
      to: '/create-your-stickers',
      color: '#A8E8C4',
      sticker: d.jugaad,
      tag: 'CUSTOM CUT',
    },
  ];

  return (
    <div className="overflow-x-hidden">
      {/* HERO SECTION WITH STICKER-SLAPPED CANVAS */}
      <section className="relative overflow-hidden bg-paper-deep px-4 py-16 text-ink sm:px-6 md:py-24 border-b border-mint/15">
        {/* Ambient lighting & radial glows */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,16,38,0.18),transparent_55%),radial-gradient(circle_at_85%_75%,rgba(168,240,220,0.12),transparent_50%)]" />

        <div className="relative mx-auto max-w-7xl">
          <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'About' }]} />

          <div className="mt-8 grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-3.5 py-1 text-xs font-extrabold uppercase tracking-[0.2em] text-mint">
                <LuSparkles aria-hidden className="size-3.5" /> A little rebellion against boring things
              </div>

              <h1 className="mt-5 max-w-3xl font-display text-[clamp(3.2rem,8vw,7.2rem)] font-extrabold leading-[0.88] tracking-tight text-ink uppercase">
                BORING WAS <span className="text-cinema-red [text-shadow:0_0_28px_rgba(255,16,38,0.45)]">NEVER</span> OUR THING.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft sm:text-xl">
                Your laptop, your bottles, your phone, your walls. Make every little corner feel a little more like you with thick, waterproof die-cut stickers.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link to="/shop" className="btn-primary text-base px-8 py-3.5 shadow-[0_10px_28px_-10px_rgba(255,16,38,0.75)]">
                  Explore the club →
                </Link>
                <Link to="/create-your-stickers" className="btn-ghost text-base px-7 py-3.5">
                  Print your own stickers
                </Link>
              </div>

              {/* Quality pill badges */}
              <div className="mt-10 flex flex-wrap gap-2.5 text-xs font-extrabold uppercase tracking-wider text-ink-soft">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-mint/20 bg-paper/80 px-3 py-1 text-mint">
                  <LuCheck aria-hidden className="size-3.5" /> 100% Waterproof Vinyl
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-mint/20 bg-paper/80 px-3 py-1 text-mint">
                  <LuCheck aria-hidden className="size-3.5" /> Matte Laminated
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-mint/20 bg-paper/80 px-3 py-1 text-mint">
                  <LuCheck aria-hidden className="size-3.5" /> Precision Die-Cut
                </span>
              </div>
            </div>

            {/* STICKER-SLAPPED LAPTOP / NOTEBOOK CANVASES */}
            <div className="relative mx-auto w-full max-w-lg">
              {/* Backing glow */}
              <div className="absolute -inset-4 rounded-[36px] bg-gradient-to-tr from-cinema-red/20 via-mint/15 to-transparent blur-xl opacity-70" />

              <div className="relative aspect-[4/3] w-full rounded-[28px] border-2 border-mint/25 bg-[#061815] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.75)] overflow-hidden flex items-center justify-center">
                {/* Subtle device center dot glow */}
                <div className="absolute size-24 rounded-full bg-mint/10 blur-xl pointer-events-none" />

                {/* Grid guidelines */}
                <div className="absolute inset-0 bg-[radial-gradient(#a8f0dc_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.06] pointer-events-none" />

                {/* Overlapping slapped stickers with lively tactile angles and drop-shadows */}
                {/* 1. Works on my machine */}
                <div
                  className="group absolute top-[8%] left-[8%] z-10 transition-transform duration-300 hover:scale-120 hover:rotate-0 hover:z-30 cursor-pointer"
                  style={{ transform: 'rotate(-9deg)' }}
                  title="Works On My Machine"
                >
                  <StickerSvg design={d.worksOnMyMachine} className="size-24 sm:size-28 drop-shadow-[0_12px_22px_rgba(0,0,0,0.65)]" />
                </div>

                {/* 2. Chai First */}
                <div
                  className="group absolute top-[10%] right-[10%] z-10 transition-transform duration-300 hover:scale-120 hover:rotate-0 hover:z-30 cursor-pointer"
                  style={{ transform: 'rotate(11deg)' }}
                  title="Chai First"
                >
                  <StickerSvg design={d.chaiFirst} className="size-24 sm:size-28 drop-shadow-[0_12px_22px_rgba(0,0,0,0.65)]" />
                </div>

                {/* 3. Jugaad Certified */}
                <div
                  className="group absolute top-[36%] left-[30%] z-20 transition-transform duration-300 hover:scale-125 hover:rotate-0 hover:z-30 cursor-pointer"
                  style={{ transform: 'rotate(-4deg)' }}
                  title="Jugaad Certified"
                >
                  <StickerSvg design={d.jugaad} className="size-26 sm:size-32 drop-shadow-[0_14px_28px_rgba(0,0,0,0.75)]" />
                </div>

                {/* 4. Pixel Heart */}
                <div
                  className="group absolute bottom-[12%] left-[10%] z-10 transition-transform duration-300 hover:scale-120 hover:rotate-0 hover:z-30 cursor-pointer"
                  style={{ transform: 'rotate(-13deg)' }}
                  title="Pixel Heart"
                >
                  <StickerSvg design={d.pixelHeart} className="size-20 sm:size-24 drop-shadow-[0_12px_22px_rgba(0,0,0,0.65)]" />
                </div>

                {/* 5. 75% Club */}
                <div
                  className="group absolute bottom-[10%] right-[12%] z-10 transition-transform duration-300 hover:scale-120 hover:rotate-0 hover:z-30 cursor-pointer"
                  style={{ transform: 'rotate(8deg)' }}
                  title="75% Club"
                >
                  <StickerSvg design={d.seventyFive} className="size-20 sm:size-24 drop-shadow-[0_12px_22px_rgba(0,0,0,0.65)]" />
                </div>

                {/* 6. Real transparent WebP cutout - Coca Cola Cap */}
                <div
                  className="group absolute top-[44%] left-[6%] z-10 transition-transform duration-300 hover:scale-125 hover:rotate-0 hover:z-30 cursor-pointer"
                  style={{ transform: 'rotate(18deg)' }}
                  title="Coke Cap"
                >
                  <img
                    src="/PNG/Aesthetics/coca-cola-red-bottle-cap.webp"
                    alt="Cap sticker"
                    className="size-16 sm:size-20 object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.6)]"
                  />
                </div>

                {/* 7. Real transparent WebP cutout - Uno Reverse Card */}
                <div
                  className="group absolute top-[42%] right-[6%] z-10 transition-transform duration-300 hover:scale-125 hover:rotate-0 hover:z-30 cursor-pointer"
                  style={{ transform: 'rotate(-14deg)' }}
                  title="Uno Reverse"
                >
                  <img
                    src="/PNG/Aesthetics/green-uno-reverse-card.webp"
                    alt="Uno Reverse sticker"
                    className="size-16 sm:size-20 object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.6)]"
                  />
                </div>

                {/* 8. Playstation Pixel Logo */}
                <div
                  className="group absolute bottom-[3%] left-[40%] z-15 transition-transform duration-300 hover:scale-125 hover:rotate-0 hover:z-30 cursor-pointer"
                  style={{ transform: 'rotate(4deg)' }}
                  title="Playstation Pixel"
                >
                  <img
                    src="/PNG/Aesthetics/playstation-pixel-logo.webp"
                    alt="Playstation sticker"
                    className="size-14 sm:size-16 object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.6)]"
                  />
                </div>

                {/* Badge overlay tag */}
                <span className="absolute top-3 left-4 rounded-md bg-lime px-2 py-0.5 font-mono text-[10px] font-black uppercase text-paper shadow-md">
                  ★ STICKER BOMBED
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTINUOUS STICKER MARQUEE / TICKER RIBBON */}
      <div className="relative border-y-2 border-mint/20 bg-[#071F1B] py-4 overflow-hidden select-none" aria-hidden="true">
        <div className="animate-marquee flex items-center gap-6">
          {[...marqueeStickers, ...marqueeStickers].map((s, idx) => (
            <div
              key={idx}
              className="flex shrink-0 items-center gap-3 rounded-2xl border border-mint/20 bg-[#0A2621] px-4 py-2 shadow-sm transition-transform hover:scale-105"
            >
              <StickerSvg design={s.design} className="size-10 shrink-0 drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]" />
              <span className="font-display text-xs font-extrabold tracking-wider text-ink uppercase">
                {s.badge}
              </span>
              <span className="text-mint font-bold text-xs">★</span>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 01 / WHAT WE BELIEVE */}
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 md:grid-cols-2 md:gap-16 md:py-28">
        {/* Left Side: Creative Sticker Board Showcase */}
        <div className="relative">
          <div className="relative rounded-3xl border-2 border-ink/20 bg-paper-deep p-6 sm:p-8 shadow-xl overflow-hidden">
            <div className="mb-4 flex items-center justify-between border-b border-mint/15 pb-4">
              <span className="font-mono text-xs font-bold uppercase text-mint tracking-widest">
                BOARD #01 · NOTEBOOK COVER
              </span>
              <span className="rounded-full bg-cinema-red px-2 py-0.5 font-mono text-[10px] font-bold text-white uppercase">
                STICKER MANIFESTO
              </span>
            </div>

            <div className="relative my-4 grid grid-cols-3 gap-3 place-items-center py-4">
              <div className="transition-transform hover:scale-110 hover:rotate-3 cursor-pointer" style={{ transform: 'rotate(-8deg)' }}>
                <StickerSvg design={d.doItScared} className="size-20 sm:size-24 drop-shadow-[0_8px_14px_rgba(0,0,0,0.4)]" />
              </div>
              <div className="transition-transform hover:scale-110 hover:rotate-3 cursor-pointer" style={{ transform: 'rotate(6deg)' }}>
                <StickerSvg design={d.controller} className="size-20 sm:size-24 drop-shadow-[0_8px_14px_rgba(0,0,0,0.4)]" />
              </div>
              <div className="transition-transform hover:scale-110 hover:rotate-3 cursor-pointer" style={{ transform: 'rotate(-10deg)' }}>
                <StickerSvg design={d.samosa} className="size-20 sm:size-24 drop-shadow-[0_8px_14px_rgba(0,0,0,0.4)]" />
              </div>
              <div className="transition-transform hover:scale-110 hover:rotate-3 cursor-pointer" style={{ transform: 'rotate(12deg)' }}>
                <StickerSvg design={d.redline} className="size-20 sm:size-24 drop-shadow-[0_8px_14px_rgba(0,0,0,0.4)]" />
              </div>
              <div className="transition-transform hover:scale-110 hover:rotate-3 cursor-pointer" style={{ transform: 'rotate(-4deg)' }}>
                <StickerSvg design={d.cat} className="size-20 sm:size-24 drop-shadow-[0_8px_14px_rgba(0,0,0,0.4)]" />
              </div>
              <div className="transition-transform hover:scale-110 hover:rotate-3 cursor-pointer" style={{ transform: 'rotate(9deg)' }}>
                <StickerSvg design={d.sleepyCloud} className="size-20 sm:size-24 drop-shadow-[0_8px_14px_rgba(0,0,0,0.4)]" />
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-mint/20 bg-paper/60 p-3.5 text-center text-xs font-bold text-ink-soft">
              "Slap them on your laptop, water bottle, phone case, desk or bike helmet."
            </div>
          </div>
        </div>

        {/* Right Side: Narrative */}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-mint">01 / What we believe</p>
          <h2 className="mt-3 font-display text-4xl font-extrabold leading-none sm:text-6xl text-ink uppercase">
            SMALL STICKERS. BIG PERSONALITY.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-ink-soft">
            A plain laptop is fine. A wall with nothing on it is fine. But why settle for fine? Sticker Club is about making your everyday space unmistakably yours—with small designs, bold ideas and plenty of character.
          </p>
          <p className="mt-4 text-base leading-relaxed text-ink-soft">
            We started as a student-run brand in {brand.city} with a simple observation: everyone carries the exact same laptops, bottles, and notebooks. Stickers are the cheapest, most expressive way to claim your things back.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/shop?category=stickers" className="btn-accent text-sm">
              Shop sticker packs →
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 02 / FIND YOUR THING (COLLECTION TILES WITH POPPING STICKERS) */}
      <section className="bg-paper px-4 py-20 text-ink sm:px-6 md:py-28 border-y border-mint/15">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-mint">02 / Find your thing</p>
              <h2 className="mt-2 max-w-3xl font-display text-4xl font-extrabold leading-none sm:text-6xl uppercase">
                YOUR WORLD, YOUR COLLECTION.
              </h2>
            </div>
            <Link to="/vibes" className="flex items-center gap-1.5 text-sm font-bold text-mint hover:underline">
              View all vibes <LuArrowRight aria-hidden className="size-4" />
            </Link>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {collections.map((c) => (
              <Link
                key={c.title}
                to={c.to}
                className="on-light group relative flex min-h-[300px] flex-col justify-between overflow-hidden rounded-3xl border-2 border-[#121212] p-6 shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_16px_30px_rgba(0,0,0,0.35)]"
                style={{ backgroundColor: c.color }}
              >
                {/* Popping corner sticker illustration */}
                <div
                  className="absolute -top-3 -right-3 z-10 transition-transform duration-300 group-hover:scale-120 group-hover:rotate-12"
                  style={{ transform: 'rotate(6deg)' }}
                >
                  <StickerSvg design={c.sticker} className="size-20 sm:size-22 drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]" />
                </div>

                <div className="relative z-10">
                  <span className="inline-block rounded-full bg-[#121212] px-2.5 py-0.5 font-mono text-[10px] font-black tracking-wider text-white uppercase">
                    {c.tag}
                  </span>
                </div>

                <div className="relative z-10 mt-auto">
                  <h3 className="font-display text-3xl font-extrabold text-[#121212] leading-tight">
                    {c.title}
                  </h3>
                  <p className="mt-2 text-sm leading-snug text-[#121212]/85">
                    {c.copy}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-black tracking-wider text-[#121212] uppercase">
                    EXPLORE <LuArrowRight aria-hidden className="size-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 03 / MAKE IT YOURS */}
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 md:grid-cols-2 md:gap-16 md:py-28">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-mint">03 / Make it yours</p>
          <h2 className="mt-3 font-display text-4xl font-extrabold leading-none sm:text-6xl text-ink uppercase">
            YOUR IDEAS. YOUR RULES.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-ink-soft">
            Your sketches, your photos, your memes, your friend group inside jokes. Upload any image, frame it with our crop tool, select exact dimensions from 5cm × 5cm to custom sizes, and we'll cut it on premium waterproof vinyl.
          </p>
          <p className="mt-4 text-sm text-ink-soft">
            Every custom sticker is inspected for print resolution and laminated with protective matte coating before dispatch.
          </p>
          <Link to="/create-your-stickers" className="btn-accent mt-8 text-base px-8 py-3.5 inline-flex items-center gap-2">
            Create your own sticker <LuArrowRight aria-hidden className="size-4" />
          </Link>
        </div>

        {/* Custom Sticker Preview Box */}
        <div className="relative mx-auto w-full max-w-md">
          <div className="rounded-3xl border-2 border-dashed border-mint/40 bg-paper-deep p-8 text-center relative overflow-hidden shadow-xl">
            <span className="inline-block rounded-full bg-mint/20 px-3 py-1 text-xs font-bold text-mint mb-4 uppercase tracking-wider">
              ★ CUSTOM DIE-CUT SIMULATOR
            </span>
            <div className="my-6 relative inline-block p-4 rounded-2xl border border-dashed border-mint/60 bg-paper/50">
              <StickerSvg design={d.jugaad} className="size-36 mx-auto drop-shadow-[0_16px_28px_rgba(0,0,0,0.6)]" />
              <span className="absolute -bottom-2 right-2 rounded-md bg-lime px-2 py-0.5 text-[10px] font-mono font-bold text-paper">
                CUSTOM DIE-CUT
              </span>
            </div>
            <div className="flex justify-center gap-3 text-xs font-bold text-ink-soft">
              <span>✓ 5cm × 5cm (₹20)</span>
              <span>✓ 6cm × 6cm (₹25)</span>
              <span>✓ Custom cm²</span>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION / THE WORLD IS YOUR CANVAS */}
      <section className="relative overflow-hidden bg-paper-deep px-4 py-24 text-center sm:px-6 md:py-32 border-t border-mint/15">
        {/* Floating stickers framing the CTA */}
        <div className="pointer-events-none absolute top-10 left-[5%] hidden md:block" style={{ transform: 'rotate(-15deg)' }}>
          <StickerSvg design={d.pixelHeart} className="size-24 opacity-80 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]" />
        </div>
        <div className="pointer-events-none absolute top-10 right-[5%] hidden md:block" style={{ transform: 'rotate(18deg)' }}>
          <StickerSvg design={d.controller} className="size-24 opacity-80 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]" />
        </div>
        <div className="pointer-events-none absolute bottom-10 left-[8%] hidden md:block" style={{ transform: 'rotate(12deg)' }}>
          <StickerSvg design={d.samosa} className="size-20 opacity-80 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]" />
        </div>
        <div className="pointer-events-none absolute bottom-10 right-[8%] hidden md:block" style={{ transform: 'rotate(-10deg)' }}>
          <StickerSvg design={d.sleepyCloud} className="size-22 opacity-80 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]" />
        </div>

        <div className="relative mx-auto max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-mint">This is your sign</p>
          <h2 className="mx-auto mt-5 max-w-5xl font-display text-[clamp(3.5rem,9vw,8rem)] font-extrabold leading-[0.88] text-ink uppercase">
            THE WORLD IS YOUR CANVAS.
          </h2>
          <p className="mt-6 text-lg text-ink-soft sm:text-xl">
            Pick what speaks to you, slap it wherever you want, and make your stuff yours.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link to="/shop" className="btn-primary text-base px-9 py-4 shadow-[0_12px_30px_rgba(255,16,38,0.8)]">
              FIND YOUR VIBE →
            </Link>
            <Link to="/create-your-stickers" className="btn-ghost text-base px-8 py-4">
              MAKE YOUR OWN STICKER
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

const faqs: { q: string; a: ReactNode }[] = [
  {
    q: 'Can I place an order right now?',
    a: 'Yes! Pixwora is live. You can add stickers, posters, and custom prints to your cart and proceed to checkout. We deliver pan-India with a minimum order total of ₹99.',
  },
  {
    q: 'What size and material are the stickers?',
    a: 'Our stickers are printed on premium 100% waterproof, scratch-resistant vinyl with a protective matte laminate. Individual stickers fit within a standard 5cm × 5cm (approx 2" × 2") area with die-cut precision, while sticker sheets are standard A6 format (10.5 × 14.8 cm).',
  },
  {
    q: 'How does "Create Your Own" custom stickers work?',
    a: 'You can upload your own image or photo, use our interactive corner-bracket crop tool to frame it, and pick your dimensions: 5cm × 5cm (₹20), 6cm × 6cm (₹25), or enter any custom dimensions in cm with instant automated pricing. We inspect every uploaded artwork for print clarity before production.',
  },
  {
    q: 'What poster sizes do you offer and what paper is used?',
    a: 'Our wall posters come in three standard international sizes: A5 (14.8 × 21 cm / 5.8 × 8.3 in), A4 (21 × 29.7 cm / 8.3 × 11.7 in), and A3 (29.7 × 42 cm / 11.7 × 16.5 in). All posters are printed on heavy 300 GSM archival matte cardstock with rich, fade-resistant color reproduction.',
  },
  {
    q: 'What is the minimum order requirement?',
    a: 'Pixwora has a ₹99 minimum order total to checkout. This allows us to use rigid bend-proof mailers, protective moisture-sealed packaging, and reliable tracked courier dispatch.',
  },
  {
    q: 'How do I pay using UPI?',
    a: 'Select UPI at checkout. You will see our verified store UPI ID with display payee name KOMMULA SRUJAN REDDY along with a dynamic QR code. Scan and transfer via Google Pay, PhonePe, Paytm, or any UPI app, then submit your 12-digit UPI Transaction ID (UTR) to confirm your order.',
  },
  {
    q: 'Do you offer Cash on Delivery (COD)?',
    a: 'Yes! Cash on Delivery is available for eligible addresses across India (with a nominal ₹15 extra delivery charge). Payment is collected in cash by the delivery courier upon arrival.',
  },
  {
    q: 'What is the Mystery Sticker Pack?',
    a: 'The Mystery Pack gives you 6 stickers for ₹129: 5 guaranteed stickers from your chosen theme (Anime, Marvel, Cars & Bikes, Gaming, Cute, Devotion, Sports, or Movies) plus 1 surprise mystery sticker chosen by our team.',
  },
  {
    q: 'Can I personalize Secret Message stickers?',
    a: 'Yes! Every Secret Message sticker includes a wax-sealed envelope card. You can enter your own custom message during checkout or in our interactive builder to surprise a friend, or receive our curated secret quote.',
  },
  {
    q: 'Do your stickers peel off cleanly without residue?',
    a: 'Yes. Our stickers use premium removable vinyl adhesive. You can peel and reposition them on laptops, phone cases, water bottles, and glass cleanly with zero sticky glue residue.',
  },
  {
    q: 'How long does delivery take?',
    a: 'Orders are printed, precision cut, and packed within 1-2 business days. Delivery across major metro cities in India typically takes 3-5 business days. You can track your order status live from your Pixwora account.',
  },
];

export function FaqPage() {
  usePageMeta('FAQ', 'Answers to common questions about our stickers, ordering and delivery.');
  return (
    <Page title="Questions, answered." crumb="FAQ">
      <div className="divide-y-2 divide-ink/10 border-y-2 border-ink/10">
        {faqs.map((f) => (
          <details key={f.q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-xl font-extrabold">
              {f.q}
              <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-ink transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-ink-soft">{f.a}</p>
          </details>
        ))}
      </div>
    </Page>
  );
}

export function ContactPage() {
  usePageMeta('Contact', `How to reach ${brand.displayName}.`);
  const { email, instagramUrl, instagramHandle, phone } = brand.contact;
  const wa = whatsappLink('Hey! I am interested to buy stickers');
  return (
    <Page title="Say hi." crumb="Contact" intro="Questions, design requests, feedback on prices — we want to hear all of it.">
      {hasAnyContact() ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {instagramUrl && (
            <li>
              <a href={instagramUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-white p-5 font-bold hover:bg-lime">
                <LuInstagram aria-hidden className="size-6" /> {instagramHandle ?? 'Instagram'}
              </a>
            </li>
          )}
          {phone && (
            <li>
              <a href={`tel:${phone}`} className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-white p-5 font-bold hover:bg-lime">
                <LuPhone aria-hidden className="size-6" /> +91 {phone}
              </a>
            </li>
          )}
          {wa && (
            <li>
              <a href={wa} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-white p-5 font-bold hover:bg-lime">
                <LuMessageCircle aria-hidden className="size-6" /> WhatsApp
              </a>
            </li>
          )}
          {email && (
            <li>
              <a href={`mailto:${email}`} className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-white p-5 font-bold hover:bg-lime">
                <LuMail aria-hidden className="size-6" /> {email}
              </a>
            </li>
          )}
        </ul>
      ) : (
        <Notice>
          <p className="font-bold">Contact details aren’t set up yet.</p>
          <p className="mt-1">
            <Placeholder>Founders: add an email, Instagram or WhatsApp number in src/config/brand.ts</Placeholder>
          </p>
        </Notice>
      )}
    </Page>
  );
}

const policies: Record<string, { title: string; points: string[]; placeholderNotice: string }> = {
  terms: {
    title: 'Terms of Service',
    points: [
      'Store operator information and user eligibility',
      'Pricing, payment terms (UPI and Cash on Delivery), and billing policies',
      'Order acceptance, dispatch, and delivery terms',
      'Intellectual property and ownership of original sticker and poster artwork',
      'Limitation of liability and local jurisdiction in Hyderabad, India',
    ],
    placeholderNotice: 'Founders: Replace this placeholder with your approved Terms of Service before public launch.',
  },
  privacy: {
    title: 'Privacy Policy',
    points: [
      'Customer personal data collected (name, email, delivery addresses, phone number)',
      'Secure storage in PostgreSQL and non-disclosure to unauthorized third parties',
      'Session token management and encryption of credentials',
      'Customer rights regarding data access, updates, and account deletion',
    ],
    placeholderNotice: 'Founders: Replace this placeholder with your approved Privacy Policy.',
  },
  shipping: {
    title: 'Shipping & Delivery Policy',
    points: [
      'Delivery coverage across Hyderabad local areas and pan-India shipping',
      'Standard dispatch times and delivery partner schedules',
      'Protective cardboard and bubble packaging for vinyl stickers and art posters',
      'Shipping fee calculations and delivery confirmation tracking',
    ],
    placeholderNotice: 'Founders: Replace this placeholder with your approved Shipping and Delivery terms.',
  },
  returns: {
    title: 'Refund & Cancellation Policy',
    points: [
      'Customer cancellation rights for orders in PENDING status prior to processing',
      'Guidelines for customized or personalized products once production begins',
      'Damaged in transit, defective or misprinted item replacement procedures',
      'Refund timelines for manual UPI payments and COD exceptions',
    ],
    placeholderNotice: 'Founders: Replace this placeholder with your approved Refund and Cancellation policy.',
  },
};

// Aliases for intuitive URL matching
policies['shipping-delivery'] = policies.shipping;
policies['refund'] = policies.returns;
policies['refund-cancellation'] = policies.returns;

export function PolicyPage({ slug: propSlug }: { slug?: string } = {}) {
  const params = useParams();
  const slug = propSlug ?? params.slug;
  const policy = policies[slug ?? ''];
  usePageMeta(policy ? policy.title : 'Policy not found');
  if (!policy) return <NotFoundPage />;
  return (
    <Page title={policy.title} crumb={policy.title}>
      <Notice tone="demo">
        <strong>[PLACEHOLDER FOR STORE OWNER]</strong> — {policy.placeholderNotice}
      </Notice>
      <p className="font-semibold text-ink">This policy section will detail:</p>
      <ul className="list-disc space-y-2.5 pl-6 text-ink-soft">
        {policy.points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <div className="mt-8 rounded-xl border border-dashed border-ink/20 p-4 text-xs text-ink-soft">
        <p className="font-bold text-ink">Owner Note:</p>
        <p className="mt-1">
          To finalize this policy, replace this placeholder with your verified legal copy. No arbitrary policies,
          phone numbers or unconfirmed delivery terms are assumed by the system.
        </p>
      </div>
    </Page>
  );
}

export function NotFoundPage() {
  usePageMeta('Page not found');
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <EmptyState
        title="This page came unstuck."
        body="The link might be old, or the page doesn’t exist."
        action={
          <Link to="/" className="btn-primary">
            Go home
          </Link>
        }
      />
    </div>
  );
}
