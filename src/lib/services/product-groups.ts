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

export async function create(name: string) {
  const [group] = await db.insert(productGroups).values({ name }).returning();
  return group;
}

export async function deleteProductGroup(id: string) {
  await db.delete(productGroups).where(eq(productGroups.id, id));
}
