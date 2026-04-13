import { db } from '@/lib/db';
import { globalProductGroups } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUserId } from '@/lib/auth';

export async function findAll() {
  const userId = await getUserId();
  return db.query.globalProductGroups.findMany({
    where: eq(globalProductGroups.userId, userId),
    with: { products: true },
  });
}

export async function findOne(id: string) {
  const userId = await getUserId();
  return db.query.globalProductGroups.findFirst({
    where: and(eq(globalProductGroups.id, id), eq(globalProductGroups.userId, userId)),
    with: { products: true },
  });
}

export async function create(name: string) {
  const userId = await getUserId();
  const [group] = await db.insert(globalProductGroups).values({ name, userId }).returning();
  return group;
}

export async function update(id: string, data: { name?: string }) {
  const userId = await getUserId();
  const [group] = await db
    .update(globalProductGroups)
    .set(data)
    .where(and(eq(globalProductGroups.id, id), eq(globalProductGroups.userId, userId)))
    .returning();
  return group;
}

export async function deleteGlobalProductGroup(id: string) {
  const userId = await getUserId();
  await db
    .delete(globalProductGroups)
    .where(and(eq(globalProductGroups.id, id), eq(globalProductGroups.userId, userId)));
}
