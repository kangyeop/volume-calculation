import { db } from '@/lib/db';
import { outboundBatches, outboundItems, orders, packingResults, packingResultDetails } from '@/lib/db/schema';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { format } from 'date-fns';

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

export async function create(name: string) {
  const [batch] = await db.insert(outboundBatches).values({ name }).returning();
  return batch;
}

export async function generateBatchName(filename: string) {
  const today = format(new Date(), 'yyyyMMdd');
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const [result] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(outboundBatches)
    .where(
      and(
        gte(outboundBatches.createdAt, startOfDay),
        lte(outboundBatches.createdAt, endOfDay),
      ),
    );

  const count = Number(result.count);
  const cleanFilename = filename.replace(/\.[^/.]+$/, '');
  return `${today}-${count + 1}-${cleanFilename}`;
}

export async function deleteBatch(id: string) {
  const batch = await db.query.outboundBatches.findFirst({
    where: eq(outboundBatches.id, id),
  });
  if (!batch) throw new Error(`OutboundBatch ${id} not found`);

  await db.transaction(async (tx) => {
    await tx.delete(packingResultDetails).where(eq(packingResultDetails.outboundBatchId, id));
    await tx.delete(packingResults).where(eq(packingResults.outboundBatchId, id));
    await tx.delete(outboundItems).where(eq(outboundItems.outboundBatchId, id));
    await tx.delete(orders).where(eq(orders.outboundBatchId, id));
    await tx.delete(outboundBatches).where(eq(outboundBatches.id, id));
  });
}
