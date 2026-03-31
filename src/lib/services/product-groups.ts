import { db } from '@/lib/db';
import { productGroups } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUserId } from '@/lib/auth';

export async function findAll() {
  const userId = await getUserId();
  return db.query.productGroups.findMany({ where: eq(productGroups.userId, userId), with: { products: true } });
}

export async function findOne(id: string) {
  const userId = await getUserId();
  return db.query.productGroups.findFirst({
    where: and(eq(productGroups.id, id), eq(productGroups.userId, userId)),
    with: { products: true },
  });
}

export async function create(name: string, boxGroupId: string) {
  const userId = await getUserId();
  const [group] = await db.insert(productGroups).values({ name, boxGroupId, userId }).returning();
  return group;
}

export async function update(id: string, data: { name?: string; boxGroupId?: string }) {
  const userId = await getUserId();
  const [group] = await db
    .update(productGroups)
    .set(data)
    .where(and(eq(productGroups.id, id), eq(productGroups.userId, userId)))
    .returning();
  return group;
}

export async function deleteProductGroup(id: string) {
  const userId = await getUserId();
  await db.delete(productGroups).where(and(eq(productGroups.id, id), eq(productGroups.userId, userId)));
}
