import { db } from '@/lib/db';
import { orders, outboundItems, products } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

type CreateOrderDto = {
  outboundBatchId: string;
  orderId: string;
  recipientName?: string;
  address?: string;
};

export async function findOrCreate(
  outboundBatchId: string,
  orderId: string,
  recipientName?: string,
  address?: string,
) {
  const existing = await db.query.orders.findFirst({
    where: and(eq(orders.outboundBatchId, outboundBatchId), eq(orders.orderId, orderId)),
  });

  if (existing) return existing;

  const [created] = await db
    .insert(orders)
    .values({ outboundBatchId, orderId, recipientName, address, status: 'PENDING' })
    .returning();
  return created;
}

export async function findOne(outboundBatchId: string, orderId: string) {
  return db.query.orders.findFirst({
    where: and(eq(orders.outboundBatchId, outboundBatchId), eq(orders.orderId, orderId)),
  });
}

export async function findOneWithItems(outboundBatchId: string, orderId: string) {
  return db.query.orders.findFirst({
    where: and(eq(orders.outboundBatchId, outboundBatchId), eq(orders.orderId, orderId)),
    with: {
      outboundItems: {
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

export async function calculateVolume(outboundBatchId: string, orderId: string): Promise<number> {
  const items = await db
    .select({
      width: products.width,
      length: products.length,
      height: products.height,
      quantity: outboundItems.quantity,
    })
    .from(outboundItems)
    .innerJoin(products, eq(outboundItems.productId, products.id))
    .where(
      and(
        eq(outboundItems.outboundBatchId, outboundBatchId),
        eq(outboundItems.orderId, orderId),
      ),
    );

  return items.reduce((total, item) => {
    const cbm = (Number(item.width) * Number(item.length) * Number(item.height) * item.quantity) / 1_000_000;
    return total + cbm;
  }, 0);
}

export async function mapProducts(outboundBatchId: string, orderId: string) {
  const order = await findOne(outboundBatchId, orderId);
  if (!order) {
    throw new Error(`Order with batchId "${outboundBatchId}" and orderId "${orderId}" not found`);
  }

  const items = await db
    .select()
    .from(outboundItems)
    .where(
      and(
        eq(outboundItems.outboundBatchId, outboundBatchId),
        eq(outboundItems.orderId, orderId),
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
          .update(outboundItems)
          .set({ productId: product.id })
          .where(eq(outboundItems.id, item.id));
        mappedCount++;
      }
    }
  });

  return mappedCount;
}
