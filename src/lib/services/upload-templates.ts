import { db } from '@/lib/db';
import { uploadTemplates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function findAll() {
  return db.select().from(uploadTemplates);
}

export async function deleteTemplate(id: string): Promise<void> {
  await db.delete(uploadTemplates).where(eq(uploadTemplates.id, id));
}
