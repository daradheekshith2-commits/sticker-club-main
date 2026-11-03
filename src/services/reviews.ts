import { supabase } from '../lib/supabase';

export interface ReviewItem {
  id: string;
  name: string;
  city?: string | null;
  role?: string | null;
  rating: number;
  note: string;
  photoUrl?: string | null;
  tag?: string | null;
  createdAt: string;
}

const LOCAL_STORAGE_KEY = 'pixwora_customer_reviews';

function getLocalReviews(): ReviewItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalReviews(reviews: ReviewItem[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reviews));
  } catch {
    // Ignore storage quota errors
  }
}

export async function fetchReviews(): Promise<ReviewItem[]> {
  try {
    const { data, error } = await supabase
      .from('Review')
      .select('*')
      .order('createdAt', { ascending: false });

    if (!error && Array.isArray(data)) {
      saveLocalReviews(data as ReviewItem[]);
      return data as ReviewItem[];
    }
  } catch (err) {
    console.warn('Could not fetch reviews from Supabase, using local fallback:', err);
  }
  return getLocalReviews();
}

export async function addReview(payload: {
  name: string;
  city?: string;
  role?: string;
  rating: number;
  note: string;
  photoUrl?: string;
  tag?: string;
}): Promise<ReviewItem> {
  const newItem: ReviewItem = {
    id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: payload.name.trim(),
    city: payload.city?.trim() || null,
    role: payload.role?.trim() || null,
    rating: Math.max(1, Math.min(5, payload.rating || 5)),
    note: payload.note.trim(),
    photoUrl: payload.photoUrl?.trim() || null,
    tag: payload.tag?.trim() || 'Verified Customer',
    createdAt: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('Review')
      .insert([{
        id: newItem.id,
        name: newItem.name,
        city: newItem.city,
        role: newItem.role,
        rating: newItem.rating,
        note: newItem.note,
        photoUrl: newItem.photoUrl,
        tag: newItem.tag,
        createdAt: newItem.createdAt,
      }])
      .select()
      .single();

    if (!error && data) {
      const local = getLocalReviews();
      saveLocalReviews([data as ReviewItem, ...local.filter((r) => r.id !== data.id)]);
      return data as ReviewItem;
    }
  } catch (err) {
    console.warn('Supabase review insert failed, saving locally:', err);
  }

  const local = getLocalReviews();
  saveLocalReviews([newItem, ...local]);
  return newItem;
}

export async function deleteReview(id: string): Promise<boolean> {
  try {
    await supabase.from('Review').delete().eq('id', id);
  } catch (err) {
    console.warn('Could not delete from Supabase:', err);
  }
  const local = getLocalReviews().filter((r) => r.id !== id);
  saveLocalReviews(local);
  return true;
}
