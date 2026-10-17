import { supabase } from './supabase.js';

const BUCKET = 'announcement-attachments';

// Public file URL -> path inside the bucket (null when the URL is not one of ours).
export function storagePathFromUrl(url) {
  try {
    const parts = new URL(url).pathname.split(`/${BUCKET}/`);
    return parts[1] ? decodeURIComponent(parts[1]) : null;
  } catch {
    return null;
  }
}

// Best-effort cleanup of a replaced or removed voice file. A failure here must never
// block saving or deleting the announcement itself.
export async function removeVoiceFile(url) {
  const path = url ? storagePathFromUrl(url) : null;
  if (!path) return;
  try { await supabase.storage.from(BUCKET).remove([path]); } catch { /* ignore */ }
}
