import { db } from '@/lib/db';
import { boxes } from '@/lib/db/schema';
import { eq, desc, isNull, inArray, and } from 'drizzle-orm';
import { getUserId } from '@/lib/auth';

type CreateBoxDto = {
  name: string;
  boxGroupId?: string;
  width: number;
  length: number;
  height: number;
  price?: number;
  stock?: number;
};

const COLUMN_MAP: Record<string, string> = {
  '박스명': 'name',
  '가로': 'width',
  '세로': 'length',
  '높이': 'height',
  '가격': 'price',
  '재고': 'stock',
};

export async function findAll() {
  const userId = await getUserId();
  const rows = await db.query.boxes.findMany({
    where: eq(boxes.userId, userId),
    orderBy: [desc(boxes.createdAt)],
    with: { boxGroup: true },
  });
  return rows.map(parseBox);
}

export async function findOne(id: string) {
  const row = await db.query.boxes.findFirst({ where: eq(boxes.id, id) });
  return row ? parseBox(row) : null;
}

export async function findByGroupId(groupId: string) {
  const rows = await db
    .select()
    .from(boxes)
    .where(eq(boxes.boxGroupId, groupId))
    .orderBy(desc(boxes.createdAt));
  return rows.map(parseBox);
}

export async function findByGroupIds(groupIds: string[]) {
  if (groupIds.length === 0) return new Map<string, ReturnType<typeof parseBox>[]>();
  const rows = await db
    .select()
    .from(boxes)
    .where(inArray(boxes.boxGroupId, groupIds))
    .orderBy(desc(boxes.createdAt));
  const map = new Map<string, ReturnType<typeof parseBox>[]>();
  for (const row of rows) {
    const parsed = parseBox(row);
    const key = row.boxGroupId!;
    const arr = map.get(key);
    if (arr) arr.push(parsed);
    else map.set(key, [parsed]);
  }
  return map;
}

export async function findUnassigned() {
  const userId = await getUserId();
  const rows = await db.query.boxes.findMany({
    where: and(isNull(boxes.boxGroupId), eq(boxes.userId, userId)),
    orderBy: [desc(boxes.createdAt)],
    with: { boxGroup: true },
  });
  return rows.map(parseBox);
}

export async function create(dto: CreateBoxDto) {
  const userId = await getUserId();
  const [row] = await db
    .insert(boxes)
    .values({
      ...dto,
      userId,
      boxGroupId: dto.boxGroupId ?? null,
      width: String(dto.width),
      length: String(dto.length),
      height: String(dto.height),
      price: dto.price !== undefined ? String(dto.price) : undefined,
      stock: dto.stock ?? 0,
    })
    .returning();
  return parseBox(row);
}

export async function update(id: string, dto: Partial<CreateBoxDto>) {
  const userId = await getUserId();
  const { width, length, height, price, stock, ...rest } = dto;
  const values: Partial<typeof boxes.$inferInsert> = { ...rest };
  if (stock !== undefined) values.stock = stock;
  if (width !== undefined) values.width = String(width);
  if (length !== undefined) values.length = String(length);
  if (height !== undefined) values.height = String(height);
  if (price !== undefined) values.price = String(price);
  const [row] = await db.update(boxes).set(values).where(and(eq(boxes.id, id), eq(boxes.userId, userId))).returning();
  return parseBox(row);
}

export async function remove(id: string) {
  const userId = await getUserId();
  const [row] = await db.delete(boxes).where(and(eq(boxes.id, id), eq(boxes.userId, userId))).returning();
  return !!row;
}

export async function uploadBoxes(
  groupId: string | null,
  parsedData: { headers: string[]; rows: Record<string, unknown>[] },
) {
  const userId = await getUserId();
  const { headers, rows } = parsedData;

  const requiredColumns = ['박스명', '가로', '세로', '높이'];
  const missingColumns = requiredColumns.filter((col) => !headers.includes(col));
  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
  }

  const values = rows.map((row) => {
    const mapped: Record<string, unknown> = { boxGroupId: groupId, userId };
    for (const [korean, english] of Object.entries(COLUMN_MAP)) {
      if (row[korean] !== undefined && row[korean] !== '') {
        mapped[english] =
          english === 'name' ? String(row[korean]) : String(parseFloat(String(row[korean])));
      }
    }
    return mapped as typeof boxes.$inferInsert;
  });

  if (values.length === 0) return { imported: 0 };

  const created = await db.insert(boxes).values(values).returning();
  return { imported: created.length };
}

export async function assignToGroup(boxIds: string[], groupId: string) {
  const userId = await getUserId();
  await db.update(boxes).set({ boxGroupId: groupId }).where(and(inArray(boxes.id, boxIds), eq(boxes.userId, userId)));
}

export async function unassignFromGroup(boxIds: string[]) {
  const userId = await getUserId();
  await db.update(boxes).set({ boxGroupId: null }).where(and(inArray(boxes.id, boxIds), eq(boxes.userId, userId)));
}

function parseBox(row: typeof boxes.$inferSelect) {
  return {
    ...row,
    width: Number(row.width),
    length: Number(row.length),
    height: Number(row.height),
    price: row.price !== null ? Number(row.price) : undefined,
  };
}
