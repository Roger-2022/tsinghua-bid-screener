import { supabase, isSupabaseConfigured } from './supabaseClient';

const BUCKET = 'resumes';

/**
 * Upload resume file to Supabase Storage.
 * Returns the public URL on success, null on failure.
 */
export async function uploadResume(file: File, candidateName: string): Promise<{ url: string; fileName: string } | null> {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn('[Resume] Supabase not configured');
    return null;
  }

  const ext = file.name.split('.').pop() || 'pdf';
  const safeName = candidateName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
  const path = `${safeName}_${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    console.error('[Resume] Upload failed:', error.message);
    return null;
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: urlData.publicUrl, fileName: file.name };
}
