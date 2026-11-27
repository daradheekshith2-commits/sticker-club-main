import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { LuCheck, LuHeart, LuMessageSquare, LuPlus, LuShoppingBag, LuSparkles, LuStar, LuTrash2, LuUpload, LuX } from 'react-icons/lu';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { brand } from '../config/brand';
import { usePageMeta } from '../hooks/usePageMeta';
import { supabase } from '../lib/supabase';
import { Link } from '../router/router';
import { addReview, fetchReviews, type ReviewItem } from '../services/reviews';

const REVIEW_TAG_OPTIONS = [
  'Waterproof Stickers',
  'Wall Posters',
  'Custom Stickers',
  'Laptop Setup',
  'Anime Collection',
  'Verified Customer',
];

const RATING_LABELS: Record<number, string> = {
  5: '⭐⭐⭐⭐⭐ Outstanding! Top quality',
  4: '⭐⭐⭐⭐ Great stickers & prints',
  3: '⭐⭐⭐ Good experience',
  2: '⭐⭐ Fair',
  1: '⭐ Needs improvement',
};

export function ReviewsPage() {
  const siteOrigin = brand.publicUrl || 'https://www.pixwora.store';
  usePageMeta({
    title: `Customer Reviews & Real Photos | ${brand.displayName}`,
    description: `See real customer reviews and photos of ${brand.displayName} waterproof stickers and room wall posters from students across India.`,
    canonical: `${siteOrigin}/reviews`,
  });

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal & Form state
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [tag, setTag] = useState('Waterproof Stickers');
  const [note, setNote] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchReviews()
      .then(setReviews)
      .finally(() => setLoading(false));
  }, []);

  // Handle local image file selection with dual Supabase + compressed fallback
  async function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    setUploadingImage(true);
    setFormError('');

    try {
      // 1. Try uploading to Supabase storage bucket 'artworks'
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `review-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('artworks').upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('artworks').getPublicUrl(fileName);
        if (urlData?.publicUrl) {
          setPhotoPreview(urlData.publicUrl);
          setUploadingImage(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Storage upload notice, utilizing compressed local preview:', err);
    }

    // 2. High-performance client-side image compression fallback
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setPhotoPreview(canvas.toDataURL('image/jpeg', 0.82));
        } else {
          setPhotoPreview(event.target?.result as string);
        }
        setUploadingImage(false);
      };
      img.onerror = () => {
        setPhotoPreview(event.target?.result as string);
        setUploadingImage(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmitReview(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Please enter your name.');
      return;
    }
    if (!note.trim()) {
      setFormError('Please write your review feedback.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const created = await addReview({
        name: name.trim(),
        city: city.trim() || undefined,
        rating,
        note: note.trim(),
        photoUrl: photoPreview.trim() || undefined,
        tag: tag.trim() || 'Verified Customer',
      });

      // Instantly prepend new review to display in its place on the reviews wall
      setReviews((prev) => [created, ...prev.filter((r) => r.id !== created.id)]);
      setSubmitSuccess(true);

      // Reset form after short delay
      setTimeout(() => {
        setName('');
        setCity('');
        setRating(5);
        setTag('Waterproof Stickers');
        setNote('');
        setPhotoPreview('');
        setSubmitSuccess(false);
        setShowModal(false);

        // Smooth scroll to highlight section
        const section = document.getElementById('community-highlights');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth' });
        }
      }, 1500);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to publish review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

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
              Share your review notes and setup photos right here on our website. Selected customer features receive a free surprise mystery pack with their next order!
            </p>
          </div>
          <div className="shrink-0 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                setFormError('');
                setSubmitSuccess(false);
                setShowModal(true);
              }}
              className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              <LuMessageSquare className="size-4" /> Share Your Review
            </button>
            <Link to="/shop" className="btn-ghost inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold border border-white/20 text-white hover:bg-white/10">
              <LuShoppingBag className="size-4" /> Browse Shop
            </Link>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div id="community-highlights" className="mt-12 scroll-mt-20">
        <div className="mb-6 flex items-baseline justify-between border-b border-ink/10 pb-3">
          <div>
            <h2 className="text-2xl font-extrabold text-ink sm:text-3xl">Community Highlights</h2>
            <p className="text-xs text-ink-soft mt-1">Real feedback from verified sticker lovers &amp; art collectors</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-ink-soft hidden sm:inline-block">
              {reviews.length > 0 ? `${reviews.length} verified review${reviews.length === 1 ? '' : 's'}` : 'Recent feedback'}
            </span>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="btn-ghost text-xs font-bold border border-mint/40 text-mint hover:bg-mint/10 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5"
            >
              <LuPlus className="size-3.5" />
              <span>Write a Review</span>
            </button>
          </div>
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
              Be the first to share your stickers, laptop setup, or room gallery! Click below to publish your review and photos directly.
            </p>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="mt-5 btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold shadow"
            >
              <LuPlus className="size-4" /> Share the First Review
            </button>
          </div>
        ) : (
          // Dynamic reviews grid displaying in their respective place
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((c) => (
              <article
                key={c.id}
                className="flex flex-col justify-between rounded-2xl border-2 border-ink/10 bg-white p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1 text-sun">
                      {Array.from({ length: c.rating }).map((_, i) => (
                        <LuStar key={i} className="size-4 fill-sun text-sun" />
                      ))}
                    </div>
                    {c.tag && (
                      <span className="text-[11px] font-mono font-bold text-mint bg-ink px-2 py-0.5 rounded-md">
                        {c.tag}
                      </span>
                    )}
                  </div>

                  <p className="text-sm leading-relaxed text-ink/90 font-medium">"{c.note}"</p>

                  {c.photoUrl && (
                    <div className="mt-4 overflow-hidden rounded-xl border border-ink/10 bg-paper">
                      <img
                        src={c.photoUrl}
                        alt={`Setup shared by ${c.name}`}
                        className="h-48 w-full object-cover transition-transform duration-300 hover:scale-105"
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

      {/* On-Site Review Submission Modal */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in"
        >
          <div className="relative w-full max-w-lg rounded-2xl border-2 border-mint/40 bg-[#0d1d19] p-6 text-paper shadow-2xl my-8">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white transition"
              aria-label="Close review form"
            >
              <LuX className="size-5" />
            </button>

            {submitSuccess ? (
              <div className="py-10 text-center space-y-3">
                <div className="mx-auto grid size-16 place-items-center rounded-full bg-mint/20 text-mint text-3xl border border-mint/40">
                  <LuCheck className="size-8 stroke-[3]" />
                </div>
                <h3 className="font-display text-2xl font-bold text-white">Review Published!</h3>
                <p className="text-sm text-white/80 max-w-sm mx-auto">
                  Thank you, <strong>{name}</strong>! Your review is now live on the Pixwora Community Wall.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-5">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-mint flex items-center gap-1.5">
                    <LuSparkles className="size-4" /> Share Your Experience
                  </span>
                  <h3 className="mt-1 font-display text-2xl font-black text-white">
                    How's your Pixwora setup?
                  </h3>
                  <p className="mt-1 text-xs text-white/70">
                    Your review and photos will appear directly on our community wall below.
                  </p>
                </div>

                {formError && (
                  <div className="mb-4 rounded-xl bg-danger/20 border border-danger/40 p-3 text-xs font-bold text-danger">
                    {formError}
                  </div>
                )}

                <form onSubmit={handleSubmitReview} className="space-y-4">
                  {/* Star Rating Picker */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1.5">
                      Your Rating *
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-1 transition-transform hover:scale-110 focus:outline-none"
                            aria-label={`${star} star`}
                          >
                            <LuStar
                              className={`size-6 transition-colors ${
                                star <= (hoverRating || rating)
                                  ? 'fill-sun text-sun'
                                  : 'text-white/30'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <span className="text-xs font-bold text-sun ml-2">
                        {RATING_LABELS[hoverRating || rating]}
                      </span>
                    </div>
                  </div>

                  {/* Customer Name & City/College */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1">
                        Your Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Srujan Reddy"
                        className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-mint focus:outline-none focus:ring-1 focus:ring-mint"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1">
                        City / College (optional)
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Hyderabad / CBIT"
                        className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-mint focus:outline-none focus:ring-1 focus:ring-mint"
                      />
                    </div>
                  </div>

                  {/* Category / Product Tag Pills */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1.5">
                      What did you get? (optional)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {REVIEW_TAG_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setTag(opt)}
                          className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${
                            tag === opt
                              ? 'bg-mint text-paper font-black border border-mint'
                              : 'bg-white/10 text-white/80 border border-white/15 hover:bg-white/20'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Review Textarea */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1">
                      Your Review *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Share your thoughts on sticker finish, waterproof durability, poster thickness, or customer support..."
                      className="w-full rounded-lg border border-white/20 bg-black/40 p-3 text-sm text-white placeholder:text-white/40 focus:border-mint focus:outline-none focus:ring-1 focus:ring-mint"
                    />
                  </div>

                  {/* Setup Photo Upload */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1">
                      Photo of your setup / stickers (optional)
                    </label>
                    {photoPreview ? (
                      <div className="relative inline-block mt-1">
                        <img
                          src={photoPreview}
                          alt="Review preview"
                          className="h-28 w-28 rounded-xl object-cover border-2 border-mint/50 shadow-md"
                        />
                        <button
                          type="button"
                          onClick={() => setPhotoPreview('')}
                          className="absolute -top-2 -right-2 rounded-full bg-danger text-white p-1 shadow hover:bg-danger/90 transition"
                          title="Remove photo"
                        >
                          <LuTrash2 className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="mt-1 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/25 bg-black/30 p-4 text-center transition hover:border-mint hover:bg-black/40">
                        <LuUpload className="size-6 text-mint mb-1" />
                        <span className="text-xs font-bold text-white">
                          {uploadingImage ? 'Processing photo…' : 'Upload photo of your stickers or room wall'}
                        </span>
                        <span className="text-[10px] text-white/50 mt-0.5">JPG, PNG, WebP up to 10MB</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileSelect}
                          disabled={uploadingImage}
                        />
                      </label>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="btn-ghost text-xs px-4 py-2 text-white/70 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || uploadingImage}
                      className="btn-primary text-xs px-6 py-2.5 font-bold shadow-lg inline-flex items-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <span className="inline-block size-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          <span>Publishing…</span>
                        </>
                      ) : (
                        <>
                          <LuSparkles className="size-4" />
                          <span>Publish Review</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
