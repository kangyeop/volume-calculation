import { db } from '@/lib/db';
import { products, productGroups } from '@/lib/db/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
import type { AircapType } from '@/types';

export type CreateProductDto = {
  sku: string;
  name: string;
  width: number;
  length: number;
  height: number;
  barcode?: boolean;
  aircapType?: AircapType | null;
};

export async function findAll(productGroupId: string) {
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.productGroupId, productGroupId))
    .orderBy(desc(products.createdAt));
  return rows.map(parseProduct);
}

export async function findAllForMatching() {
  const rows = await db.select().from(products).orderBy(desc(products.createdAt));
  return rows.map(parseProduct);
}

export async function findAllWithGroup() {
  const rows = await db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      width: products.width,
      length: products.length,
      height: products.height,
      barcode: products.barcode,
      aircapType: products.aircapType,
      productGroupId: products.productGroupId,
      productGroupName: productGroups.name,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .leftJoin(productGroups, eq(products.productGroupId, productGroups.id))
    .orderBy(desc(products.createdAt));
  return rows.map((row) => ({
    ...row,
    width: Number(row.width),
    length: Number(row.length),
    height: Number(row.height),
  }));
}

export async function findOne(id: string) {
  const row = await db.query.products.findFirst({ where: eq(products.id, id) });
  return row ? parseProduct(row) : null;
}

export async function findBySku(sku: string) {
  const rows = await db.select().from(products).where(eq(products.sku, sku));
  return rows.map(parseProduct);
}

export async function create(productGroupId: string, dto: CreateProductDto) {
  const [row] = await db
    .insert(products)
    .values({ ...dto, productGroupId, width: String(dto.width), length: String(dto.length), height: String(dto.height) })
    .returning();
  return parseProduct(row);
}

export async function update(id: string, dto: Partial<CreateProductDto>) {
  const { width, length, height, barcode, aircapType, ...rest } = dto;
  const values: Partial<typeof products.$inferInsert> = { ...rest };
  if (width !== undefined) values.width = String(width);
  if (length !== undefined) values.length = String(length);
  if (height !== undefined) values.height = String(height);
  if (barcode !== undefined) values.barcode = barcode;
  if (aircapType !== undefined) values.aircapType = aircapType;
  const [row] = await db.update(products).set(values).where(eq(products.id, id)).returning();
  return parseProduct(row);
}

export async function remove(id: string) {
  const [row] = await db.delete(products).where(eq(products.id, id)).returning();
  return !!row;
}

export async function createBulk(productGroupId: string, dtos: CreateProductDto[]) {
  if (dtos.length === 0) return [];
  const values = dtos.map((dto) => ({
    ...dto,
    productGroupId,
    width: String(dto.width),
    length: String(dto.length),
    height: String(dto.height),
    barcode: dto.barcode ?? false,
    aircapType: dto.aircapType ?? null,
  }));
  const rows = await db
    .insert(products)
    .values(values)
    .onConflictDoUpdate({
      target: products.sku,
      set: {
        name: products.name,
        width: products.width,
        length: products.length,
        height: products.height,
        barcode: products.barcode,
        aircapType: products.aircapType,
      },
    })
    .returning();
  return rows.map(parseProduct);
}

export async function removeBulk(ids: string[]) {
  if (ids.length === 0) return;
  await db.delete(products).where(inArray(products.id, ids));
}

function parseProduct(row: typeof products.$inferSelect) {
  return {
    ...row,
    width: Number(row.width),
    length: Number(row.length),
    height: Number(row.height),
  };
}
