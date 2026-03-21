import { createSupabaseAdmin } from '@/lib/supabase/server';

const UPLOAD_BUCKET = 'uploads';
const EXPORT_BUCKET = 'exports';

export async function uploadFile(buffer: Buffer, path: string, contentType?: string): Promise<string> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.storage.from(UPLOAD_BUCKET).upload(path, buffer, { contentType, upsert: true });
  if (error) throw error;
  return path;
}

export async function downloadFile(path: string): Promise<Buffer> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.storage.from(UPLOAD_BUCKET).download(path);
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}

export async function deleteFile(path: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.storage.from(UPLOAD_BUCKET).remove([path]);
  if (error) throw error;
}

export async function getSignedUploadUrl(path: string): Promise<string> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.storage.from(UPLOAD_BUCKET).createSignedUploadUrl(path);
  if (error) throw error;
  return data.signedUrl;
}

export async function getSignedDownloadUrl(path: string, bucket = EXPORT_BUCKET, expiresIn = 3600): Promise<string> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function uploadExport(buffer: Buffer, path: string): Promise<string> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.storage.from(EXPORT_BUCKET).upload(path, buffer, {
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    upsert: true,
  });
  if (error) throw error;
  const { data } = await supabase.storage.from(EXPORT_BUCKET).createSignedUrl(path, 3600);
  return data!.signedUrl;
}
