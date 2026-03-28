import { db } from '@/lib/db';
import { shipments } from '@/lib/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getUserId } from '@/lib/auth';

export async function findAll(type?: 'SHIPMENT' | 'SETTLEMENT') {
  const userId = await getUserId();
  const conditions = type
    ? and(eq(shipments.userId, userId), eq(shipments.type, type))
    : eq(shipments.userId, userId);
  return db
    .select({
      id: shipments.id,
      name: shipments.name,
      status: shipments.status,
      type: shipments.type,
      note: shipments.note,
      createdAt: shipments.createdAt,
      updatedAt: shipments.updatedAt,
    })
    .from(shipments)
    .where(conditions)
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

export async function generateBatchName(filename: string, type: 'SHIPMENT' | 'SETTLEMENT' = 'SHIPMENT'): Promise<string> {
  const userId = await getUserId();
  const now = new Date();
  const today = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const rows = await db
    .select({ id: shipments.id })
    .from(shipments)
    .where(and(gte(shipments.createdAt, startOfDay), lte(shipments.createdAt, endOfDay), eq(shipments.userId, userId), eq(shipments.type, type)));

  const count = rows.length;
  const cleanFilename = filename.replace(/\.[^/.]+$/, '');
  return `${today}-${count + 1}-${cleanFilename}`;
}

export async function create(name: string, type: 'SHIPMENT' | 'SETTLEMENT' = 'SHIPMENT') {
  const userId = await getUserId();
  const [batch] = await db.insert(shipments).values({ name, userId, type }).returning();
  return batch;
}

export async function confirm(id: string) {
  const userId = await getUserId();
  const [shipment] = await db
    .update(shipments)
    .set({ status: 'CONFIRMED' })
    .where(and(eq(shipments.id, id), eq(shipments.userId, userId)))
    .returning();
  return shipment;
}

export async function unconfirm(id: string) {
  const userId = await getUserId();
  const [shipment] = await db
    .update(shipments)
    .set({ status: 'PACKING' })
    .where(and(eq(shipments.id, id), eq(shipments.userId, userId)))
    .returning();
  return shipment;
}

export async function updateNote(id: string, note: string | null) {
  const userId = await getUserId();
  const [shipment] = await db
    .update(shipments)
    .set({ note })
    .where(and(eq(shipments.id, id), eq(shipments.userId, userId)))
    .returning();
  return shipment;
}

export async function remove(id: string): Promise<void> {
  const userId = await getUserId();
  await db.delete(shipments).where(and(eq(shipments.id, id), eq(shipments.userId, userId)));
}
