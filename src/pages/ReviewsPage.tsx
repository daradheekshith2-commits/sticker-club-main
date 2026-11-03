import { useEffect, useState } from 'react';
import { LuHeart, LuMessageSquare, LuShoppingBag, LuSparkles, LuStar } from 'react-icons/lu';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { brand, whatsappLink } from '../config/brand';
import { usePageMeta } from '../hooks/usePageMeta';
import { Link } from '../router/router';
import { fetchReviews, type ReviewItem } from '../services/reviews';

export function ReviewsPage() {
  usePageMeta('Customer Reviews & Community', `See what sticker and wall art lovers say about ${brand.displayName}.`);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews()
      .then(setReviews)
      .finally(() => setLoading(false));
  }, []);

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
          Customer Reviews &amp; Community
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">
          From developer ThinkPads and college notebooks to anime wall galleries, discover how customers style and enjoy their PIXWORA stickers and prints.
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
              Tag <strong className="text-mint">@pixwora</strong> on Instagram or send your review notes and setup photos on WhatsApp. Selected features receive a free surprise mystery pack with their next order!
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
      </div>

      {/* Reviews Section */}
      <div className="mt-12">
        <div className="mb-6 flex items-baseline justify-between border-b border-ink/10 pb-3">
          <h2 className="text-2xl font-extrabold text-ink sm:text-3xl">Community Highlights</h2>
          <span className="text-xs font-bold text-ink-soft">
            {reviews.length > 0 ? `${reviews.length} verified review${reviews.length === 1 ? '' : 's'}` : 'Recent feedback'}
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <p className="text-sm font-bold text-ink-soft animate-pulse">Loading reviews…</p>
          </div>
        ) : reviews.length === 0 ? (
          // Clean empty place when no reviews are added yet
          <div className="rounded-2xl border-2 border-dashed border-ink/15 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-paper-deep text-2xl">
              ✨
            </div>
            <h3 className="mt-4 font-display text-xl font-bold text-ink">
              No reviews posted yet
            </h3>
            <p className="mt-2 text-sm text-ink-soft max-w-md mx-auto">
              Be the first to share your stickers, laptop setup, or room gallery! Tap "Share Your Review" above to submit your photos.
            </p>
          </div>
        ) : (
          // Dynamic reviews added by admin
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((c) => (
              <article
                key={c.id}
                className="flex flex-col justify-between rounded-2xl border-2 border-ink/10 bg-white p-5 transition-shadow hover:shadow-lg"
              >
                <div>
                  <div className="flex items-center gap-1 text-sun mb-2">
                    {Array.from({ length: c.rating }).map((_, i) => (
                      <LuStar key={i} className="size-4 fill-sun text-sun" />
                    ))}
                  </div>

                  {c.tag && (
                    <p className="text-xs font-mono font-bold text-mint bg-ink px-2 py-0.5 rounded-md inline-block mb-3">
                      {c.tag}
                    </p>
                  )}

                  <p className="text-sm leading-relaxed text-ink/90 font-medium">"{c.note}"</p>

                  {c.photoUrl && (
                    <div className="mt-4 overflow-hidden rounded-xl border border-ink/10 bg-paper">
                      <img
                        src={c.photoUrl}
                        alt={`Setup shared by ${c.name}`}
                        className="h-44 w-full object-cover transition-transform duration-300 hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-6 border-t border-ink/10 pt-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-ink">{c.name}</p>
                    {(c.role || c.city) && (
                      <p className="text-ink-soft">{[c.role, c.city].filter(Boolean).join(' · ')}</p>
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-mint bg-mint/10 border border-mint/30 rounded-full px-2 py-0.5">
                    Verified Customer
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
