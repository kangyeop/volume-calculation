import { db } from '@/lib/db';
import { estimates } from '@/lib/db/schema';
import { eq, desc, and, ilike } from 'drizzle-orm';
import { getUserId } from '@/lib/auth';
import { createSupabaseAdmin } from '@/lib/supabase/server';

const BUCKET = 'estimates';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const SIGNED_URL_TTL = 300;
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2D];

function escapeLikePattern(s: string): string {
  return s.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

let bucketInitialized = false;

async function ensureBucket() {
  if (bucketInitialized) return;
  const admin = createSupabaseAdmin();
  const { data } = await admin.storage.getBucket(BUCKET);
  if (!data) {
    await admin.storage.createBucket(BUCKET, { public: false });
  }
  bucketInitialized = true;
}

function validatePdfFile(file: File, buffer: ArrayBuffer) {
  if (file.type !== 'application/pdf') {
    throw new Error('PDF 파일만 업로드할 수 있습니다.');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('파일 크기는 10MB를 초과할 수 없습니다.');
  }

  const header = new Uint8Array(buffer.slice(0, 5));
  const isValidPdf = PDF_MAGIC.every((byte, i) => header[i] === byte);
  if (!isValidPdf) {
    throw new Error('유효한 PDF 파일이 아닙니다.');
  }
}

export async function findAll(search?: string) {
  const userId = await getUserId();

  const conditions = [eq(estimates.userId, userId)];
  if (search) {
    conditions.push(ilike(estimates.name, `%${escapeLikePattern(search)}%`));
  }

  return db
    .select()
    .from(estimates)
    .where(and(...conditions))
    .orderBy(desc(estimates.createdAt));
}

export async function create(name: string, file: File) {
  const buffer = await file.arrayBuffer();
  validatePdfFile(file, buffer);

  const userId = await getUserId();
  await ensureBucket();

  const fileId = crypto.randomUUID();
  const storagePath = `${userId}/${fileId}.pdf`;

  const admin = createSupabaseAdmin();
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (uploadError) {
    console.error('[estimates] Upload failed:', uploadError.message);
    throw new Error('파일 업로드에 실패했습니다.');
  }

  try {
    const [estimate] = await db
      .insert(estimates)
      .values({
        userId,
        name,
        fileName: file.name,
        storagePath,
        fileSize: file.size,
      })
      .returning();

    return estimate;
  } catch (dbError) {
    await admin.storage.from(BUCKET).remove([storagePath]);
    throw dbError;
  }
}

export async function remove(id: string) {
  const userId = await getUserId();

  const [row] = await db
    .delete(estimates)
    .where(and(eq(estimates.id, id), eq(estimates.userId, userId)))
    .returning();

  if (!row) return null;

  try {
    const admin = createSupabaseAdmin();
    await admin.storage.from(BUCKET).remove([row.storagePath]);
  } catch (err) {
    console.error('[estimates] Storage delete failed:', row.storagePath, err);
  }

  return row;
}

export async function getSignedUrl(id: string) {
  const userId = await getUserId();

  const row = await db.query.estimates.findFirst({
    where: and(eq(estimates.id, id), eq(estimates.userId, userId)),
  });

  if (!row) return null;

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(row.storagePath, SIGNED_URL_TTL, {
      download: false,
    });

  if (error) {
    console.error('[estimates] Signed URL failed:', error.message);
    throw new Error('Signed URL 생성에 실패했습니다.');
  }

  return { url: data.signedUrl, estimate: row };
}
