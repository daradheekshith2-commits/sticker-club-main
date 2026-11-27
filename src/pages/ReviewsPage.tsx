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

  // Lock background scroll and handle ESC key when review modal is open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowModal(false);
    }
    if (showModal) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [showModal]);

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 animate-fade-in"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative w-full max-w-xl rounded-3xl border border-[#a8f0dc]/40 bg-gradient-to-b from-[#0b241e] via-[#071b17] to-[#04120f] text-[#ffffff] shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_40px_rgba(168,240,220,0.12)] flex flex-col max-h-[90vh] overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Glowing Gradient Accent */}
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#a8f0dc] to-transparent shrink-0 opacity-80" />

            {/* Fixed Modal Header */}
            <div className="flex items-start justify-between p-5 sm:p-6 pb-4 border-b border-[#214b40]/80 bg-[#071b17]/95 backdrop-blur-md shrink-0">
              <div className="pr-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#a8f0dc]/15 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#a8f0dc] border border-[#a8f0dc]/30">
                  <LuSparkles className="size-3.5 text-[#a8f0dc]" /> Verified Community Wall
                </span>
                <h3 className="mt-2 font-display text-2xl sm:text-3xl font-black text-[#ffffff] tracking-tight">
                  Share Your Pixwora Story
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-[#d6ede6] leading-relaxed">
                  Your feedback and setup photos will appear live on our wall of love.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="size-9 rounded-full bg-[#0f2e26] hover:bg-[#a8f0dc] hover:text-[#03110f] border border-[#2f665a] text-[#ffffff] flex items-center justify-center transition-all duration-200 hover:rotate-90 shrink-0 shadow-sm"
                aria-label="Close modal"
              >
                <LuX className="size-5" />
              </button>
            </div>

            {submitSuccess ? (
              <div className="py-16 px-6 text-center space-y-4">
                <div className="mx-auto grid size-20 place-items-center rounded-full bg-[#a8f0dc]/20 text-[#a8f0dc] text-4xl border-2 border-[#a8f0dc] shadow-[0_0_30px_rgba(168,240,220,0.3)]">
                  <LuCheck className="size-10 stroke-[3]" />
                </div>
                <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-[#ffffff]">Review Published!</h3>
                <p className="text-sm sm:text-base text-[#d6ede6] max-w-sm mx-auto leading-relaxed">
                  Thank you, <strong className="text-[#a8f0dc]">{name}</strong>! Your review and setup are now live on the Pixwora Community Wall.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                {/* Scrollable Form Body */}
                <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-5 scrollbar-thin scrollbar-thumb-[#2f665a] scrollbar-track-transparent">
                  {formError && (
                    <div className="rounded-xl bg-danger/25 border-2 border-danger p-3.5 text-xs font-bold text-[#ffffff] shadow-sm">
                      {formError}
                    </div>
                  )}

                  {/* Star Rating Picker */}
                  <div className="rounded-2xl border border-[#214b40] bg-[#04120f]/60 p-4">
                    <label className="block text-xs font-black uppercase tracking-wider text-[#a8f0dc] mb-2.5">
                      ⭐ Overall Rating *
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5 bg-[#030e0c] px-3.5 py-2 rounded-xl border border-[#2f665a] shadow-inner">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-1 transition-transform hover:scale-125 focus:outline-none"
                            aria-label={`${star} star`}
                          >
                            <LuStar
                              className={`size-6 sm:size-7 transition-colors ${
                                star <= (hoverRating || rating)
                                  ? 'fill-[#ffd447] text-[#ffd447] drop-shadow-[0_0_10px_rgba(255,212,71,0.65)]'
                                  : 'text-[#2a5047] hover:text-[#ffd447]'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <span className="text-xs sm:text-sm font-extrabold text-[#ffd447] bg-[#ffd447]/10 border border-[#ffd447]/30 px-3 py-1 rounded-full">
                        {RATING_LABELS[hoverRating || rating]}
                      </span>
                    </div>
                  </div>

                  {/* Customer Name & City/College */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-[#a8f0dc] mb-1.5">
                        👤 Your Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Srujan Reddy"
                        className="w-full rounded-xl border-2 border-[#2b594f] bg-[#04120f] px-4 py-3 text-sm font-medium text-[#ffffff] placeholder:text-[#7ca89c] focus:border-[#a8f0dc] focus:bg-[#071b17] focus:outline-none focus:ring-2 focus:ring-[#a8f0dc]/30 transition shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-[#a8f0dc] mb-1.5">
                        📍 City / Campus (optional)
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Hyderabad / CBIT"
                        className="w-full rounded-xl border-2 border-[#2b594f] bg-[#04120f] px-4 py-3 text-sm font-medium text-[#ffffff] placeholder:text-[#7ca89c] focus:border-[#a8f0dc] focus:bg-[#071b17] focus:outline-none focus:ring-2 focus:ring-[#a8f0dc]/30 transition shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Category / Product Tag Pills */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-[#a8f0dc] mb-2">
                      🏷️ What did you get? (optional)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {REVIEW_TAG_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setTag(opt)}
                          className={`rounded-full px-3.5 py-1.5 text-xs font-black transition-all ${
                            tag === opt
                              ? 'bg-[#a8f0dc] text-[#03110f] border-2 border-[#a8f0dc] shadow-[0_0_14px_rgba(168,240,220,0.5)] scale-105'
                              : 'bg-[#0e2722] text-[#ffffff] border-2 border-[#2b594f] hover:border-[#a8f0dc] hover:text-[#a8f0dc] hover:bg-[#13352e]'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Review Textarea */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-[#a8f0dc] mb-1.5">
                      ✍️ Your Review &amp; Experience *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Share your thoughts on sticker finish, waterproof durability, poster thickness, or customer support..."
                      className="w-full rounded-xl border-2 border-[#2b594f] bg-[#04120f] p-4 text-sm font-medium text-[#ffffff] placeholder:text-[#7ca89c] focus:border-[#a8f0dc] focus:bg-[#071b17] focus:outline-none focus:ring-2 focus:ring-[#a8f0dc]/30 transition shadow-inner"
                    />
                  </div>

                  {/* Setup Photo Upload */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-[#a8f0dc] mb-1.5">
                      📸 Photo of your setup / stickers (optional)
                    </label>
                    {photoPreview ? (
                      <div className="relative inline-block mt-1">
                        <img
                          src={photoPreview}
                          alt="Review preview"
                          className="h-32 w-32 rounded-2xl object-cover border-2 border-[#a8f0dc] shadow-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setPhotoPreview('')}
                          className="absolute -top-2.5 -right-2.5 rounded-full bg-[#d90a1f] text-white p-1.5 shadow-xl hover:bg-[#ff1026] hover:scale-110 transition"
                          title="Remove photo"
                        >
                          <LuTrash2 className="size-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="mt-1 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#3a7c6e] bg-[#04120f] p-4 text-center transition hover:border-[#a8f0dc] hover:bg-[#09221d] group">
                        <LuUpload className="size-7 text-[#a8f0dc] mb-1.5 group-hover:scale-110 transition-transform" />
                        <span className="text-xs sm:text-sm font-bold text-[#ffffff]">
                          {uploadingImage ? 'Processing photo…' : 'Upload photo of your stickers or room wall'}
                        </span>
                        <span className="text-[11px] text-[#a3c7be] mt-0.5">JPG, PNG, WebP up to 10MB</span>
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
                </div>

                {/* Fixed/Sticky Modal Footer */}
                <div className="p-4 sm:px-7 py-4 bg-[#04120f]/95 backdrop-blur-md border-t border-[#1d4339] flex items-center justify-between gap-3 shrink-0">
                  <div className="hidden sm:flex items-center gap-2 text-xs text-[#a8f0dc] font-bold">
                    <span className="size-2 rounded-full bg-[#a8f0dc] animate-pulse" />
                    <span>Live publication on /reviews</span>
                  </div>
                  <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="rounded-full border-2 border-[#3a7c6e] bg-[#0e2722] px-5 py-2.5 text-xs font-bold text-[#ffffff] hover:border-[#a8f0dc] hover:bg-[#13352e] transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || uploadingImage}
                      className="rounded-full bg-gradient-to-r from-[#d90a1f] to-[#ff2b42] hover:from-[#ff1026] hover:to-[#ff4557] text-[#ffffff] px-7 py-2.5 text-xs font-black uppercase tracking-wider shadow-[0_4px_20px_rgba(217,10,31,0.5)] transition-all hover:scale-105 active:scale-95 inline-flex items-center gap-2 cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <span className="inline-block size-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          <span>Publishing…</span>
                        </>
                      ) : (
                        <>
                          <LuSparkles className="size-4" />
                          <span>Publish Review ✨</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
