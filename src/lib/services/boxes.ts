import { db } from '@/lib/db';
import { boxes } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

type CreateBoxDto = {
  name: string;
  boxGroupId: string;
  width: number;
  length: number;
  height: number;
  price?: number;
};

const COLUMN_MAP: Record<string, string> = {
  '박스명': 'name',
  '가로': 'width',
  '세로': 'length',
  '높이': 'height',
  '가격': 'price',
};

export async function findAll() {
  const rows = await db.select().from(boxes).orderBy(desc(boxes.createdAt));
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

export async function create(dto: CreateBoxDto) {
  const [row] = await db
    .insert(boxes)
    .values({
      ...dto,
      width: String(dto.width),
      length: String(dto.length),
      height: String(dto.height),
      price: dto.price !== undefined ? String(dto.price) : undefined,
    })
    .returning();
  return parseBox(row);
}

export async function update(id: string, dto: Partial<CreateBoxDto>) {
  const { width, length, height, price, ...rest } = dto;
  const values: Partial<typeof boxes.$inferInsert> = { ...rest };
  if (width !== undefined) values.width = String(width);
  if (length !== undefined) values.length = String(length);
  if (height !== undefined) values.height = String(height);
  if (price !== undefined) values.price = String(price);
  const [row] = await db.update(boxes).set(values).where(eq(boxes.id, id)).returning();
  return parseBox(row);
}

export async function remove(id: string) {
  const [row] = await db.delete(boxes).where(eq(boxes.id, id)).returning();
  return !!row;
}

export async function uploadBoxes(
  groupId: string,
  parsedData: { headers: string[]; rows: Record<string, unknown>[] },
) {
  const { headers, rows } = parsedData;

  const requiredColumns = ['박스명', '가로', '세로', '높이'];
  const missingColumns = requiredColumns.filter((col) => !headers.includes(col));
  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
  }

  const values = rows.map((row) => {
    const mapped: Record<string, unknown> = { boxGroupId: groupId };
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

function parseBox(row: typeof boxes.$inferSelect) {
  return {
    ...row,
    width: Number(row.width),
    length: Number(row.length),
    height: Number(row.height),
    price: row.price !== null ? Number(row.price) : undefined,
  };
}
