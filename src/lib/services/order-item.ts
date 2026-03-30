import { db } from '@/lib/db';
import { orderItems, orders, shipments } from '@/lib/db/schema';
import { eq, and, inArray, asc, sql } from 'drizzle-orm';

type CreateOrderItemDto = {
  orderId: string;
  sku: string;
  quantity: number;
  productId?: string | null;
};

const CHUNK_SIZE = 500;

export async function create(shipmentId: string, dto: CreateOrderItemDto) {
  return db.transaction(async (tx) => {
    let order = await tx.query.orders.findFirst({
      where: and(eq(orders.shipmentId, shipmentId), eq(orders.orderId, dto.orderId)),
    });

    if (!order) {
      const [created] = await tx
        .insert(orders)
        .values({ shipmentId, orderId: dto.orderId, status: 'PENDING' })
        .returning();
      order = created;
    }

    const [item] = await tx
      .insert(orderItems)
      .values({
        shipmentId,
        orderId: dto.orderId,
        orderIdentifier: dto.orderId,
        sku: dto.sku,
        quantity: dto.quantity,
        productId: dto.productId ?? null,
      })
      .returning();

    return item;
  });
}

export async function findAll(shipmentId: string) {
  return db.query.orderItems.findMany({
    where: eq(orderItems.shipmentId, shipmentId),
    with: { product: true },
  });
}

export async function findPaginated(
  shipmentId: string,
  page: number,
  limit: number,
): Promise<{ items: (typeof orderItems.$inferSelect)[]; totalOrders: number; page: number; limit: number }> {
  const [totalRow] = await db
    .select({ totalOrders: sql<number>`COUNT(DISTINCT ${orderItems.orderIdentifier})` })
    .from(orderItems)
    .where(eq(orderItems.shipmentId, shipmentId));

  const totalOrders = Number(totalRow?.totalOrders ?? 0);

  const orderKeys = await db
    .selectDistinct({ orderKey: orderItems.orderIdentifier })
    .from(orderItems)
    .where(eq(orderItems.shipmentId, shipmentId))
    .orderBy(asc(orderItems.orderIdentifier))
    .limit(limit)
    .offset((page - 1) * limit);

  const keys = orderKeys.map((r) => r.orderKey).filter((k): k is string => k !== null);

  if (keys.length === 0) {
    return { items: [], totalOrders, page, limit };
  }

  const items = await db.query.orderItems.findMany({
    where: and(
      eq(orderItems.shipmentId, shipmentId),
      inArray(orderItems.orderIdentifier, keys),
    ),
  });

  return { items, totalOrders, page, limit };
}

export async function remove(id: string): Promise<boolean> {
  const [row] = await db.delete(orderItems).where(eq(orderItems.id, id)).returning();
  return !!row;
}

export async function removeAll(shipmentId: string): Promise<void> {
  await db.delete(orderItems).where(eq(orderItems.shipmentId, shipmentId));
}

export async function createBulk(
  shipmentId: string,
  dtos: CreateOrderItemDto[],
): Promise<{ outbounds: (typeof orderItems.$inferSelect)[] }> {
  return db.transaction(async (tx) => {
    const uniqueOrderIds = [...new Set(dtos.map((d) => d.orderId))];

    const existingOrders = uniqueOrderIds.length > 0
      ? await tx
          .select()
          .from(orders)
          .where(and(eq(orders.shipmentId, shipmentId), inArray(orders.orderId, uniqueOrderIds)))
      : [];

    const orderMap = new Map(existingOrders.map((o) => [o.orderId, o]));

    const newOrderIds = uniqueOrderIds.filter((id) => !orderMap.has(id));
    for (let i = 0; i < newOrderIds.length; i += CHUNK_SIZE) {
      const chunk = newOrderIds.slice(i, i + CHUNK_SIZE);
      const created = await tx
        .insert(orders)
        .values(chunk.map((orderId) => ({ shipmentId, orderId, status: 'PENDING' as const })))
        .returning();
      for (const o of created) orderMap.set(o.orderId, o);
    }

    const rows = dtos.map((dto) => {
      const order = orderMap.get(dto.orderId)!;
      return {
        shipmentId,
        orderId: order.id,
        orderIdentifier: dto.orderId,
        sku: dto.sku,
        quantity: dto.quantity,
        productId: dto.productId ?? null,
      };
    });

    const savedOutbounds: (typeof orderItems.$inferSelect)[] = [];
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const saved = await tx.insert(orderItems).values(chunk).returning();
      savedOutbounds.push(...saved);
    }

    return { outbounds: savedOutbounds };
  });
}

export async function getConfigurationSummary(shipmentId: string) {
  const allItems = await db.query.orderItems.findMany({
    where: eq(orderItems.shipmentId, shipmentId),
    with: { product: true },
  });

  const skuToGroupId = new Map<string, string | null>();
  for (const item of allItems) {
    if (item.product && !skuToGroupId.has(item.sku)) {
      skuToGroupId.set(item.sku, item.product.productGroupId);
    }
  }

  const orderMap = new Map<string, { sku: string; productName?: string; quantity: number }[]>();
  for (const item of allItems) {
    const orderKey = item.orderIdentifier || item.orderId;
    if (!orderMap.has(orderKey)) orderMap.set(orderKey, []);
    orderMap.get(orderKey)!.push({
      sku: item.sku,
      productName: item.product?.name,
      quantity: item.quantity,
    });
  }

  const configMap = new Map<
    string,
    { skuItems: { sku: string; productName?: string; quantity: number }[]; orderIds: string[] }
  >();

  for (const [orderId, items] of orderMap.entries()) {
    const sorted = [...items].sort(
      (a, b) => a.sku.localeCompare(b.sku) || a.quantity - b.quantity,
    );
    const skuKey = sorted.map((i) => `${i.sku}:${i.quantity}`).join('|');

    if (!configMap.has(skuKey)) {
      configMap.set(skuKey, { skuItems: sorted, orderIds: [] });
    }
    configMap.get(skuKey)!.orderIds.push(orderId);
  }

  const configurations = Array.from(configMap.entries())
    .map(([skuKey, { skuItems, orderIds }]) => {
      let largestItem: {
        width: number;
        length: number;
        height: number;
        volume: number;
        productName?: string;
      } | null = null;

      const orderIdSet = new Set(orderIds);
      for (const item of allItems) {
        const orderKey = item.orderIdentifier || item.orderId;
        if (!orderIdSet.has(orderKey)) continue;
        if (!item.product) continue;

        const width = Number(item.product.width);
        const length = Number(item.product.length);
        const height = Number(item.product.height);
        const volume = width * length * height;

        if (!largestItem || volume > largestItem.volume) {
          largestItem = { width, length, height, volume, productName: item.product.name };
        }
      }

      const groupIds = skuItems
        .map((s) => skuToGroupId.get(s.sku))
        .filter((g): g is string => g != null);
      const productGroupId = groupIds.length > 0 ? groupIds[0] : null;

      return {
        skuKey,
        skuItems,
        orderCount: orderIds.length,
        orderIds,
        largestItem,
        productGroupId,
      };
    })
    .sort((a, b) => b.skuItems.length - a.skuItems.length || b.orderCount - a.orderCount);

  return {
    totalOrders: orderMap.size,
    configurations,
  };
}

export async function createOrderItemsWithOrder(
  shipmentId: string,
  dtos: { orderId: string; sku: string; quantity: number; productId?: string | null }[],
): Promise<{ outbounds: (typeof orderItems.$inferSelect)[] }> {
  return db.transaction(async (tx) => {
    const uniqueOrderIds = [...new Set(dtos.map((d) => d.orderId))];

    const existingOrders = uniqueOrderIds.length > 0
      ? await tx
          .select()
          .from(orders)
          .where(and(eq(orders.shipmentId, shipmentId), inArray(orders.orderId, uniqueOrderIds)))
      : [];

    const orderMap = new Map(existingOrders.map((o) => [o.orderId, o]));

    const newOrderIds = uniqueOrderIds.filter((id) => !orderMap.has(id));
    for (let i = 0; i < newOrderIds.length; i += CHUNK_SIZE) {
      const chunk = newOrderIds.slice(i, i + CHUNK_SIZE);
      const created = await tx
        .insert(orders)
        .values(chunk.map((orderId) => ({ shipmentId, orderId, status: 'PENDING' as const })))
        .returning();
      for (const o of created) orderMap.set(o.orderId, o);
    }

    const rows = dtos.map((dto) => {
      const order = orderMap.get(dto.orderId)!;
      return {
        shipmentId,
        orderId: order.id,
        orderIdentifier: dto.orderId,
        sku: dto.sku,
        quantity: dto.quantity,
        productId: dto.productId ?? null,
      };
    });

    const savedOutbounds: (typeof orderItems.$inferSelect)[] = [];
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const saved = await tx.insert(orderItems).values(chunk).returning();
      savedOutbounds.push(...saved);
    }

    return { outbounds: savedOutbounds };
  });
}
