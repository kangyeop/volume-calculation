import { db } from '@/lib/db';
import { globalProducts } from '@/lib/db/schema';
import { eq, and, inArray, desc, sql } from 'drizzle-orm';
import { getUserId } from '@/lib/auth';

export type CreateGlobalProductDto = {
  sku: string;
  name: string;
  width: number;
  length: number;
  height: number;
  innerQuantity: number;
};

export async function findAll(globalProductGroupId: string) {
  const userId = await getUserId();
  const rows = await db
    .select()
    .from(globalProducts)
    .where(
      and(
        eq(globalProducts.globalProductGroupId, globalProductGroupId),
        eq(globalProducts.userId, userId),
      ),
    )
    .orderBy(desc(globalProducts.createdAt));
  return rows.map(parseGlobalProduct);
}

export async function findOne(id: string) {
  const userId = await getUserId();
  const row = await db.query.globalProducts.findFirst({
    where: and(eq(globalProducts.id, id), eq(globalProducts.userId, userId)),
  });
  return row ? parseGlobalProduct(row) : null;
}

export async function create(globalProductGroupId: string, dto: CreateGlobalProductDto) {
  const userId = await getUserId();
  const [row] = await db
    .insert(globalProducts)
    .values({
      sku: dto.sku,
      name: dto.name,
      innerQuantity: dto.innerQuantity,
      globalProductGroupId,
      userId,
      width: String(dto.width),
      length: String(dto.length),
      height: String(dto.height),
    })
    .returning();
  return parseGlobalProduct(row);
}

export async function update(id: string, dto: Partial<CreateGlobalProductDto>) {
  const userId = await getUserId();
  const { width, length, height, innerQuantity, ...rest } = dto;
  const values: Partial<typeof globalProducts.$inferInsert> = { ...rest };
  if (width !== undefined) values.width = String(width);
  if (length !== undefined) values.length = String(length);
  if (height !== undefined) values.height = String(height);
  if (innerQuantity !== undefined) values.innerQuantity = innerQuantity;
  const [row] = await db
    .update(globalProducts)
    .set(values)
    .where(and(eq(globalProducts.id, id), eq(globalProducts.userId, userId)))
    .returning();
  return parseGlobalProduct(row);
}

export async function remove(id: string) {
  const userId = await getUserId();
  const [row] = await db
    .delete(globalProducts)
    .where(and(eq(globalProducts.id, id), eq(globalProducts.userId, userId)))
    .returning();
  return !!row;
}

export async function createBulk(globalProductGroupId: string, dtos: CreateGlobalProductDto[]) {
  if (dtos.length === 0) return [];
  const userId = await getUserId();
  const values = dtos.map((dto) => ({
    sku: dto.sku,
    name: dto.name,
    innerQuantity: dto.innerQuantity,
    globalProductGroupId,
    userId,
    width: String(dto.width),
    length: String(dto.length),
    height: String(dto.height),
  }));
  const rows = await db
    .insert(globalProducts)
    .values(values)
    .onConflictDoUpdate({
      target: [globalProducts.userId, globalProducts.sku],
      set: {
        name: sql`excluded.name`,
        width: sql`excluded.width`,
        length: sql`excluded.length`,
        height: sql`excluded.height`,
        innerQuantity: sql`excluded.inner_quantity`,
      },
    })
    .returning();
  return rows.map(parseGlobalProduct);
}

export async function removeBulk(ids: string[]) {
  if (ids.length === 0) return;
  const userId = await getUserId();
  await db
    .delete(globalProducts)
    .where(and(inArray(globalProducts.id, ids), eq(globalProducts.userId, userId)));
}

function parseGlobalProduct(row: typeof globalProducts.$inferSelect) {
  return {
    ...row,
    width: Number(row.width),
    length: Number(row.length),
    height: Number(row.height),
  };
}
