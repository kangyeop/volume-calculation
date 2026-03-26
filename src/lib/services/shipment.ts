import { db } from '@/lib/db';
import { shipments, orderItems, orders, packingResults } from '@/lib/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export async function findAll() {
  return db
    .select({
      id: shipments.id,
      name: shipments.name,
      status: shipments.status,
      note: shipments.note,
      createdAt: shipments.createdAt,
      updatedAt: shipments.updatedAt,
    })
    .from(shipments)
    .orderBy(desc(shipments.createdAt));
}

export async function findOne(id: string) {
  return db.query.shipments.findFirst({
    where: eq(shipments.id, id),
    with: {
      orders: true,
      orderItems: true,
      packingResults: true,
    },
  });
}

export async function generateBatchName(filename: string): Promise<string> {
  const now = new Date();
  const today = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const rows = await db
    .select({ id: shipments.id })
    .from(shipments)
    .where(and(gte(shipments.createdAt, startOfDay), lte(shipments.createdAt, endOfDay)));

  const count = rows.length;
  const cleanFilename = filename.replace(/\.[^/.]+$/, '');
  return `${today}-${count + 1}-${cleanFilename}`;
}

export async function create(name: string) {
  const [batch] = await db.insert(shipments).values({ name }).returning();
  return batch;
}

export async function confirm(id: string) {
  const [shipment] = await db
    .update(shipments)
    .set({ status: 'CONFIRMED' })
    .where(eq(shipments.id, id))
    .returning();
  return shipment;
}

export async function unconfirm(id: string) {
  const [shipment] = await db
    .update(shipments)
    .set({ status: 'PACKING' })
    .where(eq(shipments.id, id))
    .returning();
  return shipment;
}

export async function updateNote(id: string, note: string | null) {
  const [shipment] = await db
    .update(shipments)
    .set({ note })
    .where(eq(shipments.id, id))
    .returning();
  return shipment;
}

export async function remove(id: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(packingResults).where(eq(packingResults.shipmentId, id));
    await tx.delete(orderItems).where(eq(orderItems.shipmentId, id));
    await tx.delete(orders).where(eq(orders.shipmentId, id));
    await tx.delete(shipments).where(eq(shipments.id, id));
  });
}
