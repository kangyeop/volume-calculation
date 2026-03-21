import { db } from '@/lib/db';
import { boxGroups } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function findAll() {
  return db.query.boxGroups.findMany({ with: { boxes: true } });
}

export async function findOne(id: string) {
  return db.query.boxGroups.findFirst({
    where: eq(boxGroups.id, id),
    with: { boxes: true },
  });
}

export async function create(name: string) {
  const [group] = await db.insert(boxGroups).values({ name }).returning();
  return group;
}

export async function deleteBoxGroup(id: string) {
  await db.delete(boxGroups).where(eq(boxGroups.id, id));
}
