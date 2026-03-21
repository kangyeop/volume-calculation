import { db } from '@/lib/db';
import { outboundItems, orders, outboundBatches } from '@/lib/db/schema';
import { eq, and, inArray, asc, sql, count } from 'drizzle-orm';

type CreateOutboundDto = {
  orderId: string;
  sku: string;
  quantity: number;
  productId?: string | null;
};

const CHUNK_SIZE = 500;

export async function create(outboundBatchId: string, dto: CreateOutboundDto) {
  return db.transaction(async (tx) => {
    let order = await tx.query.orders.findFirst({
      where: and(eq(orders.outboundBatchId, outboundBatchId), eq(orders.orderId, dto.orderId)),
    });

    if (!order) {
      const [created] = await tx
        .insert(orders)
        .values({ outboundBatchId, orderId: dto.orderId, status: 'PENDING' })
        .returning();
      order = created;
    }

    const [item] = await tx
      .insert(outboundItems)
      .values({
        outboundBatchId,
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

export async function findAll(outboundBatchId: string) {
  return db.query.outboundItems.findMany({
    where: eq(outboundItems.outboundBatchId, outboundBatchId),
    with: { product: true },
  });
}

export async function findPaginated(
  outboundBatchId: string,
  page: number,
  limit: number,
): Promise<{ items: (typeof outboundItems.$inferSelect)[]; totalOrders: number; page: number; limit: number }> {
  const [totalRow] = await db
    .select({ totalOrders: sql<number>`COUNT(DISTINCT ${outboundItems.orderIdentifier})` })
    .from(outboundItems)
    .where(eq(outboundItems.outboundBatchId, outboundBatchId));

  const totalOrders = Number(totalRow?.totalOrders ?? 0);

  const orderKeys = await db
    .selectDistinct({ orderKey: outboundItems.orderIdentifier })
    .from(outboundItems)
    .where(eq(outboundItems.outboundBatchId, outboundBatchId))
    .orderBy(asc(outboundItems.orderIdentifier))
    .limit(limit)
    .offset((page - 1) * limit);

  const keys = orderKeys.map((r) => r.orderKey).filter((k): k is string => k !== null);

  if (keys.length === 0) {
    return { items: [], totalOrders, page, limit };
  }

  const items = await db.query.outboundItems.findMany({
    where: and(
      eq(outboundItems.outboundBatchId, outboundBatchId),
      inArray(outboundItems.orderIdentifier, keys),
    ),
  });

  return { items, totalOrders, page, limit };
}

export async function remove(id: string): Promise<boolean> {
  const [row] = await db.delete(outboundItems).where(eq(outboundItems.id, id)).returning();
  return !!row;
}

export async function removeAll(outboundBatchId: string): Promise<void> {
  await db.delete(outboundItems).where(eq(outboundItems.outboundBatchId, outboundBatchId));
}

export async function createBulk(
  outboundBatchId: string,
  dtos: CreateOutboundDto[],
): Promise<{ outbounds: (typeof outboundItems.$inferSelect)[] }> {
  return db.transaction(async (tx) => {
    const uniqueOrderIds = [...new Set(dtos.map((d) => d.orderId))];

    const existingOrders = uniqueOrderIds.length > 0
      ? await tx
          .select()
          .from(orders)
          .where(and(eq(orders.outboundBatchId, outboundBatchId), inArray(orders.orderId, uniqueOrderIds)))
      : [];

    const orderMap = new Map(existingOrders.map((o) => [o.orderId, o]));

    const newOrderIds = uniqueOrderIds.filter((id) => !orderMap.has(id));
    for (let i = 0; i < newOrderIds.length; i += CHUNK_SIZE) {
      const chunk = newOrderIds.slice(i, i + CHUNK_SIZE);
      const created = await tx
        .insert(orders)
        .values(chunk.map((orderId) => ({ outboundBatchId, orderId, status: 'PENDING' as const })))
        .returning();
      for (const o of created) orderMap.set(o.orderId, o);
    }

    const rows = dtos.map((dto) => {
      const order = orderMap.get(dto.orderId)!;
      return {
        outboundBatchId,
        orderId: order.id,
        orderIdentifier: dto.orderId,
        sku: dto.sku,
        quantity: dto.quantity,
        productId: dto.productId ?? null,
      };
    });

    const savedOutbounds: (typeof outboundItems.$inferSelect)[] = [];
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const saved = await tx.insert(outboundItems).values(chunk).returning();
      savedOutbounds.push(...saved);
    }

    return { outbounds: savedOutbounds };
  });
}

export async function getConfigurationSummary(outboundBatchId: string) {
  const allOutbounds = await db.query.outboundItems.findMany({
    where: eq(outboundItems.outboundBatchId, outboundBatchId),
    with: { product: true },
  });

  const orderMap = new Map<string, { sku: string; productName?: string; quantity: number }[]>();
  for (const outbound of allOutbounds) {
    const orderKey = outbound.orderIdentifier || outbound.orderId;
    if (!orderMap.has(orderKey)) orderMap.set(orderKey, []);
    orderMap.get(orderKey)!.push({
      sku: outbound.sku,
      productName: outbound.product?.name,
      quantity: outbound.quantity,
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

      for (const outbound of allOutbounds) {
        const orderKey = outbound.orderIdentifier || outbound.orderId;
        if (!orderIds.includes(orderKey)) continue;
        if (!outbound.product) continue;

        const width = Number(outbound.product.width);
        const length = Number(outbound.product.length);
        const height = Number(outbound.product.height);
        const volume = width * length * height;

        if (!largestItem || volume > largestItem.volume) {
          largestItem = { width, length, height, volume, productName: outbound.product.name };
        }
      }

      return {
        skuKey,
        skuItems,
        orderCount: orderIds.length,
        orderIds,
        largestItem,
      };
    })
    .sort((a, b) => b.skuItems.length - a.skuItems.length || b.orderCount - a.orderCount);

  return {
    totalOrders: orderMap.size,
    configurations,
  };
}

export async function createOutboundsWithOrder(
  outboundBatchId: string,
  dtos: { orderId: string; sku: string; quantity: number; productId?: string | null }[],
): Promise<{ outbounds: (typeof outboundItems.$inferSelect)[] }> {
  return db.transaction(async (tx) => {
    const uniqueOrderIds = [...new Set(dtos.map((d) => d.orderId))];

    const existingOrders = uniqueOrderIds.length > 0
      ? await tx
          .select()
          .from(orders)
          .where(and(eq(orders.outboundBatchId, outboundBatchId), inArray(orders.orderId, uniqueOrderIds)))
      : [];

    const orderMap = new Map(existingOrders.map((o) => [o.orderId, o]));

    const newOrderIds = uniqueOrderIds.filter((id) => !orderMap.has(id));
    for (let i = 0; i < newOrderIds.length; i += CHUNK_SIZE) {
      const chunk = newOrderIds.slice(i, i + CHUNK_SIZE);
      const created = await tx
        .insert(orders)
        .values(chunk.map((orderId) => ({ outboundBatchId, orderId, status: 'PENDING' as const })))
        .returning();
      for (const o of created) orderMap.set(o.orderId, o);
    }

    const rows = dtos.map((dto) => {
      const order = orderMap.get(dto.orderId)!;
      return {
        outboundBatchId,
        orderId: order.id,
        orderIdentifier: dto.orderId,
        sku: dto.sku,
        quantity: dto.quantity,
        productId: dto.productId ?? null,
      };
    });

    const savedOutbounds: (typeof outboundItems.$inferSelect)[] = [];
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const saved = await tx.insert(outboundItems).values(chunk).returning();
      savedOutbounds.push(...saved);
    }

    return { outbounds: savedOutbounds };
  });
}
