import { db } from '@/lib/db';
import { uploadSessions } from '@/lib/db/schema';
import { eq, lt } from 'drizzle-orm';

interface SessionData {
  rows: Record<string, unknown>[];
  headers: string[];
  fileName: string;
}

const TTL_MS = 30 * 60 * 1000;

export async function store(sessionId: string, data: SessionData): Promise<void> {
  const expiresAt = new Date(Date.now() + TTL_MS);
  await db
    .insert(uploadSessions)
    .values({ id: sessionId, data, expiresAt })
    .onConflictDoUpdate({
      target: uploadSessions.id,
      set: { data, expiresAt },
    });
}

export async function retrieve(sessionId: string): Promise<SessionData | null> {
  const row = await db.query.uploadSessions.findFirst({
    where: eq(uploadSessions.id, sessionId),
  });
  if (!row) return null;
  if (row.expiresAt < new Date()) {
    await db.delete(uploadSessions).where(eq(uploadSessions.id, sessionId));
    return null;
  }
  return row.data as SessionData;
}

export async function remove(sessionId: string): Promise<void> {
  await db.delete(uploadSessions).where(eq(uploadSessions.id, sessionId));
}

export async function cleanup(): Promise<void> {
  await db.delete(uploadSessions).where(lt(uploadSessions.expiresAt, new Date()));
}
