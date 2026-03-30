import { db } from '@/lib/db';
import { shipments, orders, orderItems, packingResults, products } from '@/lib/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { getUserId } from '@/lib/auth';
import { parseExcelFile } from '@/lib/services/excel';
import { parseAdjustment } from '@/lib/services/format-parser';
import * as shipmentService from '@/lib/services/shipment';
import type { PackingResultItem } from '@/types';

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

  const [orderRows, prRows, itemRows] = await Promise.all([
    db.select().from(orders).where(eq(orders.shipmentId, id)),
    db.select().from(packingResults).where(eq(packingResults.shipmentId, id)),
    db.query.orderItems.findMany({ where: eq(orderItems.shipmentId, id) }),
  ]);

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






