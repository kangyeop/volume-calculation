import { db } from '@/lib/db';
import { shipments, packingResults } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { DashboardStats } from '@/types';
import { getUserId } from '@/lib/auth';

export async function getStats(): Promise<DashboardStats> {
  const userId = await getUserId();
  const batches = await db
    .select({
      batchId: shipments.id,
      batchName: shipments.name,
      boxCount: sql<string>`COUNT(${packingResults.id})`,
      lastCalculatedAt: sql<string>`MAX(${packingResults.createdAt})`,
    })
    .from(shipments)
    .leftJoin(packingResults, eq(packingResults.shipmentId, shipments.id))
    .where(eq(shipments.userId, userId))
    .groupBy(shipments.id, shipments.name)
    .orderBy(shipments.createdAt);

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
