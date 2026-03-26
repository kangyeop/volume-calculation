import { db } from '@/lib/db';
import { orderItems, packingResults, orders, products, productGroups, shipments } from '@/lib/db/schema';
export { exportPackingResults } from '@/lib/services/excel';
import { eq, and } from 'drizzle-orm';
import { getUserId } from '@/lib/auth';
import { calculatePacking, calculateOrderPackingUnified } from '@/lib/algorithms/packing';
import type {
  SKU,
  BoxSortStrategy,
  PackingRecommendation,
  PackingGroup,
  PackingResult3D,
  PackingResultItem,
} from '@/types';
import * as boxesService from '@/lib/services/boxes';

const CHUNK_SIZE = 500;

async function assertNotConfirmed(shipmentId: string) {
  const shipment = await db.query.shipments.findFirst({
    where: eq(shipments.id, shipmentId),
    columns: { status: true },
  });
  if (shipment?.status === 'CONFIRMED') {
    throw new Error('SHIPMENT_CONFIRMED');
  }
}

type OrderItemRow = typeof orderItems.$inferSelect & {
  product?: (typeof products.$inferSelect & { productGroupId: string }) | null;
};

export async function calculate(
  shipmentId: string,
  strategy: BoxSortStrategy = 'volume',
): Promise<PackingRecommendation> {
  await assertNotConfirmed(shipmentId);
  const userId = await getUserId();
  const allItems = await db.query.orderItems.findMany({
    where: eq(orderItems.shipmentId, shipmentId),
    with: { product: true },
  });

  const allProducts = await db.select().from(products).where(eq(products.userId, userId));
  const productMapById = new Map(allProducts.map((p) => [p.id, p]));
  const productMapBySku = new Map(allProducts.map((p) => [p.sku, p]));

  const allProductGroups = await db.select().from(productGroups).where(eq(productGroups.userId, userId));
  const productGroupMap = new Map(allProductGroups.map((pg) => [pg.id, pg]));

  const boxGroupIds = [...new Set(allProductGroups.map((pg) => pg.boxGroupId))];
  const boxesByGroupId = new Map<string, Awaited<ReturnType<typeof boxesService.findByGroupId>>>();
  for (const bgId of boxGroupIds) {
    boxesByGroupId.set(bgId, await boxesService.findByGroupId(bgId));
  }

  const allOrders = await db.select().from(orders).where(eq(orders.shipmentId, shipmentId));
  const orderMap = new Map(allOrders.map((o) => [o.orderId, o]));

  const groupedItems = groupOrderItems(allItems);

  const groups: PackingGroup[] = [];
  let grandTotalCBM = 0;
  let grandTotalUsedVolume = 0;
  let grandTotalAvailableVolume = 0;

  const allResultRows: (typeof packingResults.$inferInsert)[] = [];

  await db.delete(packingResults).where(eq(packingResults.shipmentId, shipmentId));

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

    const availableBoxes = boxesByGroupId.get(pg.boxGroupId);
    if (!availableBoxes || availableBoxes.length === 0) {
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

    const recommendation = calculatePacking(skus, availableBoxes, strategy);
    const groupOrderId = group[0].orderIdentifier || group[0].orderId;
    const groupLabel = `Order: ${groupOrderId}`;

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

    const skuToItem = new Map<string, { sku: string }>();
    for (const item of group) {
      const product =
        (item.productId ? productMapById.get(item.productId) : undefined) ??
        productMapBySku.get(item.sku);
      if (product && !skuToItem.has(product.id)) {
        skuToItem.set(product.id, { sku: item.sku });
      }
    }

    const items: PackingResultItem[] = [];
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

          items.push({
            sku: itemInfo?.sku || product.sku,
            productName: product.name,
            quantity: packedSku.quantity,
            boxName: box.box.name,
            boxNumber: i + 1,
            boxIndex,
            boxCBM,
            efficiency,
            unpacked: false,
          });
        }
      }
      boxIndex++;
    }

    for (const item of unpackedWithNames) {
      const itemInfo = skuToItem.get(item.skuId);
      items.push({
        sku: itemInfo?.sku || item.skuId,
        productName: item.name,
        quantity: item.quantity,
        boxName: 'Unpacked',
        boxNumber: 0,
        boxIndex: 0,
        boxCBM: 0,
        efficiency: 0,
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

    const orderRecord = orderMap.get(groupOrderId);
    if (!orderRecord) continue;

    const firstBox = boxesWithNames[0];
    const boxVol = firstBox ? firstBox.box.width * firstBox.box.length * firstBox.box.height : 0;
    const usedVol = firstBox
      ? firstBox.packedSKUs.reduce((acc, s) => {
          const product = productMapById.get(s.skuId);
          return acc + (product ? Number(product.width) * Number(product.length) * Number(product.height) * s.quantity : 0);
        }, 0)
      : 0;

    allResultRows.push({
      shipmentId,
      orderId: orderRecord.id,
      boxId: firstBox ? firstBox.box.id : null,
      packedCount: firstBox ? firstBox.packedSKUs.reduce((a, s) => a + s.quantity, 0) : 0,
      efficiency: String(boxVol > 0 ? usedVol / boxVol : 0),
      totalCBM: String(firstBox ? boxVol / 1_000_000 : 0),
      groupLabel,
      groupIndex: groupIdx,
      items,
    });

    groupIdx++;
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
  return db.query.packingResults.findMany({
    where: eq(packingResults.shipmentId, shipmentId),
    with: { box: true, order: true },
  });
}

export async function findByOrderId(shipmentId: string, orderIdStr: string) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.shipmentId, shipmentId), eq(orders.orderId, orderIdStr)),
  });
  if (!order) return [];
  return db.query.packingResults.findMany({
    where: and(eq(packingResults.shipmentId, shipmentId), eq(packingResults.orderId, order.id)),
    with: { box: true },
  });
}

export async function getRecommendation(shipmentId: string): Promise<PackingRecommendation | null> {
  const results = await db.query.packingResults.findMany({
    where: eq(packingResults.shipmentId, shipmentId),
    with: { box: true, order: true },
    orderBy: packingResults.groupIndex,
  });

  if (results.length === 0) return null;

  const userId = await getUserId();
  const allProducts = await db.select().from(products).where(eq(products.userId, userId));
  const productBySku = new Map(allProducts.map((p) => [p.sku, p]));

  const groups: PackingGroup[] = [];
  let grandTotalCBM = 0;
  let grandTotalUsedVolume = 0;
  let grandTotalAvailableVolume = 0;
  const allUnpackedItems: { skuId: string; name?: string; quantity: number; reason?: string }[] = [];

  for (const r of results) {
    const label = r.groupLabel || 'Default Group';
    const resultItems = (r.items || []) as PackingResultItem[];

    const packedItems = resultItems.filter((i) => !i.unpacked);
    const unpackedItems = resultItems.filter((i) => i.unpacked);

    const box = r.box;
    const boxObj = box
      ? {
          id: box.id,
          name: box.name,
          width: Number(box.width),
          length: Number(box.length),
          height: Number(box.height),
          stock: box.stock,
          boxGroupId: box.boxGroupId,
        }
      : null;

    const packedSKUsMap = new Map<string, { skuId: string; name: string; quantity: number }>();
    for (const item of packedItems) {
      const product = productBySku.get(item.sku);
      const skuId = product?.id || item.sku;
      if (packedSKUsMap.has(skuId)) {
        packedSKUsMap.get(skuId)!.quantity += item.quantity;
      } else {
        packedSKUsMap.set(skuId, { skuId, name: item.productName, quantity: item.quantity });
      }
    }

    const boxesArray = boxObj
      ? [{
          box: boxObj,
          count: 1,
          packedSKUs: [...packedSKUsMap.values()],
        }]
      : [];

    const mappedUnpacked = unpackedItems.map((item) => {
      const product = productBySku.get(item.sku);
      return { skuId: product?.id || item.sku, name: item.productName, quantity: item.quantity, reason: item.unpackedReason };
    });
    allUnpackedItems.push(...mappedUnpacked);

    let groupUsedVolume = 0;
    let groupAvailableVolume = 0;
    if (boxObj) {
      const boxVol = boxObj.width * boxObj.length * boxObj.height;
      groupAvailableVolume = boxVol;
      for (const sku of packedSKUsMap.values()) {
        const product = productBySku.get(sku.name) || allProducts.find((p) => p.id === sku.skuId);
        if (product) {
          groupUsedVolume += Number(product.width) * Number(product.length) * Number(product.height) * sku.quantity;
        }
      }
    }

    const groupTotalCBM = Number(r.totalCBM);
    grandTotalCBM += groupTotalCBM;
    grandTotalUsedVolume += groupUsedVolume;
    grandTotalAvailableVolume += groupAvailableVolume;

    groups.push({
      groupLabel: label,
      boxes: boxesArray,
      unpackedItems: mappedUnpacked,
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
  await assertNotConfirmed(shipmentId);
  const results = await db.query.packingResults.findMany({
    where: eq(packingResults.shipmentId, shipmentId),
    with: { box: true },
    orderBy: packingResults.groupIndex,
  });

  if (results.length === 0) {
    throw new Error('패킹 추천 결과가 없습니다.');
  }

  const newBox = await boxesService.findOne(newBoxId);
  if (!newBox) throw new Error(`Box ${newBoxId} not found`);
  if (!newBox.boxGroupId) {
    throw new Error('미할당 박스로는 교체할 수 없습니다');
  }

  const newBoxVol = Number(newBox.width) * Number(newBox.length) * Number(newBox.height);

  for (const item of items) {
    const { groupIndex } = item;

    const target = results[groupIndex];
    if (!target) {
      throw new Error(`유효하지 않은 그룹 인덱스입니다: ${groupIndex}`);
    }

    const updatedItems = ((target.items || []) as PackingResultItem[]).map((i) => {
      if (i.unpacked) return i;
      return {
        ...i,
        boxName: newBox.name,
        boxCBM: newBoxVol / 1_000_000,
      };
    });

    await db
      .update(packingResults)
      .set({
        boxId: newBox.id,
        totalCBM: String(newBoxVol / 1_000_000),
        items: updatedItems,
      })
      .where(eq(packingResults.id, target.id));
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

  const availableBoxes = pg
    ? await boxesService.findByGroupId(pg.boxGroupId)
    : await boxesService.findAll();

  if (availableBoxes.length === 0) {
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

  const result = calculateOrderPackingUnified(orderId, skus, availableBoxes, groupLabel || order.orderId);

  await savePackingResults3D(shipmentId, order.id, result);

  return result;
}

async function savePackingResults3D(shipmentId: string, orderUuid: string, result: PackingResult3D): Promise<void> {
  await db
    .delete(packingResults)
    .where(and(eq(packingResults.shipmentId, shipmentId), eq(packingResults.orderId, orderUuid)));

  const items: PackingResultItem[] = [];
  for (const box of result.boxes) {
    for (const item of box.items) {
      items.push({
        sku: item.skuId,
        productName: item.name || '',
        quantity: item.quantity,
        boxName: box.boxName,
        boxNumber: box.boxNumber,
        boxIndex: box.boxNumber,
        boxCBM: box.totalCBM,
        efficiency: box.efficiency,
        unpacked: false,
        placements: item.placements?.map((p) => ({ x: p.x, y: p.y, z: p.z, rotation: String(p.rotation) })),
      });
    }
  }

  for (const item of result.unpackedItems) {
    items.push({
      sku: item.skuId,
      productName: item.name || '',
      quantity: item.quantity,
      boxName: 'Unpacked',
      boxNumber: 0,
      boxIndex: 0,
      boxCBM: 0,
      efficiency: 0,
      unpacked: true,
      unpackedReason: item.reason,
    });
  }

  const firstBox = result.boxes[0];

  const row = {
    shipmentId,
    orderId: orderUuid,
    boxId: firstBox?.boxId || null,
    boxNumber: firstBox?.boxNumber,
    packedCount: result.boxes.reduce((acc, b) => acc + b.items.reduce((a, i) => a + i.quantity, 0), 0),
    efficiency: String(firstBox?.efficiency || 0),
    totalCBM: String(result.totalCBM),
    groupLabel: result.groupLabel,
    items,
  };

  await db.insert(packingResults).values(row);
}
