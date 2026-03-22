import { db } from '@/lib/db';
import { productGroups } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function findAll() {
  return db.query.productGroups.findMany({ with: { products: true } });
}

export async function findOne(id: string) {
  return db.query.productGroups.findFirst({
    where: eq(productGroups.id, id),
    with: { products: true },
  });
}

export async function create(name: string, boxGroupId: string) {
  const [group] = await db.insert(productGroups).values({ name, boxGroupId }).returning();
  return group;
}

export async function update(id: string, data: { name?: string; boxGroupId?: string }) {
  const [group] = await db
    .update(productGroups)
    .set(data)
    .where(eq(productGroups.id, id))
    .returning();
  return group;
}

export async function deleteProductGroup(id: string) {
  await db.delete(productGroups).where(eq(productGroups.id, id));
}
