import { db } from '@/lib/db';
import { globalOrderItems, globalOrders, globalProducts } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { assertOwnership } from '@/lib/services/global-shipment';

const CHUNK_SIZE = 500;

export type CreateGlobalOrderItemDto = {
  orderNumber: string;
  sku: string;
  quantity: number;
  globalProductId?: string | null;
  lotNumber?: string | null;
  expirationDate?: string | null;
};

export async function findAll(globalShipmentId: string) {
  await assertOwnership(globalShipmentId);
  return db.query.globalOrderItems.findMany({
    where: eq(globalOrderItems.globalShipmentId, globalShipmentId),
    with: { product: true, order: true },
  });
}

export async function findBySku(globalShipmentId: string, sku: string) {
  await assertOwnership(globalShipmentId);
  return db.query.globalOrderItems.findMany({
    where: and(
      eq(globalOrderItems.globalShipmentId, globalShipmentId),
      eq(globalOrderItems.sku, sku),
    ),
    with: { product: true, order: true },
  });
}

export async function matchProductsBySku(userId: string, skus: string[]) {
  if (skus.length === 0) return new Map<string, typeof globalProducts.$inferSelect>();
  const trimmed = [...new Set(skus.map((s) => s.trim()).filter((s) => s.length > 0))];
  if (trimmed.length === 0) return new Map<string, typeof globalProducts.$inferSelect>();
  const rows = await db
    .select()
    .from(globalProducts)
    .where(and(eq(globalProducts.userId, userId), inArray(globalProducts.sku, trimmed)));
  return new Map(rows.map((r) => [r.sku, r]));
}

export async function remove(id: string): Promise<boolean> {
  const item = await db.query.globalOrderItems.findFirst({
    where: eq(globalOrderItems.id, id),
  });
  if (!item) return false;
  await assertOwnership(item.globalShipmentId);
  const [row] = await db
    .delete(globalOrderItems)
    .where(eq(globalOrderItems.id, id))
    .returning();
  return !!row;
}

export async function removeAll(globalShipmentId: string): Promise<void> {
  await assertOwnership(globalShipmentId);
  await db
    .delete(globalOrderItems)
    .where(eq(globalOrderItems.globalShipmentId, globalShipmentId));
}

export async function createOrderItemsWithOrder(
  globalShipmentId: string,
  dtos: CreateGlobalOrderItemDto[],
): Promise<{ items: (typeof globalOrderItems.$inferSelect)[] }> {
  await assertOwnership(globalShipmentId);
  if (dtos.length === 0) return { items: [] };

  return db.transaction(async (tx) => {
    const aggregated = new Map<string, CreateGlobalOrderItemDto>();
    for (const dto of dtos) {
      const orderNumber = dto.orderNumber.trim();
      const sku = dto.sku.trim();
      if (!orderNumber || !sku) continue;
      const lotNumber = dto.lotNumber ?? null;
      const expirationDate = dto.expirationDate ?? null;
      const key = `${orderNumber}::${sku}::${lotNumber ?? ''}::${expirationDate ?? ''}`;
      const existing = aggregated.get(key);
      if (existing) {
        existing.quantity += dto.quantity;
      } else {
        aggregated.set(key, {
          orderNumber,
          sku,
          quantity: dto.quantity,
          globalProductId: dto.globalProductId ?? null,
          lotNumber,
          expirationDate,
        });
      }
    }

    const uniqueOrderNumbers = [...new Set([...aggregated.values()].map((d) => d.orderNumber))];

    const existingOrders = uniqueOrderNumbers.length > 0
      ? await tx
          .select()
          .from(globalOrders)
          .where(
            and(
              eq(globalOrders.globalShipmentId, globalShipmentId),
              inArray(globalOrders.orderNumber, uniqueOrderNumbers),
            ),
          )
      : [];

    const orderMap = new Map(existingOrders.map((o) => [o.orderNumber, o]));

    const newOrderNumbers = uniqueOrderNumbers.filter((n) => !orderMap.has(n));
    for (let i = 0; i < newOrderNumbers.length; i += CHUNK_SIZE) {
      const chunk = newOrderNumbers.slice(i, i + CHUNK_SIZE);
      const created = await tx
        .insert(globalOrders)
        .values(
          chunk.map((orderNumber) => ({
            globalShipmentId,
            orderNumber,
            status: 'PENDING' as const,
          })),
        )
        .returning();
      for (const o of created) orderMap.set(o.orderNumber, o);
    }

    const rows = [...aggregated.values()].map((dto) => {
      const order = orderMap.get(dto.orderNumber)!;
      return {
        globalShipmentId,
        globalOrderId: order.id,
        sku: dto.sku,
        quantity: dto.quantity,
        globalProductId: dto.globalProductId ?? null,
        lotNumber: dto.lotNumber ?? null,
        expirationDate: dto.expirationDate ?? null,
      };
    });

    const saved: (typeof globalOrderItems.$inferSelect)[] = [];
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const inserted = await tx.insert(globalOrderItems).values(chunk).returning();
      saved.push(...inserted);
    }

    return { items: saved };
  });
}
