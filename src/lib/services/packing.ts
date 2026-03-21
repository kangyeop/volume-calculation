import { db } from '@/lib/db';
import { outboundItems, packingResults, packingResultDetails, outboundBatches, orders, products } from '@/lib/db/schema';
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

type OutboundItemRow = typeof outboundItems.$inferSelect & {
  product?: typeof products.$inferSelect | null;
  order?: typeof orders.$inferSelect | null;
};

export async function calculate(
  outboundBatchId: string,
  groupingOption: PackingGroupingOption,
  boxGroupId: string,
): Promise<PackingRecommendation> {
  const allOutbounds = await db.query.outboundItems.findMany({
    where: eq(outboundItems.outboundBatchId, outboundBatchId),
    with: { product: true },
  });

  const allOrderRows = await db.query.orders.findMany({
    where: eq(orders.outboundBatchId, outboundBatchId),
  });
  const orderById = new Map(allOrderRows.map((o) => [o.id, o]));

  const outboundsWithOrder: (OutboundItemRow & { order: typeof orders.$inferSelect | undefined })[] =
    allOutbounds.map((o) => ({ ...o, order: orderById.get(o.orderId) }));

  const allProducts = await db.select().from(products);
  const productMapById = new Map(allProducts.map((p) => [p.id, p]));
  const productMapBySku = new Map(allProducts.map((p) => [p.sku, p]));

  const boxes = await boxesService.findByGroupId(boxGroupId);

  if (boxes.length === 0) {
    throw new Error('선택한 박스 그룹에 등록된 박스가 없습니다. 박스 관리 메뉴에서 박스를 먼저 등록해주세요.');
  }

  const groupedOutbounds = groupOutbounds(outboundsWithOrder, groupingOption);

  const groups: PackingGroup[] = [];
  let grandTotalCBM = 0;
  let grandTotalUsedVolume = 0;
  let grandTotalAvailableVolume = 0;

  const allDetailRows: (typeof packingResultDetails.$inferInsert)[] = [];
  const allResultRows: (typeof packingResults.$inferInsert)[] = [];

  await db.delete(packingResults).where(eq(packingResults.outboundBatchId, outboundBatchId));
  await db.delete(packingResultDetails).where(eq(packingResultDetails.outboundBatchId, outboundBatchId));

  for (const group of groupedOutbounds) {
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
    const skuToOutbound = new Map<string, { sku: string }>();
    for (const outbound of group) {
      const product =
        (outbound.productId ? productMapById.get(outbound.productId) : undefined) ??
        productMapBySku.get(outbound.sku);
      if (product && !skuToOutbound.has(product.id)) {
        skuToOutbound.set(product.id, { sku: outbound.sku });
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

          const outboundInfo = skuToOutbound.get(packedSku.skuId);
          const efficiency =
            boxVol > 0
              ? (Number(product.width) * Number(product.length) * Number(product.height) * packedSku.quantity) /
                boxVol
              : 0;

          allDetailRows.push({
            outboundBatchId,
            orderId: groupOrderId,
            recipientName: '',
            sku: outboundInfo?.sku || product.sku,
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
      const outboundInfo = skuToOutbound.get(item.skuId);
      allDetailRows.push({
        outboundBatchId,
        orderId: groupOrderId,
        recipientName: '',
        sku: outboundInfo?.sku || item.skuId,
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
          outboundBatchId,
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
    .update(outboundBatches)
    .set({ packingRecommendation: result as unknown as Record<string, unknown>, lastBoxGroupId: boxGroupId })
    .where(eq(outboundBatches.id, outboundBatchId));

  return result;
}

function groupOutbounds(
  outbounds: (OutboundItemRow & { order: typeof orders.$inferSelect | undefined })[],
  option: PackingGroupingOption,
): (OutboundItemRow & { order: typeof orders.$inferSelect | undefined })[][] {
  const groups = new Map<
    string,
    (OutboundItemRow & { order: typeof orders.$inferSelect | undefined })[]
  >();

  for (const outbound of outbounds) {
    const orderIdentifier = outbound.orderIdentifier || outbound.orderId;
    const recipientName = outbound.order?.recipientName || 'Unknown Recipient';

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
    groups.get(key)!.push(outbound);
  }

  return Array.from(groups.values());
}

function generateGroupLabel(
  outbound: OutboundItemRow & { order: typeof orders.$inferSelect | undefined },
  option: PackingGroupingOption,
): string {
  const orderIdentifier = outbound.orderIdentifier || outbound.orderId;
  const recipientName = outbound.order?.recipientName || 'Unknown Recipient';

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

export async function findAll(outboundBatchId: string) {
  return db.select().from(packingResults).where(eq(packingResults.outboundBatchId, outboundBatchId));
}

export async function findByOrderId(outboundBatchId: string, orderId: string) {
  return db
    .select()
    .from(packingResults)
    .where(and(eq(packingResults.outboundBatchId, outboundBatchId), eq(packingResults.orderId, orderId)));
}

export async function findAllDetails(outboundBatchId: string) {
  return db
    .select()
    .from(packingResultDetails)
    .where(eq(packingResultDetails.outboundBatchId, outboundBatchId));
}

export async function getRecommendation(outboundBatchId: string): Promise<PackingRecommendation | null> {
  const batch = await db.query.outboundBatches.findFirst({
    where: eq(outboundBatches.id, outboundBatchId),
  });
  if (!batch?.packingRecommendation) return null;
  return batch.packingRecommendation as unknown as PackingRecommendation;
}

export async function updateBoxAssignment(
  outboundBatchId: string,
  groupIndex: number,
  boxIndex: number,
  newBoxId: string,
): Promise<PackingRecommendation> {
  const batch = await db.query.outboundBatches.findFirst({
    where: eq(outboundBatches.id, outboundBatchId),
  });
  if (!batch?.packingRecommendation) {
    throw new Error('패킹 추천 결과가 없습니다.');
  }

  const recommendation = batch.packingRecommendation as unknown as PackingRecommendation;

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
    .update(outboundBatches)
    .set({ packingRecommendation: recommendation as unknown as Record<string, unknown> })
    .where(eq(outboundBatches.id, outboundBatchId));

  return recommendation;
}

export async function calculateOrderPacking(
  outboundBatchId: string,
  orderId: string,
  groupLabel?: string,
  boxGroupId?: string,
): Promise<PackingResult3D> {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.outboundBatchId, outboundBatchId), eq(orders.orderId, orderId)),
    with: {
      outboundItems: {
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

  for (const item of order.outboundItems) {
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

  await savePackingResults3D(outboundBatchId, result);

  return result;
}

async function savePackingResults3D(outboundBatchId: string, result: PackingResult3D): Promise<void> {
  await db
    .delete(packingResults)
    .where(and(eq(packingResults.outboundBatchId, outboundBatchId), eq(packingResults.orderId, result.orderId)));

  const rows = result.boxes.map((box) => ({
    outboundBatchId,
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
