import { db } from '@/lib/db';
import { products, productGroups } from '@/lib/db/schema';
import { eq, and, inArray, desc, sql } from 'drizzle-orm';
import { getUserId } from '@/lib/auth';
export type CreateProductDto = {
  sku: string;
  name: string;
  width: number;
  length: number;
  height: number;
  barcode?: boolean;
  aircap?: boolean;
};

export async function findAll(productGroupId: string) {
  const userId = await getUserId();
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.productGroupId, productGroupId), eq(products.userId, userId)))
    .orderBy(desc(products.createdAt));
  return rows.map(parseProduct);
}

export async function findAllForMatching() {
  const userId = await getUserId();
  const rows = await db.select().from(products).where(eq(products.userId, userId)).orderBy(desc(products.createdAt));
  return rows.map(parseProduct);
}

export async function findAllWithGroup() {
  const userId = await getUserId();
  const rows = await db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      width: products.width,
      length: products.length,
      height: products.height,
      barcode: products.barcode,
      aircap: products.aircap,
      productGroupId: products.productGroupId,
      productGroupName: productGroups.name,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .leftJoin(productGroups, eq(products.productGroupId, productGroups.id))
    .where(eq(products.userId, userId))
    .orderBy(desc(products.createdAt));
  return rows.map((row) => ({
    ...row,
    width: Number(row.width),
    length: Number(row.length),
    height: Number(row.height),
  }));
}

export async function findOne(id: string) {
  const userId = await getUserId();
  const row = await db.query.products.findFirst({ where: and(eq(products.id, id), eq(products.userId, userId)) });
  return row ? parseProduct(row) : null;
}

export async function findBySku(sku: string) {
  const userId = await getUserId();
  const rows = await db.select().from(products).where(and(eq(products.sku, sku), eq(products.userId, userId)));
  return rows.map(parseProduct);
}

export async function create(productGroupId: string, dto: CreateProductDto) {
  const userId = await getUserId();
  const [row] = await db
    .insert(products)
    .values({ ...dto, productGroupId, userId, width: String(dto.width), length: String(dto.length), height: String(dto.height) })
    .returning();
  return parseProduct(row);
}

export async function update(id: string, dto: Partial<CreateProductDto>) {
  const userId = await getUserId();
  const { width, length, height, barcode, aircap, ...rest } = dto;
  const values: Partial<typeof products.$inferInsert> = { ...rest };
  if (width !== undefined) values.width = String(width);
  if (length !== undefined) values.length = String(length);
  if (height !== undefined) values.height = String(height);
  if (barcode !== undefined) values.barcode = barcode;
  if (aircap !== undefined) values.aircap = aircap;
  const [row] = await db.update(products).set(values).where(and(eq(products.id, id), eq(products.userId, userId))).returning();
  return parseProduct(row);
}

export async function remove(id: string) {
  const userId = await getUserId();
  const [row] = await db.delete(products).where(and(eq(products.id, id), eq(products.userId, userId))).returning();
  return !!row;
}

export async function createBulk(productGroupId: string, dtos: CreateProductDto[]) {
  if (dtos.length === 0) return [];
  const userId = await getUserId();
  const values = dtos.map((dto) => ({
    ...dto,
    productGroupId,
    userId,
    width: String(dto.width),
    length: String(dto.length),
    height: String(dto.height),
    barcode: dto.barcode ?? false,
    aircap: dto.aircap ?? false,
  }));
  const rows = await db
    .insert(products)
    .values(values)
    .onConflictDoUpdate({
      target: [products.userId, products.sku],
      set: {
        name: sql`excluded.name`,
        width: sql`excluded.width`,
        length: sql`excluded.length`,
        height: sql`excluded.height`,
        barcode: sql`excluded.barcode`,
        aircap: sql`excluded.aircap`,
      },
    })
    .returning();
  return rows.map(parseProduct);
}

export async function removeBulk(ids: string[]) {
  if (ids.length === 0) return;
  const userId = await getUserId();
  await db.delete(products).where(and(inArray(products.id, ids), eq(products.userId, userId)));
}

function parseProduct(row: typeof products.$inferSelect) {
  return {
    ...row,
    width: Number(row.width),
    length: Number(row.length),
    height: Number(row.height),
  };
}
