import { db } from '@/lib/db';
import { orders, orderItems, products } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

type CreateOrderDto = {
  shipmentId: string;
  orderId: string;
  recipientName?: string;
  address?: string;
};

export async function findOrCreate(
  shipmentId: string,
  orderId: string,
  recipientName?: string,
  address?: string,
) {
  const existing = await db.query.orders.findFirst({
    where: and(eq(orders.shipmentId, shipmentId), eq(orders.orderId, orderId)),
  });

  if (existing) return existing;

  const [created] = await db
    .insert(orders)
    .values({ shipmentId, orderId, recipientName, address, status: 'PENDING' })
    .returning();
  return created;
}

export async function findOne(shipmentId: string, orderId: string) {
  return db.query.orders.findFirst({
    where: and(eq(orders.shipmentId, shipmentId), eq(orders.orderId, orderId)),
  });
}

export async function findOneWithItems(shipmentId: string, orderId: string) {
  return db.query.orders.findFirst({
    where: and(eq(orders.shipmentId, shipmentId), eq(orders.orderId, orderId)),
    with: {
      orderItems: {
        with: { product: true },
      },
    },
  });
}

export async function createBulk(dtos: CreateOrderDto[]) {
  if (dtos.length === 0) return [];
  const CHUNK_SIZE = 500;
  const saved: (typeof orders.$inferSelect)[] = [];
  for (let i = 0; i < dtos.length; i += CHUNK_SIZE) {
    const chunk = dtos.slice(i, i + CHUNK_SIZE);
    const rows = await db.insert(orders).values(chunk).returning();
    saved.push(...rows);
  }
  return saved;
}

export async function calculateVolume(shipmentId: string, orderId: string): Promise<number> {
  const items = await db
    .select({
      width: products.width,
      length: products.length,
      height: products.height,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(
      and(
        eq(orderItems.shipmentId, shipmentId),
        eq(orderItems.orderId, orderId),
      ),
    );

  return items.reduce((total, item) => {
    const cbm = (Number(item.width) * Number(item.length) * Number(item.height) * item.quantity) / 1_000_000;
    return total + cbm;
  }, 0);
}

export async function mapProducts(shipmentId: string, orderId: string) {
  const order = await findOne(shipmentId, orderId);
  if (!order) {
    throw new Error(`Order with shipmentId "${shipmentId}" and orderId "${orderId}" not found`);
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(
      and(
        eq(orderItems.shipmentId, shipmentId),
        eq(orderItems.orderId, orderId),
      ),
    );

  let mappedCount = 0;

  await db.transaction(async (tx) => {
    for (const item of items) {
      const [product] = await tx
        .select()
        .from(products)
        .where(eq(products.sku, item.sku))
        .limit(1);

      if (product) {
        await tx
          .update(orderItems)
          .set({ productId: product.id })
          .where(eq(orderItems.id, item.id));
        mappedCount++;
      }
    }
  });

  return mappedCount;
}
