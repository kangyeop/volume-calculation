import { db } from '@/lib/db';
import {
  globalOrderItems,
  globalPackingMixedPallets,
  globalPackingResults,
  globalProducts,
} from '@/lib/db/schema';
import { eq, and, inArray, sum, asc, desc } from 'drizzle-orm';
import { assertOwnership } from '@/lib/services/global-shipment';
import { calculatePalletization } from '@/lib/algorithms/pallet';
import {
  packMixedPallets,
  type LeftoverCarton,
  type MixedPallet,
  type PlacedCarton,
} from '@/lib/algorithms/mixed-pallet';

const CHUNK_SIZE = 500;

export type GlobalPackingResultRow = typeof globalPackingResults.$inferSelect & {
  width: number | null;
  length: number | null;
  height: number | null;
  fullPalletCount: number;
  soloPalletCount: number;
  lastPalletInMixed: boolean;
};

export type GlobalMixedPalletRow = typeof globalPackingMixedPallets.$inferSelect;

export type GlobalPackingCalculateResult = {
  totalPallets: number;
  mixedPalletCount: number;
  unpackableSkus: GlobalPackingResultRow[];
  unmatched: string[];
  rows: GlobalPackingResultRow[];
  mixedPallets: GlobalMixedPalletRow[];
};

function computeFullPalletCount(row: {
  unpackable: boolean;
  palletCount: number;
  cartonsPerPallet: number;
  lastPalletCartons: number;
}): number {
  if (row.unpackable) return 0;
  if (row.palletCount === 0) return 0;
  const lastPalletIsFull =
    row.lastPalletCartons === row.cartonsPerPallet && row.cartonsPerPallet > 0;
  return lastPalletIsFull ? row.palletCount : Math.max(0, row.palletCount - 1);
}

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

  const lotRows = await db
    .select({
      sku: globalOrderItems.sku,
      lotNumber: globalOrderItems.lotNumber,
      expirationDate: globalOrderItems.expirationDate,
      quantity: sum(globalOrderItems.quantity).mapWith(Number),
    })
    .from(globalOrderItems)
    .where(eq(globalOrderItems.globalShipmentId, globalShipmentId))
    .groupBy(
      globalOrderItems.sku,
      globalOrderItems.lotNumber,
      globalOrderItems.expirationDate,
    );

  const lotsBySku = new Map<
    string,
    Array<{ lotNumber: string | null; expirationDate: string | null; quantity: number }>
  >();
  for (const r of lotRows) {
    const list = lotsBySku.get(r.sku) ?? [];
    list.push({
      lotNumber: r.lotNumber,
      expirationDate: r.expirationDate,
      quantity: r.quantity,
    });
    lotsBySku.set(r.sku, list);
  }
  for (const list of lotsBySku.values()) {
    list.sort((a, b) => {
      const ae = a.expirationDate ?? '';
      const be = b.expirationDate ?? '';
      if (ae !== be) return ae < be ? -1 : 1;
      return (a.lotNumber ?? '').localeCompare(b.lotNumber ?? '');
    });
  }

  if (aggregated.length === 0) {
    await db.transaction(async (tx) => {
      await tx
        .delete(globalPackingMixedPallets)
        .where(eq(globalPackingMixedPallets.globalShipmentId, globalShipmentId));
      await tx
        .delete(globalPackingResults)
        .where(eq(globalPackingResults.globalShipmentId, globalShipmentId));
    });
    return {
      totalPallets: 0,
      mixedPalletCount: 0,
      unpackableSkus: [],
      unmatched: [],
      rows: [],
      mixedPallets: [],
    };
  }

  const skuList = aggregated.map((a) => a.sku);

  const matchedProducts = await db
    .select()
    .from(globalProducts)
    .where(and(eq(globalProducts.userId, userId), inArray(globalProducts.sku, skuList)));

  const productBySku = new Map(matchedProducts.map((p) => [p.sku, p]));

  const unmatched: string[] = [];
  const inserts: (typeof globalPackingResults.$inferInsert)[] = [];
  const leftovers: LeftoverCarton[] = [];

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
      lots: lotsBySku.get(sku) ?? [],
    });

    if (
      !result.unpackable &&
      result.lastPalletCartons > 0 &&
      !result.lastPalletIsFull &&
      result.palletCount > 0
    ) {
      leftovers.push({
        sku,
        productName: product.name,
        w: Number(product.width),
        l: Number(product.length),
        h: Number(product.height),
        count: result.lastPalletCartons,
      });
    }
  }

  const mixedResult = packMixedPallets(leftovers);

  const trueMixedPallets: MixedPallet[] = [];
  const reclaimedSkus = new Set<string>();
  for (const p of mixedResult.pallets) {
    const distinctSkus = new Set(p.items.map((i) => i.sku));
    if (distinctSkus.size <= 1) {
      const only = [...distinctSkus][0];
      if (only !== undefined) reclaimedSkus.add(only);
    } else {
      trueMixedPallets.push(p);
    }
  }

  const { rows, mixedPallets } = await db.transaction(async (tx) => {
    await tx
      .delete(globalPackingMixedPallets)
      .where(eq(globalPackingMixedPallets.globalShipmentId, globalShipmentId));
    await tx
      .delete(globalPackingResults)
      .where(eq(globalPackingResults.globalShipmentId, globalShipmentId));

    const saved: GlobalPackingResultRow[] = [];
    if (inserts.length > 0) {
      for (let i = 0; i < inserts.length; i += CHUNK_SIZE) {
        const chunk = inserts.slice(i, i + CHUNK_SIZE);
        const inserted = await tx.insert(globalPackingResults).values(chunk).returning();
        for (const row of inserted) {
          const product = row.sku ? productBySku.get(row.sku) : undefined;
          const fullPalletCount = computeFullPalletCount(row);
          const lastPalletIsFull =
            row.lastPalletCartons === row.cartonsPerPallet && row.cartonsPerPallet > 0;
          const leftoverExists =
            !row.unpackable &&
            row.lastPalletCartons > 0 &&
            !lastPalletIsFull &&
            row.palletCount > 0;
          const lastPalletInMixed = leftoverExists && !reclaimedSkus.has(row.sku);
          const soloPalletCount = row.unpackable
            ? 0
            : lastPalletInMixed
              ? fullPalletCount
              : row.palletCount;
          saved.push({
            ...row,
            width: product ? Number(product.width) : null,
            length: product ? Number(product.length) : null,
            height: product ? Number(product.height) : null,
            fullPalletCount,
            soloPalletCount,
            lastPalletInMixed,
          });
        }
      }
    }

    const mixedInserts: (typeof globalPackingMixedPallets.$inferInsert)[] =
      trueMixedPallets.map((p, idx) => ({
        globalShipmentId,
        palletIndex: idx + 1,
        items: p.items,
      }));

    const savedMixed: GlobalMixedPalletRow[] = [];
    if (mixedInserts.length > 0) {
      for (let i = 0; i < mixedInserts.length; i += CHUNK_SIZE) {
        const chunk = mixedInserts.slice(i, i + CHUNK_SIZE);
        const inserted = await tx
          .insert(globalPackingMixedPallets)
          .values(chunk)
          .returning();
        savedMixed.push(...inserted);
      }
    }

    return { rows: saved, mixedPallets: savedMixed };
  });

  const totalPallets =
    rows.reduce((acc, r) => acc + r.soloPalletCount, 0) + mixedPallets.length;
  const unpackableSkus = rows.filter((r) => r.unpackable);

  return {
    totalPallets,
    mixedPalletCount: mixedPallets.length,
    unpackableSkus,
    unmatched,
    rows,
    mixedPallets,
  };
}

export async function getRecommendation(
  globalShipmentId: string,
): Promise<GlobalPackingCalculateResult> {
  await assertOwnership(globalShipmentId);

  const joined = await db
    .select({
      result: globalPackingResults,
      width: globalProducts.width,
      length: globalProducts.length,
      height: globalProducts.height,
    })
    .from(globalPackingResults)
    .leftJoin(globalProducts, eq(globalPackingResults.globalProductId, globalProducts.id))
    .where(eq(globalPackingResults.globalShipmentId, globalShipmentId))
    .orderBy(desc(globalPackingResults.palletCount), asc(globalPackingResults.sku));

  const mixedPallets = await db
    .select()
    .from(globalPackingMixedPallets)
    .where(eq(globalPackingMixedPallets.globalShipmentId, globalShipmentId))
    .orderBy(asc(globalPackingMixedPallets.palletIndex));

  const mixedSkuSet = new Set<string>();
  for (const p of mixedPallets) {
    const items = (p.items ?? []) as PlacedCarton[];
    for (const it of items) mixedSkuSet.add(it.sku);
  }

  const rows: GlobalPackingResultRow[] = joined.map((r) => {
    const row = r.result;
    const fullPalletCount = computeFullPalletCount(row);
    const lastPalletIsFull =
      row.lastPalletCartons === row.cartonsPerPallet && row.cartonsPerPallet > 0;
    const leftoverExists =
      !row.unpackable &&
      row.lastPalletCartons > 0 &&
      !lastPalletIsFull &&
      row.palletCount > 0;
    const lastPalletInMixed = leftoverExists && mixedSkuSet.has(row.sku);
    const soloPalletCount = row.unpackable
      ? 0
      : lastPalletInMixed
        ? fullPalletCount
        : row.palletCount;
    return {
      ...row,
      width: r.width != null ? Number(r.width) : null,
      length: r.length != null ? Number(r.length) : null,
      height: r.height != null ? Number(r.height) : null,
      fullPalletCount,
      soloPalletCount,
      lastPalletInMixed,
    };
  });

  const totalPallets =
    rows.reduce((acc, r) => acc + r.soloPalletCount, 0) + mixedPallets.length;
  const unpackableSkus = rows.filter((r) => r.unpackable);

  return {
    totalPallets,
    mixedPalletCount: mixedPallets.length,
    unpackableSkus,
    unmatched: [],
    rows,
    mixedPallets,
  };
}

export type { PlacedCarton };
