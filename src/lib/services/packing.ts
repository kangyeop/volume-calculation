import { db } from '@/lib/db';
import { orderItems, packingResults, packingResultDetails, shipments, orders, products } from '@/lib/db/schema';
export { exportPackingResults } from '@/lib/services/excel';
import { eq, and } from 'drizzle-orm';
import { calculatePacking, calculateOrderPackingUnified } from '@/lib/algorithms/packing';
import type {
  SKU,
  Box,
  PackingRecommendation,
  PackingGroup,
  PackingResult3DLegacy as PackingResult3D,
  PackingGroupingOption,
} from '@/types';
import * as boxesService from '@/lib/services/boxes';

const CHUNK_SIZE = 500;

type OrderItemRow = typeof orderItems.$inferSelect & {
  product?: typeof products.$inferSelect | null;
  order?: typeof orders.$inferSelect | null;
};

export async function calculate(
  shipmentId: string,
  groupingOption: PackingGroupingOption,
  boxGroupId: string,
): Promise<PackingRecommendation> {
  const allItems = await db.query.orderItems.findMany({
    where: eq(orderItems.shipmentId, shipmentId),
    with: { product: true },
  });

  const allOrderRows = await db.query.orders.findMany({
    where: eq(orders.shipmentId, shipmentId),
  });
  const orderById = new Map(allOrderRows.map((o) => [o.id, o]));

  const itemsWithOrder: (OrderItemRow & { order: typeof orders.$inferSelect | undefined })[] =
    allItems.map((o) => ({ ...o, order: orderById.get(o.orderId) }));

  const allProducts = await db.select().from(products);
  const productMapById = new Map(allProducts.map((p) => [p.id, p]));
  const productMapBySku = new Map(allProducts.map((p) => [p.sku, p]));

  const boxes = await boxesService.findByGroupId(boxGroupId);

  if (boxes.length === 0) {
    throw new Error('선택한 박스 그룹에 등록된 박스가 없습니다. 박스 관리 메뉴에서 박스를 먼저 등록해주세요.');
  }

  const groupedItems = groupOrderItems(itemsWithOrder, groupingOption);

  const groups: PackingGroup[] = [];
  let grandTotalCBM = 0;
  let grandTotalUsedVolume = 0;
  let grandTotalAvailableVolume = 0;

  const allDetailRows: (typeof packingResultDetails.$inferInsert)[] = [];
  const allResultRows: (typeof packingResults.$inferInsert)[] = [];

  await db.delete(packingResults).where(eq(packingResults.shipmentId, shipmentId));
  await db.delete(packingResultDetails).where(eq(packingResultDetails.shipmentId, shipmentId));

  for (const group of groupedItems) {
    if (group.length === 0) continue;

    const skus: SKU[] = group
      .map((o) => {
        const product =
          (o.productId ? productMapById.get(o.productId) : undefined) ??
          productMapBySku.get(o.sku);
        if (!product) return null;
        return {
          id: product.id,
          name: product.name,
          width: Number(product.width),
          length: Number(product.length),
          height: Number(product.height),
          quantity: o.quantity,
        };
      })
      .filter((s): s is SKU => s !== null);

    if (skus.length === 0) continue;

    const recommendation = calculatePacking(skus, boxes);
    const groupLabel = generateGroupLabel(group[0], groupingOption);

    let groupUsedVolume = 0;
    let groupAvailableVolume = 0;

    for (const rb of recommendation.boxes) {
      const boxVol = rb.box.width * rb.box.length * rb.box.height;
      groupAvailableVolume += boxVol * rb.count;
      for (const packedSku of rb.packedSKUs) {
        const product = productMapById.get(packedSku.skuId);
        if (product) {
          groupUsedVolume +=
            Number(product.width) * Number(product.length) * Number(product.height) * packedSku.quantity;
        }
      }
    }

    const boxesWithNames = recommendation.boxes.map((box) => ({
      ...box,
      packedSKUs: box.packedSKUs.map((sku) => {
        const product = productMapById.get(sku.skuId);
        return { ...sku, name: product ? product.name : 'Unknown Product' };
      }),
    }));

    const unpackedWithNames = recommendation.unpackedItems.map((item) => {
      const product = productMapById.get(item.skuId);
      return { ...item, name: product ? product.name : 'Unknown Product' };
    });

    const groupOrderId = group[0].orderIdentifier || group[0].orderId;
    const skuToItem = new Map<string, { sku: string }>();
    for (const item of group) {
      const product =
        (item.productId ? productMapById.get(item.productId) : undefined) ??
        productMapBySku.get(item.sku);
      if (product && !skuToItem.has(product.id)) {
        skuToItem.set(product.id, { sku: item.sku });
      }
    }

    let boxIndex = 1;
    for (const box of boxesWithNames) {
      const boxVol = box.box.width * box.box.length * box.box.height;
      const boxCBM = boxVol / 1_000_000;

      for (let i = 0; i < box.count; i++) {
        for (const packedSku of box.packedSKUs) {
          const product = productMapById.get(packedSku.skuId);
          if (!product) continue;

          const itemInfo = skuToItem.get(packedSku.skuId);
          const efficiency =
            boxVol > 0
              ? (Number(product.width) * Number(product.length) * Number(product.height) * packedSku.quantity) /
                boxVol
              : 0;

          allDetailRows.push({
            shipmentId,
            orderId: groupOrderId,
            recipientName: '',
            sku: itemInfo?.sku || product.sku,
            productName: product.name,
            quantity: packedSku.quantity,
            boxName: box.box.name,
            boxNumber: i + 1,
            boxIndex,
            boxCBM: String(boxCBM),
            efficiency: String(efficiency),
            unpacked: false,
            unpackedReason: '',
          });
        }
      }
      boxIndex++;
    }

    for (const item of unpackedWithNames) {
      const itemInfo = skuToItem.get(item.skuId);
      allDetailRows.push({
        shipmentId,
        orderId: groupOrderId,
        recipientName: '',
        sku: itemInfo?.sku || item.skuId,
        productName: item.name,
        quantity: item.quantity,
        boxName: 'Unpacked',
        boxNumber: 0,
        boxIndex: 0,
        boxCBM: '0',
        efficiency: '0',
        unpacked: true,
        unpackedReason: item.reason || '',
      });
    }

    groups.push({
      groupLabel,
      boxes: boxesWithNames,
      unpackedItems: unpackedWithNames,
      totalCBM: recommendation.totalCBM,
      totalEfficiency: groupAvailableVolume > 0 ? groupUsedVolume / groupAvailableVolume : 0,
    });

    grandTotalCBM += recommendation.totalCBM;
    grandTotalUsedVolume += groupUsedVolume;
    grandTotalAvailableVolume += groupAvailableVolume;

    for (const box of boxesWithNames) {
      const boxVol = box.box.width * box.box.length * box.box.height;
      const usedVol = box.packedSKUs.reduce((acc, s) => {
        const product = productMapById.get(s.skuId);
        return acc + (product ? Number(product.width) * Number(product.length) * Number(product.height) * s.quantity : 0);
      }, 0);

      for (let i = 0; i < box.count; i++) {
        allResultRows.push({
          shipmentId,
          orderId: groupLabel,
          boxName: box.box.name,
          packedCount: box.packedSKUs.reduce((a, s) => a + s.quantity, 0),
          efficiency: String(boxVol > 0 ? usedVol / boxVol : 0),
          totalCBM: String(boxVol / 1_000_000),
          groupLabel,
        });
      }
    }
  }

  if (allDetailRows.length > 0) {
    for (let i = 0; i < allDetailRows.length; i += CHUNK_SIZE) {
      await db.insert(packingResultDetails).values(allDetailRows.slice(i, i + CHUNK_SIZE));
    }
  }

  if (allResultRows.length > 0) {
    for (let i = 0; i < allResultRows.length; i += CHUNK_SIZE) {
      await db.insert(packingResults).values(allResultRows.slice(i, i + CHUNK_SIZE));
    }
  }

  const allUnpackedItems = groups.flatMap((g) => g.unpackedItems || []);

  const result: PackingRecommendation = {
    groups,
    totalCBM: grandTotalCBM,
    totalEfficiency:
      grandTotalAvailableVolume > 0 ? grandTotalUsedVolume / grandTotalAvailableVolume : 0,
    unpackedItems: allUnpackedItems,
  };

  await db
    .update(shipments)
    .set({ packingRecommendation: result as unknown as Record<string, unknown>, lastBoxGroupId: boxGroupId })
    .where(eq(shipments.id, shipmentId));

  return result;
}

function groupOrderItems(
  items: (OrderItemRow & { order: typeof orders.$inferSelect | undefined })[],
  option: PackingGroupingOption,
): (OrderItemRow & { order: typeof orders.$inferSelect | undefined })[][] {
  const groups = new Map<
    string,
    (OrderItemRow & { order: typeof orders.$inferSelect | undefined })[]
  >();

  for (const item of items) {
    const orderIdentifier = item.orderIdentifier || item.orderId;
    const recipientName = item.order?.recipientName || 'Unknown Recipient';

    let key = '';
    switch (option) {
      case 'ORDER':
        key = `order:${orderIdentifier}`;
        break;
      case 'RECIPIENT':
        key = `recipient:${recipientName}`;
        break;
      case 'ORDER_RECIPIENT':
        key = `order_recipient:${orderIdentifier}_${recipientName}`;
        break;
      default:
        key = 'default';
    }

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  return Array.from(groups.values());
}

function generateGroupLabel(
  item: OrderItemRow & { order: typeof orders.$inferSelect | undefined },
  option: PackingGroupingOption,
): string {
  const orderIdentifier = item.orderIdentifier || item.orderId;
  const recipientName = item.order?.recipientName || 'Unknown Recipient';

  switch (option) {
    case 'ORDER':
      return `Order: ${orderIdentifier}`;
    case 'RECIPIENT':
      return `Recipient: ${recipientName}`;
    case 'ORDER_RECIPIENT':
      return `Order: ${orderIdentifier}, Recipient: ${recipientName}`;
    default:
      return 'Default Group';
  }
}

export async function findAll(shipmentId: string) {
  return db.select().from(packingResults).where(eq(packingResults.shipmentId, shipmentId));
}

export async function findByOrderId(shipmentId: string, orderId: string) {
  return db
    .select()
    .from(packingResults)
    .where(and(eq(packingResults.shipmentId, shipmentId), eq(packingResults.orderId, orderId)));
}

export async function findAllDetails(shipmentId: string) {
  return db
    .select()
    .from(packingResultDetails)
    .where(eq(packingResultDetails.shipmentId, shipmentId));
}

export async function getRecommendation(shipmentId: string): Promise<PackingRecommendation | null> {
  const shipment = await db.query.shipments.findFirst({
    where: eq(shipments.id, shipmentId),
  });
  if (!shipment?.packingRecommendation) return null;
  return shipment.packingRecommendation as unknown as PackingRecommendation;
}

export async function updateBoxAssignment(
  shipmentId: string,
  groupIndex: number,
  boxIndex: number,
  newBoxId: string,
): Promise<PackingRecommendation> {
  const shipment = await db.query.shipments.findFirst({
    where: eq(shipments.id, shipmentId),
  });
  if (!shipment?.packingRecommendation) {
    throw new Error('패킹 추천 결과가 없습니다.');
  }

  const recommendation = shipment.packingRecommendation as unknown as PackingRecommendation;

  if (groupIndex < 0 || groupIndex >= recommendation.groups.length) {
    throw new Error(`유효하지 않은 그룹 인덱스입니다: ${groupIndex}`);
  }

  const group = recommendation.groups[groupIndex];
  if (boxIndex < 0 || boxIndex >= group.boxes.length) {
    throw new Error(`유효하지 않은 박스 인덱스입니다: ${boxIndex}`);
  }

  const newBox = await boxesService.findOne(newBoxId);
  if (!newBox) throw new Error(`Box ${newBoxId} not found`);

  group.boxes[boxIndex].box = {
    id: newBox.id,
    name: newBox.name,
    width: newBox.width,
    length: newBox.length,
    height: newBox.height,
    boxGroupId: newBox.boxGroupId,
  };

  await db
    .update(shipments)
    .set({ packingRecommendation: recommendation as unknown as Record<string, unknown> })
    .where(eq(shipments.id, shipmentId));

  return recommendation;
}

export async function calculateOrderPacking(
  shipmentId: string,
  orderId: string,
  groupLabel?: string,
  boxGroupId?: string,
): Promise<PackingResult3D> {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.shipmentId, shipmentId), eq(orders.orderId, orderId)),
    with: {
      orderItems: {
        with: { product: true },
      },
    },
  });

  if (!order) {
    throw new Error(`주문 ID ${orderId}에 대한 출고 정보가 없습니다.`);
  }

  const boxes = boxGroupId
    ? await boxesService.findByGroupId(boxGroupId)
    : await boxesService.findAll();

  if (boxes.length === 0) {
    throw new Error('등록된 박스가 없습니다. 박스 관리 메뉴에서 박스를 먼저 등록해주세요.');
  }

  const skuMap = new Map<string, SKU>();

  for (const item of order.orderItems) {
    const product = item.product;
    if (!product) continue;

    const existing = skuMap.get(product.id);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      skuMap.set(product.id, {
        id: product.id,
        name: product.name,
        width: Number(product.width),
        length: Number(product.length),
        height: Number(product.height),
        quantity: item.quantity,
      });
    }
  }

  const skus = Array.from(skuMap.values());

  if (skus.length === 0) {
    throw new Error(`주문 ID ${orderId}에 포장할 수 있는 유효한 상품이 없습니다.`);
  }

  const result = calculateOrderPackingUnified(orderId, skus, boxes, groupLabel || order.orderId);

  await savePackingResults3D(shipmentId, result);

  return result;
}

async function savePackingResults3D(shipmentId: string, result: PackingResult3D): Promise<void> {
  await db
    .delete(packingResults)
    .where(and(eq(packingResults.shipmentId, shipmentId), eq(packingResults.orderId, result.orderId)));

  const rows = result.boxes.map((box) => ({
    shipmentId,
    orderId: result.orderId,
    boxId: box.boxId,
    boxName: box.boxName,
    boxNumber: box.boxNumber,
    packedCount: box.items.reduce((acc, item) => acc + item.quantity, 0),
    efficiency: String(box.efficiency),
    totalCBM: String(box.totalCBM),
    groupLabel: result.groupLabel,
  }));

  if (rows.length > 0) {
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      await db.insert(packingResults).values(rows.slice(i, i + CHUNK_SIZE));
    }
  }
}
