import { db } from '@/lib/db';
import { shipments, orders, orderItems, packingResults } from '@/lib/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { getUserId } from '@/lib/auth';
import { parseExcelFile } from '@/lib/services/excel';
import { parseAdjustment } from '@/lib/services/format-parser';
import * as shipmentService from '@/lib/services/shipment';

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
      const [newOrder] = await tx
        .insert(orders)
        .values({ shipmentId: settlementShipment.id, orderId: userOrderId, status: 'PENDING' })
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

      const matched = matchedOrderMap.get(userOrderId);
      const existingPR = matched ? packingResultMap.get(matched.orderUuid) : undefined;

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

  const orderDetails = orderRows.map((order) => {
    const pr = prMap.get(order.id);
    const orderItemRows = itemRows.filter((i) => i.orderId === order.id);
    const status: 'matched' | 'matched_unassigned' | 'unmatched' =
      pr?.boxId != null
        ? 'matched'
        : pr && (pr.packedCount > 0 || (pr.items && (pr.items as unknown[]).length > 0))
          ? 'matched_unassigned'
          : 'unmatched';
    return {
      orderUuid: order.id,
      orderId: order.orderId,
      items: orderItemRows.map((i) => ({ sku: i.sku, quantity: i.quantity })),
      boxId: pr?.boxId ?? null,
      packingResultId: pr?.id ?? null,
      status,
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
