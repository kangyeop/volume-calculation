import { db } from '@/lib/db';
import { globalOrderItems, globalPackingResults, globalProducts } from '@/lib/db/schema';
import { eq, and, inArray, sum, asc, desc } from 'drizzle-orm';
import { assertOwnership } from '@/lib/services/global-shipment';
import { calculatePalletization } from '@/lib/algorithms/pallet';

const CHUNK_SIZE = 500;

export type GlobalPackingResultRow = typeof globalPackingResults.$inferSelect;

export type GlobalPackingCalculateResult = {
  totalPallets: number;
  unpackableSkus: GlobalPackingResultRow[];
  unmatched: string[];
  rows: GlobalPackingResultRow[];
};

export async function calculate(
  userId: string,
  globalShipmentId: string,
): Promise<GlobalPackingCalculateResult> {
  await assertOwnership(globalShipmentId);

  const aggregated = await db
    .select({
      sku: globalOrderItems.sku,
      totalUnits: sum(globalOrderItems.quantity).mapWith(Number),
    })
    .from(globalOrderItems)
    .where(eq(globalOrderItems.globalShipmentId, globalShipmentId))
    .groupBy(globalOrderItems.sku);

  if (aggregated.length === 0) {
    await db
      .delete(globalPackingResults)
      .where(eq(globalPackingResults.globalShipmentId, globalShipmentId));
    return { totalPallets: 0, unpackableSkus: [], unmatched: [], rows: [] };
  }

  const skuList = aggregated.map((a) => a.sku);

  const matchedProducts = await db
    .select()
    .from(globalProducts)
    .where(and(eq(globalProducts.userId, userId), inArray(globalProducts.sku, skuList)));

  const productBySku = new Map(matchedProducts.map((p) => [p.sku, p]));

  const unmatched: string[] = [];
  const inserts: (typeof globalPackingResults.$inferInsert)[] = [];

  for (const { sku, totalUnits } of aggregated) {
    const product = productBySku.get(sku);
    if (!product) {
      unmatched.push(sku);
      continue;
    }

    const result = calculatePalletization(
      {
        width: Number(product.width),
        length: Number(product.length),
        height: Number(product.height),
        innerQuantity: product.innerQuantity,
      },
      totalUnits,
    );

    inserts.push({
      globalShipmentId,
      sku,
      productName: product.name,
      globalProductId: product.id,
      totalUnits,
      innerQuantity: product.innerQuantity,
      cartonCount: result.cartonCount,
      itemsPerLayer: result.itemsPerLayer,
      layersPerPallet: result.layersPerPallet,
      cartonsPerPallet: result.cartonsPerPallet,
      palletCount: result.palletCount,
      lastPalletCartons: result.lastPalletCartons,
      unpackable: result.unpackable,
    });
  }

  const rows = await db.transaction(async (tx) => {
    await tx
      .delete(globalPackingResults)
      .where(eq(globalPackingResults.globalShipmentId, globalShipmentId));

    if (inserts.length === 0) return [] as GlobalPackingResultRow[];

    const saved: GlobalPackingResultRow[] = [];
    for (let i = 0; i < inserts.length; i += CHUNK_SIZE) {
      const chunk = inserts.slice(i, i + CHUNK_SIZE);
      const inserted = await tx.insert(globalPackingResults).values(chunk).returning();
      saved.push(...inserted);
    }
    return saved;
  });

  const totalPallets = rows.reduce((acc, r) => acc + (r.unpackable ? 0 : r.palletCount), 0);
  const unpackableSkus = rows.filter((r) => r.unpackable);

  return { totalPallets, unpackableSkus, unmatched, rows };
}

export async function getRecommendation(
  globalShipmentId: string,
): Promise<GlobalPackingResultRow[]> {
  await assertOwnership(globalShipmentId);
  return db
    .select()
    .from(globalPackingResults)
    .where(eq(globalPackingResults.globalShipmentId, globalShipmentId))
    .orderBy(desc(globalPackingResults.palletCount), asc(globalPackingResults.sku));
}
