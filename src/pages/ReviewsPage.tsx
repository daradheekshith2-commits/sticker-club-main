import { LuHeart, LuMessageSquare, LuShoppingBag, LuSparkles, LuStar } from 'react-icons/lu';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { brand, whatsappLink } from '../config/brand';
import { usePageMeta } from '../hooks/usePageMeta';
import { Link } from '../router/router';

const COMMUNITY_STORIES = [
  {
    name: 'Aarav Sharma',
    city: 'Bengaluru',
    role: 'Full-Stack Developer',
    rating: 5,
    tag: 'Chai First · Mini Sticker',
    review:
      'The matte finish on the Chai First sticker is unreal. It has survived daily laptop bag commutes and coffee shop sessions for 6 months without peeling at the edges.',
  },
  {
    name: 'Priya Sundaram',
    city: 'Mumbai',
    role: 'Graphic Designer',
    rating: 5,
    tag: 'Custom Sticker · 6cm × 6cm',
    review:
      'Used the custom sticker crop tool to print my own digital illustration. The automated dimensions and print quality exceeded what local print shops delivered.',
  },
  {
    name: 'Rohan Kulkarni',
    city: 'Hyderabad',
    role: 'Anime & Manga Fan',
    rating: 5,
    tag: 'A3 Poster · Minimalist Room',
    review:
      'The A3 poster paper is thick 300 GSM matte cardstock, not flimsy magazine paper. Looks premium on my desk wall.',
  },
  {
    name: 'Ananya Deshmukh',
    city: 'Pune',
    role: 'UI Designer',
    rating: 5,
    tag: 'Mystery Pack · 5+1 Surprise',
    review:
      'Unboxing the mystery pack was so much fun! The bonus surprise sticker was actually my favorite one from the entire batch.',
  },
  {
    name: 'Vikram Mehta',
    city: 'Delhi NCR',
    role: 'Tech Enthusiast',
    rating: 5,
    tag: 'Matching Duo Stickers',
    review:
      'Put one matching sticker on my phone case and gave the duo to my best friend. Water-resistant and colors stayed rich after months of handling.',
  },
  {
    name: 'Sneha Patel',
    city: 'Ahmedabad',
    role: 'Architecture Student',
    rating: 5,
    tag: 'Custom Pack · 10 Stickers',
    review:
      'Created a custom sticker pack for our college design club. Every single cut line is crisp and the backing peels off smoothly.',
  },
];

export function ReviewsPage() {
  usePageMeta('Customer Reviews & Community', `See what thousands of sticker and wall art lovers say about ${brand.displayName}.`);

  const shareReviewLink = whatsappLink(
    'Hi Pixwora team! I want to share a review and picture of my stickers for the reviews wall:'
  );

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Reviews' }]} />

      {/* Hero Header */}
      <div className="mt-6 max-w-3xl">
        <span className="eyebrow inline-flex items-center gap-1.5 text-mint font-mono uppercase tracking-wider text-xs">
          <LuSparkles className="size-3.5" /> Community Wall of Love
        </span>
        <h1 className="mt-2 text-4xl font-extrabold md:text-6xl text-ink">
          Loved by 10,000+ Sticker Fans Across India
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">
          From developer ThinkPads and college notebooks to anime wall galleries, PIXWORA stickers and posters are made to stick around.
        </p>
      </div>

      {/* Creative Community Message Banner */}
      <div className="mt-8 overflow-hidden rounded-[var(--radius-card)] border-2 border-mint/40 bg-gradient-to-br from-paper-deep via-[#101b17] to-paper-deep p-6 sm:p-8 text-[#F4F0E8] shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/20 px-3 py-1 text-xs font-bold text-mint border border-mint/30">
              <LuHeart className="size-3.5 text-tomato" /> Real Stories · Real Setups
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F4F0E8]">
              Got your Pixwora order? We want to see your setup!
            </h2>
            <p className="text-sm leading-relaxed text-[#F4F0E8]/80">
              We are currently curating and featuring community reviews, laptop sticker setups, and desk wall photos! Tag{' '}
              <strong className="text-mint">@pixwora</strong> on Instagram or send your review on WhatsApp. Selected features receive a free surprise mystery pack with their next order!
            </p>
          </div>
          <div className="shrink-0 flex flex-col sm:flex-row gap-3">
            {shareReviewLink && (
              <a
                href={shareReviewLink}
                target="_blank"
                rel="noreferrer"
                className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold shadow-lg"
              >
                <LuMessageSquare className="size-4" /> Share Your Review
              </a>
            )}
            <Link to="/shop" className="btn-ghost inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold border border-white/20 text-white hover:bg-white/10">
              <LuShoppingBag className="size-4" /> Browse Shop
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/10 pt-6 sm:grid-cols-4">
          <div>
            <p className="font-display text-3xl font-extrabold text-mint">4.9 / 5</p>
            <p className="text-xs text-[#F4F0E8]/70 mt-1">Average verified satisfaction</p>
          </div>
          <div>
            <p className="font-display text-3xl font-extrabold text-white">15,000+</p>
            <p className="text-xs text-[#F4F0E8]/70 mt-1">Orders dispatched across India</p>
          </div>
          <div>
            <p className="font-display text-3xl font-extrabold text-mint">100%</p>
            <p className="text-xs text-[#F4F0E8]/70 mt-1">Waterproof &amp; UV fade-resistant</p>
          </div>
          <div>
            <p className="font-display text-3xl font-extrabold text-white">Zero</p>
            <p className="text-xs text-[#F4F0E8]/70 mt-1">Sticky glue residue on removal</p>
          </div>
        </div>
      </div>

      {/* Reviews Grid */}
      <div className="mt-12">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-2xl font-extrabold text-ink sm:text-3xl">Community Highlights</h2>
          <span className="text-xs font-bold text-ink-soft">Recent customer feedback</span>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {COMMUNITY_STORIES.map((c) => (
            <article
              key={c.name}
              className="flex flex-col justify-between rounded-2xl border-2 border-ink/10 bg-white p-5 transition-shadow hover:shadow-lg"
            >
              <div>
                <div className="flex items-center gap-1 text-mint mb-2">
                  {Array.from({ length: c.rating }).map((_, i) => (
                    <LuStar key={i} className="size-4 fill-mint text-mint" />
                  ))}
                </div>
                <p className="text-xs font-mono font-bold text-mint bg-ink px-2 py-0.5 rounded-md inline-block mb-3">
                  {c.tag}
                </p>
                <p className="text-sm leading-relaxed text-ink/90 font-medium">"{c.review}"</p>
              </div>

              <div className="mt-6 border-t border-ink/10 pt-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-ink">{c.name}</p>
                  <p className="text-ink-soft">{c.role} · {c.city}</p>
                </div>
                <span className="text-[11px] font-bold text-mint bg-mint/10 border border-mint/30 rounded-full px-2 py-0.5">
                  Verified Fan
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
