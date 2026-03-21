import { db } from '@/lib/db';
import { outboundBatches, outboundItems, orders, packingResults, packingResultDetails } from '@/lib/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export async function findAll() {
  return db
    .select({
      id: outboundBatches.id,
      name: outboundBatches.name,
      createdAt: outboundBatches.createdAt,
      updatedAt: outboundBatches.updatedAt,
    })
    .from(outboundBatches)
    .orderBy(desc(outboundBatches.createdAt));
}

export async function findOne(id: string) {
  return db.query.outboundBatches.findFirst({
    where: eq(outboundBatches.id, id),
    with: {
      orders: true,
      outboundItems: true,
      packingResults: true,
    },
  });
}

export async function generateBatchName(filename: string): Promise<string> {
  const now = new Date();
  const today = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const rows = await db
    .select({ id: outboundBatches.id })
    .from(outboundBatches)
    .where(and(gte(outboundBatches.createdAt, startOfDay), lte(outboundBatches.createdAt, endOfDay)));

  const count = rows.length;
  const cleanFilename = filename.replace(/\.[^/.]+$/, '');
  return `${today}-${count + 1}-${cleanFilename}`;
}

export async function create(name: string) {
  const [batch] = await db.insert(outboundBatches).values({ name }).returning();
  return batch;
}

export async function remove(id: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(packingResultDetails).where(eq(packingResultDetails.outboundBatchId, id));
    await tx.delete(packingResults).where(eq(packingResults.outboundBatchId, id));
    await tx.delete(outboundItems).where(eq(outboundItems.outboundBatchId, id));
    await tx.delete(orders).where(eq(orders.outboundBatchId, id));
    await tx.delete(outboundBatches).where(eq(outboundBatches.id, id));
  });
}
