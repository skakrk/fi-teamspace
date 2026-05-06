import { supabase } from './supabase';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml'];

export type UploadResult = { url: string } | { error: string };

/** Upload a file to a bucket under `${userId}/<filename>`, return public URL. */
export async function uploadImage(
  bucket: 'avatars' | 'project-logos',
  userId: string,
  file: File,
): Promise<UploadResult> {
  if (!ALLOWED.includes(file.type)) {
    return { error: `Unsupported file type: ${file.type || 'unknown'}. Use PNG, JPG, WebP, GIF or SVG.` };
  }
  if (file.size > MAX_BYTES) {
    return { error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB. Max 5 MB.` };
  }
  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
  // Stable filename so re-upload overwrites
  const path = `${userId}/${bucket === 'avatars' ? 'avatar' : 'logo'}-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    cacheControl: '3600',
    contentType: file.type,
  });
  if (upErr) return { error: upErr.message };
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl };
}
