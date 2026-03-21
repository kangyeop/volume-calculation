import { db } from '@/lib/db';
import { outboundBatches, packingResults } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { DashboardStats } from '@/types';

export async function getStats(): Promise<DashboardStats> {
  const batches = await db
    .select({
      batchId: outboundBatches.id,
      batchName: outboundBatches.name,
      boxCount: sql<string>`COUNT(${packingResults.id})`,
      lastCalculatedAt: sql<string>`MAX(${packingResults.createdAt})`,
    })
    .from(outboundBatches)
    .leftJoin(packingResults, eq(packingResults.outboundBatchId, outboundBatches.id))
    .groupBy(outboundBatches.id, outboundBatches.name)
    .orderBy(outboundBatches.createdAt);

  return {
    totalBatches: batches.length,
    totalBoxesUsed: batches.reduce((sum, b) => sum + Number(b.boxCount), 0),
    batches: batches.map((b) => ({
      batchId: b.batchId,
      batchName: b.batchName,
      boxCount: Number(b.boxCount),
      lastCalculatedAt: b.lastCalculatedAt ?? '',
    })),
  };
}
