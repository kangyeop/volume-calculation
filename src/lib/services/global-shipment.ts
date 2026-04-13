import { db } from '@/lib/db';
import { globalShipments } from '@/lib/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getUserId } from '@/lib/auth';

export async function findAll() {
  const userId = await getUserId();
  return db
    .select({
      id: globalShipments.id,
      name: globalShipments.name,
      status: globalShipments.status,
      note: globalShipments.note,
      createdAt: globalShipments.createdAt,
      updatedAt: globalShipments.updatedAt,
    })
    .from(globalShipments)
    .where(eq(globalShipments.userId, userId))
    .orderBy(desc(globalShipments.createdAt));
}

export async function findOne(id: string) {
  const userId = await getUserId();
  return db.query.globalShipments.findFirst({
    where: and(eq(globalShipments.id, id), eq(globalShipments.userId, userId)),
    with: {
      orders: true,
      orderItems: true,
      packingResults: true,
    },
  });
}

export async function generateBatchName(filename: string): Promise<string> {
  const userId = await getUserId();
  const now = new Date();
  const today = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const rows = await db
    .select({ id: globalShipments.id })
    .from(globalShipments)
    .where(
      and(
        gte(globalShipments.createdAt, startOfDay),
        lte(globalShipments.createdAt, endOfDay),
        eq(globalShipments.userId, userId),
      ),
    );

  const count = rows.length;
  const cleanFilename = filename.replace(/\.[^/.]+$/, '');
  return `${today}-${count + 1}-${cleanFilename}`;
}

export async function create(name: string) {
  const userId = await getUserId();
  const [shipment] = await db.insert(globalShipments).values({ name, userId }).returning();
  return shipment;
}

export async function updateName(id: string, name: string) {
  const userId = await getUserId();
  const [shipment] = await db
    .update(globalShipments)
    .set({ name })
    .where(and(eq(globalShipments.id, id), eq(globalShipments.userId, userId)))
    .returning();
  return shipment;
}

export async function updateNote(id: string, note: string | null) {
  const userId = await getUserId();
  const [shipment] = await db
    .update(globalShipments)
    .set({ note })
    .where(and(eq(globalShipments.id, id), eq(globalShipments.userId, userId)))
    .returning();
  return shipment;
}

export async function confirm(id: string) {
  const userId = await getUserId();
  const [shipment] = await db
    .update(globalShipments)
    .set({ status: 'CONFIRMED' })
    .where(and(eq(globalShipments.id, id), eq(globalShipments.userId, userId)))
    .returning();
  return shipment;
}

export async function unconfirm(id: string) {
  const userId = await getUserId();
  const [shipment] = await db
    .update(globalShipments)
    .set({ status: 'PACKING' })
    .where(and(eq(globalShipments.id, id), eq(globalShipments.userId, userId)))
    .returning();
  return shipment;
}

export async function remove(id: string): Promise<void> {
  const userId = await getUserId();
  await db
    .delete(globalShipments)
    .where(and(eq(globalShipments.id, id), eq(globalShipments.userId, userId)));
}

export async function assertOwnership(id: string) {
  const userId = await getUserId();
  const shipment = await db.query.globalShipments.findFirst({
    where: and(eq(globalShipments.id, id), eq(globalShipments.userId, userId)),
  });
  if (!shipment) throw new Error('Global shipment not found');
  return shipment;
}
