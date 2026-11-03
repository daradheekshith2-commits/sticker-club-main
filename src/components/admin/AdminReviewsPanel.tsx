import { useState, useEffect, type FormEvent } from 'react';
import { LuPlus, LuStar, LuTrash2, LuUpload } from 'react-icons/lu';
import { supabase } from '../../lib/supabase';
import { addReview, deleteReview, fetchReviews, type ReviewItem } from '../../services/reviews';

export function AdminReviewsPanel() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [role, setRole] = useState('');
  const [rating, setRating] = useState(5);
  const [note, setNote] = useState('');
  const [tag, setTag] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  async function loadData() {
    setLoading(true);
    try {
      const data = await fetchReviews();
      setReviews(data);
    } catch (e) {
      setError('Could not load reviews.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleFileUpload(file: File) {
    setUploadingImage(true);
    setError('');
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `review-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('artworks').upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('artworks').getPublicUrl(fileName);
      setPhotoUrl(urlData.publicUrl);
      setMessage('Photo uploaded successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo upload failed');
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !note.trim()) {
      setError('Please provide customer name and review note.');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      await addReview({
        name,
        city: city || undefined,
        role: role || undefined,
        rating,
        note,
        photoUrl: photoUrl || undefined,
        tag: tag || 'Verified Customer',
      });

      setMessage('✓ Review added successfully and published to the Reviews page!');
      setName('');
      setCity('');
      setRole('');
      setNote('');
      setTag('');
      setPhotoUrl('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add review');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await deleteReview(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setMessage('✓ Review removed.');
    } catch (err) {
      setError('Failed to delete review.');
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="font-display text-2xl font-extrabold text-ink">Customer Reviews Manager</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Add real customer reviews, notes, and photos to appear directly on the public{' '}
          <strong className="text-mint">/reviews</strong> page.
        </p>
      </div>

      {message && (
        <div className="rounded-xl bg-mint/15 border border-mint/30 p-3 text-sm text-mint font-bold" role="status">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-danger/15 border border-danger/30 p-3 text-sm text-danger font-bold" role="alert">
          {error}
        </div>
      )}

      {/* Add Review Form */}
      <div className="rounded-2xl border-2 border-ink/15 bg-white p-5 sm:p-6 shadow-sm">
        <h3 className="font-display text-lg font-bold text-ink flex items-center gap-2">
          <LuPlus className="size-5 text-mint" /> Add New Customer Review
        </h3>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">
                Customer Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Srujan Reddy"
                className="field-input w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">
                Product Tag / Purchased Item
              </label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="e.g. Custom 6cm × 6cm or Chai First Mini"
                className="field-input w-full text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">
                City / Location (Optional)
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Hyderabad"
                className="field-input w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">
                Role / Title (Optional)
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Student / Designer"
                className="field-input w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">
                Rating
              </label>
              <div className="flex items-center gap-1.5 pt-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 focus:outline-none"
                  >
                    <LuStar
                      className={`size-6 ${
                        star <= rating ? 'fill-sun text-sun' : 'text-ink/20'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 font-mono text-xs font-bold text-ink">{rating} / 5</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">
              Customer Note / Review Text *
            </label>
            <textarea
              required
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What did the customer say about the sticker quality, packaging, or delivery?"
              className="field-input w-full text-sm"
            />
          </div>

          {/* Photo upload / URL */}
          <div className="rounded-xl border border-ink/10 bg-paper-deep p-3.5 space-y-2">
            <span className="block text-xs font-bold text-ink-soft uppercase tracking-wider">
              Customer Photo / Setup Picture (Optional)
            </span>
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <label className="btn-ghost text-xs cursor-pointer inline-flex items-center gap-2 border border-ink/20 px-3 py-2 bg-white">
                <LuUpload className="size-4 text-mint" />
                <span>{uploadingImage ? 'Uploading…' : 'Upload Setup Photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingImage}
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFileUpload(f);
                  }}
                />
              </label>
              <span className="text-xs text-ink-soft">or paste image URL:</span>
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://... or uploaded URL"
                className="field-input flex-1 text-xs"
              />
            </div>
            {photoUrl && (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={photoUrl}
                  alt="Review preview"
                  className="size-16 rounded-lg object-cover border border-ink/15"
                />
                <button
                  type="button"
                  onClick={() => setPhotoUrl('')}
                  className="text-xs text-danger hover:underline"
                >
                  Remove Photo
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-3 text-sm font-bold shadow-md"
          >
            {submitting ? 'Publishing Review…' : '+ Publish Review to Wall'}
          </button>
        </form>
      </div>

      {/* List of current reviews */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold text-ink">
            Current Published Reviews ({reviews.length})
          </h3>
          <button
            type="button"
            onClick={loadData}
            className="text-xs font-bold text-mint hover:underline"
          >
            Refresh List
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-ink-soft animate-pulse">Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-ink/15 p-8 text-center bg-white">
            <p className="text-sm font-bold text-ink">No reviews published yet.</p>
            <p className="mt-1 text-xs text-ink-soft">
              Use the form above to post customer feedback with photos!
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="flex flex-col justify-between rounded-xl border border-ink/15 bg-white p-4 shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1 text-sun">
                        {Array.from({ length: r.rating }).map((_, i) => (
                          <LuStar key={i} className="size-3.5 fill-sun text-sun" />
                        ))}
                      </div>
                      <h4 className="mt-1 font-bold text-sm text-ink">{r.name}</h4>
                      {(r.role || r.city) && (
                        <p className="text-xs text-ink-soft">
                          {[r.role, r.city].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    {r.tag && (
                      <span className="rounded-md bg-paper px-2 py-0.5 font-mono text-[11px] font-bold text-ink border border-ink/10">
                        {r.tag}
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-ink/90 italic">
                    "{r.note}"
                  </p>

                  {r.photoUrl && (
                    <div className="mt-3">
                      <img
                        src={r.photoUrl}
                        alt={`Setup by ${r.name}`}
                        className="h-28 w-full rounded-lg object-cover border border-ink/10"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-2 text-[11px] text-ink-soft">
                  <span>{new Date(r.createdAt).toLocaleDateString('en-IN')}</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id)}
                    className="inline-flex items-center gap-1 text-danger hover:underline font-bold"
                  >
                    <LuTrash2 className="size-3.5" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
