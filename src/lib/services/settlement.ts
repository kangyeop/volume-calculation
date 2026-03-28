import { db } from '@/lib/db';
import { shipments, orders, orderItems, packingResults, products, productGroups } from '@/lib/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { getUserId } from '@/lib/auth';
import { parseExcelFile } from '@/lib/services/excel';
import { parseAdjustment } from '@/lib/services/format-parser';
import { calculatePacking } from '@/lib/algorithms/packing';
import { buildPackingResultItems, buildPackingResultRowStats } from '@/lib/services/packing';
import * as shipmentService from '@/lib/services/shipment';
import * as boxesService from '@/lib/services/boxes';
import type { SKU } from '@/types';

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

  const allUserProducts = await db.select().from(products).where(eq(products.userId, userId));
  const productSkuSet = new Set(allUserProducts.map((p) => p.sku));

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

  await db.transaction(async (tx) => {
    for (const [userOrderId, orderItemsList] of orderItemsMap) {
      const matched = matchedOrderMap.get(userOrderId);
      const existingPR = matched ? packingResultMap.get(matched.orderUuid) : undefined;

      if (!matched) {
        const allSkusExist = orderItemsList.every((item) => productSkuSet.has(item.sku));
        if (!allSkusExist) continue;
      }

      const orderStatus = matched ? 'COMPLETED' : 'PENDING';
      const [newOrder] = await tx
        .insert(orders)
        .values({ shipmentId: settlementShipment.id, orderId: userOrderId, status: orderStatus })
        .returning();

      await tx.insert(orderItems).values(
        orderItemsList.map((item) => ({
          shipmentId: settlementShipment.id,
          orderId: newOrder.id,
          orderIdentifier: userOrderId,
          sku: item.sku,
          quantity: item.quantity,
          productId: null,
        })),
      );

      if (matched) {
        await tx.insert(packingResults).values({
          shipmentId: settlementShipment.id,
          orderId: newOrder.id,
          boxId: existingPR?.boxId ?? null,
          packedCount: existingPR?.packedCount ?? 0,
          efficiency: existingPR?.efficiency ?? '0',
          totalCBM: existingPR?.totalCBM ?? '0',
          groupLabel: existingPR?.groupLabel ?? null,
          groupIndex: existingPR?.groupIndex ?? null,
          boxNumber: existingPR?.boxNumber ?? null,
          items: existingPR?.items ?? [],
        });
      } else {
        await tx.insert(packingResults).values({
          shipmentId: settlementShipment.id,
          orderId: newOrder.id,
          boxId: null,
          packedCount: 0,
          efficiency: '0',
          totalCBM: '0',
          groupLabel: null,
          groupIndex: null,
          boxNumber: null,
          items: [],
        });
      }
    }
  });

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

  const orderDetails = orderRows.map((order) => {
    const pr = prMap.get(order.id);
    const orderItemRows = itemRows.filter((i) => i.orderId === order.id);
    const status: 'matched' | 'matched_unassigned' | 'unmatched' | 'auto_packed' =
      order.status === 'PROCESSING'
        ? 'auto_packed'
        : order.status === 'COMPLETED' && pr?.boxId != null
          ? 'matched'
          : order.status === 'COMPLETED'
            ? 'matched_unassigned'
            : 'unmatched';

    let barcodeCount = 0;
    let aircapIndividual = 0;
    let hasPerOrder = false;
    for (const item of orderItemRows) {
      const p = productMap.get(item.sku);
      if (p?.barcode) barcodeCount += item.quantity;
      if (p?.aircapType === 'INDIVIDUAL' || p?.aircapType === 'BOTH') aircapIndividual += item.quantity;
      if (p?.aircapType === 'PER_ORDER' || p?.aircapType === 'BOTH') hasPerOrder = true;
    }

    return {
      orderUuid: order.id,
      orderId: order.orderId,
      items: orderItemRows.map((i) => ({ sku: i.sku, quantity: i.quantity })),
      boxId: pr?.boxId ?? null,
      packingResultId: pr?.id ?? null,
      status,
      barcodeCount,
      aircapCount: aircapIndividual + (hasPerOrder ? 1 : 0),
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
  const boxesByGroupId = new Map<string, Awaited<ReturnType<typeof boxesService.findByGroupId>>>();
  for (const bgId of boxGroupIds) {
    boxesByGroupId.set(bgId, await boxesService.findByGroupId(bgId));
  }

  let packed = 0;
  let failed = 0;

  await db.transaction(async (tx) => {
    for (const order of pendingOrders) {
      const orderItemsList = itemRows
        .filter((i) => i.orderId === order.id)
        .map((i) => ({ sku: i.sku, quantity: i.quantity }));

      const result = tryAutoPack(orderItemsList, productMapBySku, productMapById, productGroupMap, boxesByGroupId);
      if (result) {
        await tx
          .update(packingResults)
          .set({
            boxId: result.boxId,
            packedCount: result.packedCount,
            efficiency: result.efficiency,
            totalCBM: result.totalCBM,
            items: result.items,
          })
          .where(and(eq(packingResults.shipmentId, settlementId), eq(packingResults.orderId, order.id)));
        await tx.update(orders).set({ status: 'PROCESSING' }).where(eq(orders.id, order.id));
        packed++;
      } else {
        failed++;
      }
    }
  });

  return { packed, failed };
}

type ProductRow = typeof products.$inferSelect;

function tryAutoPack(
  orderItemsList: { sku: string; quantity: number }[],
  productMapBySku: Map<string, ProductRow>,
  productMapById: Map<string, ProductRow>,
  productGroupMap: Map<string, typeof productGroups.$inferSelect>,
  boxesByGroupId: Map<string, Awaited<ReturnType<typeof boxesService.findByGroupId>>>,
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

  const recommendation = calculatePacking(skus, availableBoxes, 'volume');
  if (recommendation.boxes.length === 0) return null;

  const items = buildPackingResultItems(recommendation, productMapById);
  const rowStats = buildPackingResultRowStats(recommendation, productMapById);

  return { ...rowStats, items };
}
