import { db } from '@/lib/db';
import { shipments, orders, orderItems, packingResults, products, productGroups } from '@/lib/db/schema';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { getUserId } from '@/lib/auth';
import { parseExcelFile } from '@/lib/services/excel';
import { parseAdjustment } from '@/lib/services/format-parser';
import { calculatePacking } from '@/lib/algorithms/packing';
import { buildPackingResultItems, buildPackingResultRowStats } from '@/lib/services/packing';
import * as shipmentService from '@/lib/services/shipment';
import * as boxesService from '@/lib/services/boxes';
import type { SKU, PackingResultItem } from '@/types';

export async function uploadSettlement(
  buffer: Buffer,
  originalName: string,
): Promise<{ imported: number; unmatched: number; shipmentId: string; shipmentName: string }> {
  const parseResult = parseExcelFile(buffer, originalName);
  const items = parseAdjustment(parseResult.rows);

  const uniqueOrderIds = [...new Set(items.map((i) => i.orderId))];
  if (uniqueOrderIds.length === 0) {
    throw new Error('업로드된 파일에서 유효한 주문을 찾을 수 없습니다.');
  }
  const userId = await getUserId();

  const uniqueSkus = [...new Set(items.map((i) => i.sku))];
  const userProducts =
    uniqueSkus.length > 0
      ? await db.select().from(products).where(and(eq(products.userId, userId), inArray(products.sku, uniqueSkus)))
      : [];
  const productSkuSet = new Set(userProducts.map((p) => p.sku));

  const existingOrders = await db
    .select({
      orderId: orders.orderId,
      orderUuid: orders.id,
      shipmentId: orders.shipmentId,
      shipmentCreatedAt: shipments.createdAt,
    })
    .from(orders)
    .innerJoin(shipments, eq(orders.shipmentId, shipments.id))
    .where(
      and(
        inArray(orders.orderId, uniqueOrderIds),
        eq(shipments.userId, userId),
        eq(shipments.type, 'SHIPMENT'),
        eq(shipments.status, 'CONFIRMED'),
      ),
    )
    .orderBy(desc(shipments.createdAt));

  const matchedOrderMap = new Map<string, { orderUuid: string }>();
  for (const row of existingOrders) {
    if (!matchedOrderMap.has(row.orderId)) {
      matchedOrderMap.set(row.orderId, { orderUuid: row.orderUuid });
    }
  }

  const matchedUuids = [...matchedOrderMap.values()].map((v) => v.orderUuid);
  const existingPackingResults =
    matchedUuids.length > 0
      ? await db.select().from(packingResults).where(inArray(packingResults.orderId, matchedUuids))
      : [];
  const packingResultMap = new Map(existingPackingResults.map((pr) => [pr.orderId, pr]));

  const shipmentName = await shipmentService.generateBatchName(originalName, 'SETTLEMENT');
  const settlementShipment = await shipmentService.create(shipmentName, 'SETTLEMENT');

  const orderItemsMap = new Map<string, { sku: string; quantity: number }[]>();
  for (const item of items) {
    if (!orderItemsMap.has(item.orderId)) orderItemsMap.set(item.orderId, []);
    orderItemsMap.get(item.orderId)!.push({ sku: item.sku, quantity: item.quantity });
  }

  const validEntries: Array<{
    userOrderId: string;
    orderItemsList: { sku: string; quantity: number }[];
    status: 'COMPLETED' | 'PENDING';
    existingPR: (typeof existingPackingResults)[number] | undefined;
  }> = [];

  for (const [userOrderId, orderItemsList] of orderItemsMap) {
    const matched = matchedOrderMap.get(userOrderId);
    const existingPR = matched ? packingResultMap.get(matched.orderUuid) : undefined;

    if (!matched) {
      const allSkusExist = orderItemsList.every((item) => productSkuSet.has(item.sku));
      if (!allSkusExist) continue;
    }

    validEntries.push({
      userOrderId,
      orderItemsList,
      status: matched ? 'COMPLETED' : 'PENDING',
      existingPR,
    });
  }

  if (validEntries.length > 0) {
    await db.transaction(async (tx) => {
      const insertedOrders = await tx
        .insert(orders)
        .values(
          validEntries.map((e) => ({
            shipmentId: settlementShipment.id,
            orderId: e.userOrderId,
            status: e.status,
          })),
        )
        .returning();

      const allOrderItems: {
        shipmentId: string;
        orderId: string;
        orderIdentifier: string;
        sku: string;
        quantity: number;
        productId: null;
      }[] = [];

      const allPackingResults: {
        shipmentId: string;
        orderId: string;
        boxId: string | null;
        packedCount: number;
        efficiency: string;
        totalCBM: string;
        groupLabel: string | null;
        groupIndex: number | null;
        boxNumber: number | null;
        items: PackingResultItem[];
      }[] = [];

      for (let i = 0; i < validEntries.length; i++) {
        const entry = validEntries[i];
        const newOrder = insertedOrders[i];

        for (const item of entry.orderItemsList) {
          allOrderItems.push({
            shipmentId: settlementShipment.id,
            orderId: newOrder.id,
            orderIdentifier: entry.userOrderId,
            sku: item.sku,
            quantity: item.quantity,
            productId: null,
          });
        }

        const pr = entry.existingPR;
        allPackingResults.push({
          shipmentId: settlementShipment.id,
          orderId: newOrder.id,
          boxId: pr?.boxId ?? null,
          packedCount: pr?.packedCount ?? 0,
          efficiency: pr?.efficiency ?? '0',
          totalCBM: pr?.totalCBM ?? '0',
          groupLabel: pr?.groupLabel ?? null,
          groupIndex: pr?.groupIndex ?? null,
          boxNumber: pr?.boxNumber ?? null,
          items: pr?.items ?? [],
        });
      }

      if (allOrderItems.length > 0) {
        await tx.insert(orderItems).values(allOrderItems);
      }
      if (allPackingResults.length > 0) {
        await tx.insert(packingResults).values(allPackingResults);
      }
    });
  }

  const imported = uniqueOrderIds.length;
  const unmatched = uniqueOrderIds.filter((id) => !matchedOrderMap.has(id)).length;

  return {
    imported,
    unmatched,
    shipmentId: settlementShipment.id,
    shipmentName: settlementShipment.name,
  };
}

export async function findSettlementDetail(id: string) {
  const userId = await getUserId();
  const shipment = await db.query.shipments.findFirst({
    where: and(eq(shipments.id, id), eq(shipments.userId, userId), eq(shipments.type, 'SETTLEMENT')),
  });
  if (!shipment) throw new Error('Settlement not found');

  const orderRows = await db.select().from(orders).where(eq(orders.shipmentId, id));
  const prRows = await db.select().from(packingResults).where(eq(packingResults.shipmentId, id));
  const itemRows = await db.query.orderItems.findMany({
    where: eq(orderItems.shipmentId, id),
  });

  const prMap = new Map(prRows.map((pr) => [pr.orderId, pr]));

  const allSkus = [...new Set(itemRows.map((i) => i.sku))];
  const userProducts =
    allSkus.length > 0
      ? await db.select().from(products).where(and(eq(products.userId, userId), inArray(products.sku, allSkus)))
      : [];
  const productMap = new Map(userProducts.map((p) => [p.sku, p]));

  const itemsByOrderId = new Map<string, typeof itemRows>();
  for (const item of itemRows) {
    const arr = itemsByOrderId.get(item.orderId);
    if (arr) arr.push(item);
    else itemsByOrderId.set(item.orderId, [item]);
  }

  const orderDetails = orderRows.map((order) => {
    const pr = prMap.get(order.id);
    const orderItemRows = itemsByOrderId.get(order.id) ?? [];

    let barcodeCount = 0;
    let aircapCount = 0;
    for (const item of orderItemRows) {
      const p = productMap.get(item.sku);
      if (p?.barcode) barcodeCount += item.quantity;
      if (p?.aircap) aircapCount += item.quantity;
    }

    return {
      orderUuid: order.id,
      orderId: order.orderId,
      items: orderItemRows.map((i) => ({ sku: i.sku, quantity: i.quantity })),
      boxId: pr?.boxId ?? null,
      packingResultId: pr?.id ?? null,
      status: order.status as 'PENDING' | 'PROCESSING' | 'COMPLETED',
      barcodeCount,
      aircapCount,
    };
  });

  return {
    id: shipment.id,
    name: shipment.name,
    status: shipment.status,
    createdAt: shipment.createdAt,
    orders: orderDetails,
  };
}

export async function assertSettlement(id: string) {
  const userId = await getUserId();
  const shipment = await db.query.shipments.findFirst({
    where: and(eq(shipments.id, id), eq(shipments.userId, userId), eq(shipments.type, 'SETTLEMENT')),
  });
  if (!shipment) throw new Error('Settlement not found');
  return shipment;
}

export async function assignBox(settlementId: string, orderUuid: string, boxId: string) {
  const userId = await getUserId();
  const shipment = await db.query.shipments.findFirst({
    where: and(
      eq(shipments.id, settlementId),
      eq(shipments.userId, userId),
      eq(shipments.type, 'SETTLEMENT'),
    ),
  });
  if (!shipment) throw new Error('Settlement not found');

  const [updated] = await db
    .update(packingResults)
    .set({ boxId })
    .where(
      and(eq(packingResults.shipmentId, settlementId), eq(packingResults.orderId, orderUuid)),
    )
    .returning();

  if (!updated) throw new Error('해당 주문의 패킹 결과를 찾을 수 없습니다.');
  return updated;
}

export async function autoPackUnmatched(settlementId: string): Promise<{ packed: number; failed: number }> {
  await assertSettlement(settlementId);
  const userId = await getUserId();

  const pendingOrders = await db
    .select()
    .from(orders)
    .where(and(eq(orders.shipmentId, settlementId), eq(orders.status, 'PENDING')));

  if (pendingOrders.length === 0) return { packed: 0, failed: 0 };

  const pendingOrderIds = pendingOrders.map((o) => o.id);
  const itemRows = await db
    .select()
    .from(orderItems)
    .where(and(eq(orderItems.shipmentId, settlementId), inArray(orderItems.orderId, pendingOrderIds)));

  const allProducts = await db.select().from(products).where(eq(products.userId, userId));
  const productMapBySku = new Map(allProducts.map((p) => [p.sku, p]));
  const productMapById = new Map(allProducts.map((p) => [p.id, p]));

  const allProductGroups = await db.select().from(productGroups).where(eq(productGroups.userId, userId));
  const productGroupMap = new Map(allProductGroups.map((pg) => [pg.id, pg]));

  const boxGroupIds = [...new Set(allProductGroups.map((pg) => pg.boxGroupId))];
  const boxesByGroupId = await boxesService.findByGroupIds(boxGroupIds);

  const itemsByOrderId = new Map<string, typeof itemRows>();
  for (const item of itemRows) {
    const arr = itemsByOrderId.get(item.orderId);
    if (arr) arr.push(item);
    else itemsByOrderId.set(item.orderId, [item]);
  }

  const successResults: { orderId: string; result: NonNullable<ReturnType<typeof tryAutoPack>> }[] = [];
  let failed = 0;

  for (const order of pendingOrders) {
    const orderItemsList = (itemsByOrderId.get(order.id) ?? [])
      .map((i) => ({ sku: i.sku, quantity: i.quantity }));

    const result = tryAutoPack(orderItemsList, productMapBySku, productMapById, productGroupMap, boxesByGroupId);
    if (result) {
      successResults.push({ orderId: order.id, result });
    } else {
      failed++;
    }
  }

  if (successResults.length > 0) {
    await db.transaction(async (tx) => {
      await bulkUpdatePackingResults(tx, settlementId, successResults);
      await tx.update(orders)
        .set({ status: 'PROCESSING' })
        .where(inArray(orders.id, successResults.map((r) => r.orderId)));
    });
  }

  return { packed: successResults.length, failed };
}

export async function calculateSettlementPacking(
  settlementId: string,
  strategy: 'volume' | 'longest-side' = 'volume',
): Promise<{ packed: number; failed: number }> {
  const settlement = await assertSettlement(settlementId);
  if (settlement.status === 'CONFIRMED') {
    throw new Error('SHIPMENT_CONFIRMED');
  }
  const userId = await getUserId();

  const pendingOrders = await db
    .select()
    .from(orders)
    .where(and(eq(orders.shipmentId, settlementId), eq(orders.status, 'PENDING')));

  if (pendingOrders.length === 0) return { packed: 0, failed: 0 };

  const pendingOrderIds = pendingOrders.map((o) => o.id);
  const itemRows = await db
    .select()
    .from(orderItems)
    .where(and(eq(orderItems.shipmentId, settlementId), inArray(orderItems.orderId, pendingOrderIds)));

  const allProducts = await db.select().from(products).where(eq(products.userId, userId));
  const productMapBySku = new Map(allProducts.map((p) => [p.sku, p]));
  const productMapById = new Map(allProducts.map((p) => [p.id, p]));

  const allProductGroups = await db.select().from(productGroups).where(eq(productGroups.userId, userId));
  const productGroupMap = new Map(allProductGroups.map((pg) => [pg.id, pg]));

  const boxGroupIds = [...new Set(allProductGroups.map((pg) => pg.boxGroupId))];
  const boxesByGroupId = await boxesService.findByGroupIds(boxGroupIds);

  const itemsByOrderId = new Map<string, typeof itemRows>();
  for (const item of itemRows) {
    const arr = itemsByOrderId.get(item.orderId);
    if (arr) arr.push(item);
    else itemsByOrderId.set(item.orderId, [item]);
  }

  const successResults: { orderId: string; result: NonNullable<ReturnType<typeof tryAutoPack>> }[] = [];
  let failed = 0;

  for (const order of pendingOrders) {
    const orderItemsList = (itemsByOrderId.get(order.id) ?? [])
      .map((i) => ({ sku: i.sku, quantity: i.quantity }));

    const result = tryAutoPack(orderItemsList, productMapBySku, productMapById, productGroupMap, boxesByGroupId, strategy);
    if (result) {
      successResults.push({ orderId: order.id, result });
    } else {
      failed++;
    }
  }

  if (successResults.length > 0) {
    await db.transaction(async (tx) => {
      await bulkUpdatePackingResults(tx, settlementId, successResults);
      await tx.update(orders)
        .set({ status: 'PROCESSING' })
        .where(inArray(orders.id, successResults.map((r) => r.orderId)));
    });
  }

  return { packed: successResults.length, failed };
}

type ProductRow = typeof products.$inferSelect;

function tryAutoPack(
  orderItemsList: { sku: string; quantity: number }[],
  productMapBySku: Map<string, ProductRow>,
  productMapById: Map<string, ProductRow>,
  productGroupMap: Map<string, typeof productGroups.$inferSelect>,
  boxesByGroupId: Map<string, Awaited<ReturnType<typeof boxesService.findByGroupId>>>,
  strategy: 'volume' | 'longest-side' = 'volume',
) {
  const skus: SKU[] = [];
  let firstProduct: ProductRow | undefined;

  for (const item of orderItemsList) {
    const product = productMapBySku.get(item.sku);
    if (!product) return null;
    if (!firstProduct) firstProduct = product;
    skus.push({
      id: product.id,
      name: product.name,
      width: Number(product.width),
      length: Number(product.length),
      height: Number(product.height),
      quantity: item.quantity,
    });
  }

  if (skus.length === 0 || !firstProduct) return null;

  const pg = productGroupMap.get(firstProduct.productGroupId);
  if (!pg) return null;

  const availableBoxes = boxesByGroupId.get(pg.boxGroupId);
  if (!availableBoxes || availableBoxes.length === 0) return null;

  const recommendation = calculatePacking(skus, availableBoxes, strategy);
  if (recommendation.boxes.length === 0) return null;
  if (recommendation.boxes[0].box.id === 'unassigned') return null;

  const items = buildPackingResultItems(recommendation, productMapById);
  const rowStats = buildPackingResultRowStats(recommendation, productMapById);

  return { ...rowStats, items };
}

async function bulkUpdatePackingResults(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  shipmentId: string,
  results: { orderId: string; result: { boxId: string | null; packedCount: number; efficiency: string; totalCBM: string; items: PackingResultItem[] } }[],
) {
  if (results.length === 0) return;

  const BATCH_SIZE = 500;
  for (let i = 0; i < results.length; i += BATCH_SIZE) {
    const batch = results.slice(i, i + BATCH_SIZE);
    const orderIds = batch.map((r) => r.orderId);

    const boxIdCase = sql.join(
      batch.map((r) => sql`WHEN ${r.orderId} THEN ${r.result.boxId}`),
      sql` `,
    );
    const packedCountCase = sql.join(
      batch.map((r) => sql`WHEN ${r.orderId} THEN ${r.result.packedCount}`),
      sql` `,
    );
    const efficiencyCase = sql.join(
      batch.map((r) => sql`WHEN ${r.orderId} THEN ${r.result.efficiency}::numeric`),
      sql` `,
    );
    const totalCBMCase = sql.join(
      batch.map((r) => sql`WHEN ${r.orderId} THEN ${r.result.totalCBM}::numeric`),
      sql` `,
    );
    const itemsCase = sql.join(
      batch.map((r) => sql`WHEN ${r.orderId} THEN ${JSON.stringify(r.result.items)}::jsonb`),
      sql` `,
    );

    await tx.execute(sql`
      UPDATE packing_results
      SET box_id = CASE order_id ${boxIdCase} END,
          packed_count = CASE order_id ${packedCountCase} END,
          efficiency = CASE order_id ${efficiencyCase} END,
          total_cbm = CASE order_id ${totalCBMCase} END,
          items = CASE order_id ${itemsCase} END,
          updated_at = NOW()
      WHERE shipment_id = ${shipmentId}
        AND order_id IN ${sql`(${sql.join(orderIds.map((id) => sql`${id}`), sql`, `)})`}
    `);
  }
}
