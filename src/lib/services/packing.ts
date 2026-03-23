import { db } from '@/lib/db';
import { orderItems, packingResults, packingResultDetails, orders, products, productGroups } from '@/lib/db/schema';
export { exportPackingResults } from '@/lib/services/excel';
import { eq, and } from 'drizzle-orm';
import { calculatePacking, calculateOrderPackingUnified } from '@/lib/algorithms/packing';
import type {
  SKU,
  PackingRecommendation,
  PackingGroup,
  PackingResult3D,
} from '@/types';
import * as boxesService from '@/lib/services/boxes';

const CHUNK_SIZE = 500;

type OrderItemRow = typeof orderItems.$inferSelect & {
  product?: (typeof products.$inferSelect & { productGroupId: string }) | null;
};

export async function calculate(
  shipmentId: string,
): Promise<PackingRecommendation> {
  const allItems = await db.query.orderItems.findMany({
    where: eq(orderItems.shipmentId, shipmentId),
    with: { product: true },
  });

  const allProducts = await db.select().from(products);
  const productMapById = new Map(allProducts.map((p) => [p.id, p]));
  const productMapBySku = new Map(allProducts.map((p) => [p.sku, p]));

  const allProductGroups = await db.select().from(productGroups);
  const productGroupMap = new Map(allProductGroups.map((pg) => [pg.id, pg]));

  const boxGroupIds = [...new Set(allProductGroups.map((pg) => pg.boxGroupId))];
  const boxesByGroupId = new Map<string, Awaited<ReturnType<typeof boxesService.findByGroupId>>>();
  for (const bgId of boxGroupIds) {
    boxesByGroupId.set(bgId, await boxesService.findByGroupId(bgId));
  }

  const groupedItems = groupOrderItems(allItems);

  const groups: PackingGroup[] = [];
  let grandTotalCBM = 0;
  let grandTotalUsedVolume = 0;
  let grandTotalAvailableVolume = 0;

  const allDetailRows: (typeof packingResultDetails.$inferInsert)[] = [];
  const allResultRows: (typeof packingResults.$inferInsert)[] = [];

  await db.delete(packingResults).where(eq(packingResults.shipmentId, shipmentId));
  await db.delete(packingResultDetails).where(eq(packingResultDetails.shipmentId, shipmentId));

  let groupIdx = 0;
  for (const group of groupedItems) {
    if (group.length === 0) continue;

    const firstProduct = group
      .map((o) =>
        (o.productId ? productMapById.get(o.productId) : undefined) ??
        productMapBySku.get(o.sku)
      )
      .find((p) => p != null);

    if (!firstProduct) continue;

    const pg = productGroupMap.get(firstProduct.productGroupId);
    if (!pg) continue;

    const boxes = boxesByGroupId.get(pg.boxGroupId);
    if (!boxes || boxes.length === 0) {
      throw new Error(`상품 그룹 "${pg.name}"에 연결된 박스 그룹에 등록된 박스가 없습니다. 박스 관리 메뉴에서 박스를 먼저 등록해주세요.`);
    }

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
    const groupLabel = `Order: ${group[0].orderIdentifier || group[0].orderId}`;

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
          orderId: groupOrderId,
          boxId: box.box.id,
          boxName: box.box.name,
          boxWidth: String(box.box.width),
          boxLength: String(box.box.length),
          boxHeight: String(box.box.height),
          boxGroupId: box.box.boxGroupId,
          packedCount: box.packedSKUs.reduce((a, s) => a + s.quantity, 0),
          efficiency: String(boxVol > 0 ? usedVol / boxVol : 0),
          totalCBM: String(boxVol / 1_000_000),
          groupLabel,
          groupIndex: groupIdx,
        });
      }
    }

    groupIdx++;
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

  return result;
}

function groupOrderItems(
  items: OrderItemRow[],
): OrderItemRow[][] {
  const groups = new Map<string, OrderItemRow[]>();

  for (const item of items) {
    const key = item.orderIdentifier || item.orderId;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  return Array.from(groups.values());
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
  const results = await db
    .select()
    .from(packingResults)
    .where(eq(packingResults.shipmentId, shipmentId))
    .orderBy(packingResults.groupIndex);

  if (results.length === 0) return null;

  const details = await db
    .select()
    .from(packingResultDetails)
    .where(eq(packingResultDetails.shipmentId, shipmentId));

  const allProducts = await db.select().from(products);
  const productBySku = new Map(allProducts.map((p) => [p.sku, p]));

  const groupMap = new Map<string, { groupIndex: number; rows: (typeof results)[number][] }>();
  for (const r of results) {
    const label = r.groupLabel || 'Default Group';
    if (!groupMap.has(label)) {
      groupMap.set(label, { groupIndex: r.groupIndex ?? 0, rows: [] });
    }
    groupMap.get(label)!.rows.push(r);
  }

  const sortedGroups = [...groupMap.entries()].sort((a, b) => a[1].groupIndex - b[1].groupIndex);

  const groups: PackingGroup[] = [];
  let grandTotalCBM = 0;
  let grandTotalUsedVolume = 0;
  let grandTotalAvailableVolume = 0;
  const allUnpackedItems: { skuId: string; name?: string; quantity: number; reason?: string }[] = [];

  for (const [label, { rows: groupRows }] of sortedGroups) {
    const groupOrderIds = new Set(groupRows.map((r) => r.orderId));
    const groupDetails = details.filter((d) => groupOrderIds.has(d.orderId));

    const boxMap = new Map<
      string,
      {
        box: { id: string; name: string; width: number; length: number; height: number; boxGroupId: string };
        count: number;
        packedSKUs: Map<string, { skuId: string; name: string; quantity: number }>;
      }
    >();

    for (const r of groupRows) {
      const key = r.boxId || r.boxName || 'unknown';
      if (!boxMap.has(key)) {
        boxMap.set(key, {
          box: {
            id: r.boxId || '',
            name: r.boxName || '',
            width: Number(r.boxWidth) || 0,
            length: Number(r.boxLength) || 0,
            height: Number(r.boxHeight) || 0,
            boxGroupId: r.boxGroupId || '',
          },
          count: 0,
          packedSKUs: new Map(),
        });
      }
      boxMap.get(key)!.count++;
    }

    for (const d of groupDetails) {
      if (d.unpacked) continue;
      const boxKey = groupRows.find((r) => (r.boxId || r.boxName) && r.boxName === d.boxName)?.boxId || d.boxName;
      const entry = boxMap.get(boxKey);
      if (!entry) continue;

      const product = productBySku.get(d.sku);
      const skuId = product?.id || d.sku;
      if (entry.packedSKUs.has(skuId)) {
        entry.packedSKUs.get(skuId)!.quantity += d.quantity;
      } else {
        entry.packedSKUs.set(skuId, { skuId, name: d.productName, quantity: d.quantity });
      }
    }

    const unpackedItems = groupDetails
      .filter((d) => d.unpacked)
      .map((d) => {
        const product = productBySku.get(d.sku);
        return { skuId: product?.id || d.sku, name: d.productName, quantity: d.quantity, reason: d.unpackedReason || undefined };
      });

    allUnpackedItems.push(...unpackedItems);

    const boxesArray = [...boxMap.values()].map((entry) => ({
      box: entry.box,
      count: entry.count,
      packedSKUs: [...entry.packedSKUs.values()],
    }));

    let groupUsedVolume = 0;
    let groupAvailableVolume = 0;
    for (const entry of boxMap.values()) {
      const boxVol = entry.box.width * entry.box.length * entry.box.height;
      groupAvailableVolume += boxVol * entry.count;
      for (const sku of entry.packedSKUs.values()) {
        const product = productBySku.get(sku.name) || allProducts.find((p) => p.id === sku.skuId);
        if (product) {
          groupUsedVolume += Number(product.width) * Number(product.length) * Number(product.height) * sku.quantity;
        }
      }
    }

    const groupTotalCBM = groupRows.reduce((sum, r) => sum + Number(r.totalCBM), 0);
    grandTotalCBM += groupTotalCBM;
    grandTotalUsedVolume += groupUsedVolume;
    grandTotalAvailableVolume += groupAvailableVolume;

    groups.push({
      groupLabel: label,
      boxes: boxesArray,
      unpackedItems,
      totalCBM: groupTotalCBM,
      totalEfficiency: groupAvailableVolume > 0 ? groupUsedVolume / groupAvailableVolume : 0,
    });
  }

  return {
    groups,
    totalCBM: grandTotalCBM,
    totalEfficiency: grandTotalAvailableVolume > 0 ? grandTotalUsedVolume / grandTotalAvailableVolume : 0,
    unpackedItems: allUnpackedItems,
  };
}

export async function updateBoxAssignment(
  shipmentId: string,
  items: { groupIndex: number; boxIndex: number }[],
  newBoxId: string,
): Promise<PackingRecommendation> {
  const results = await db
    .select()
    .from(packingResults)
    .where(eq(packingResults.shipmentId, shipmentId))
    .orderBy(packingResults.groupIndex);

  if (results.length === 0) {
    throw new Error('패킹 추천 결과가 없습니다.');
  }

  const groupMap = new Map<string, (typeof results)[number][]>();
  for (const r of results) {
    const label = r.groupLabel || 'Default Group';
    if (!groupMap.has(label)) groupMap.set(label, []);
    groupMap.get(label)!.push(r);
  }

  const sortedGroupLabels = [...groupMap.entries()]
    .sort((a, b) => (a[1][0].groupIndex ?? 0) - (b[1][0].groupIndex ?? 0))
    .map(([label]) => label);

  const newBox = await boxesService.findOne(newBoxId);
  if (!newBox) throw new Error(`Box ${newBoxId} not found`);

  const newBoxVol = Number(newBox.width) * Number(newBox.length) * Number(newBox.height);

  for (const item of items) {
    const { groupIndex, boxIndex } = item;

    if (groupIndex < 0 || groupIndex >= sortedGroupLabels.length) {
      throw new Error(`유효하지 않은 그룹 인덱스입니다: ${groupIndex}`);
    }

    const targetGroupLabel = sortedGroupLabels[groupIndex];
    const groupRows = groupMap.get(targetGroupLabel)!;

    const boxTypes: { key: string; boxName: string | null }[] = [];
    const seen = new Set<string>();
    for (const r of groupRows) {
      const key = r.boxId || r.boxName || 'unknown';
      if (!seen.has(key)) {
        seen.add(key);
        boxTypes.push({ key, boxName: r.boxName });
      }
    }

    if (boxIndex < 0 || boxIndex >= boxTypes.length) {
      throw new Error(`유효하지 않은 박스 인덱스입니다: ${boxIndex}`);
    }

    const oldBoxType = boxTypes[boxIndex];

    await db
      .update(packingResults)
      .set({
        boxId: newBox.id,
        boxName: newBox.name,
        boxWidth: String(newBox.width),
        boxLength: String(newBox.length),
        boxHeight: String(newBox.height),
        boxGroupId: newBox.boxGroupId,
        totalCBM: String(newBoxVol / 1_000_000),
      })
      .where(
        and(
          eq(packingResults.shipmentId, shipmentId),
          eq(packingResults.groupLabel, targetGroupLabel),
          oldBoxType.boxName ? eq(packingResults.boxName, oldBoxType.boxName) : undefined,
        ),
      );

    if (oldBoxType.boxName) {
      const groupOrderIds = [...new Set(groupRows.map((r) => r.orderId).filter(Boolean))];
      for (const oid of groupOrderIds) {
        await db
          .update(packingResultDetails)
          .set({ boxName: newBox.name })
          .where(
            and(
              eq(packingResultDetails.shipmentId, shipmentId),
              eq(packingResultDetails.orderId, oid!),
              eq(packingResultDetails.boxName, oldBoxType.boxName!),
            ),
          );
      }
    }
  }

  const recommendation = await getRecommendation(shipmentId);
  if (!recommendation) throw new Error('패킹 추천 결과를 재구성할 수 없습니다.');
  return recommendation;
}

export async function calculateOrderPacking(
  shipmentId: string,
  orderId: string,
  groupLabel?: string,
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

  const firstProduct = order.orderItems.find((item) => item.product)?.product;
  if (!firstProduct) {
    throw new Error(`주문 ID ${orderId}에 포장할 수 있는 유효한 상품이 없습니다.`);
  }

  const pg = await db.query.productGroups.findFirst({
    where: eq(productGroups.id, firstProduct.productGroupId),
  });

  const boxes = pg
    ? await boxesService.findByGroupId(pg.boxGroupId)
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
