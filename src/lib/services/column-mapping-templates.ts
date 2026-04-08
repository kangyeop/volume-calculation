import { db } from '@/lib/db';
import { columnMappingTemplates } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUserId } from '@/lib/auth';
import type { ColumnMapping, MappingType } from '@/types';

export async function listByType(type: MappingType) {
  const userId = await getUserId();
  return db
    .select()
    .from(columnMappingTemplates)
    .where(and(eq(columnMappingTemplates.userId, userId), eq(columnMappingTemplates.type, type)));
}

export async function getDefault(type: MappingType) {
  const userId = await getUserId();
  const results = await db
    .select()
    .from(columnMappingTemplates)
    .where(
      and(
        eq(columnMappingTemplates.userId, userId),
        eq(columnMappingTemplates.type, type),
        eq(columnMappingTemplates.isDefault, true),
      ),
    );
  return results[0] ?? null;
}

export async function create(dto: {
  name: string;
  type: MappingType;
  mapping: ColumnMapping;
  isDefault?: boolean;
}) {
  const userId = await getUserId();

  if (dto.isDefault) {
    await db
      .update(columnMappingTemplates)
      .set({ isDefault: false })
      .where(
        and(
          eq(columnMappingTemplates.userId, userId),
          eq(columnMappingTemplates.type, dto.type),
          eq(columnMappingTemplates.isDefault, true),
        ),
      );
  }

  const [result] = await db
    .insert(columnMappingTemplates)
    .values({
      userId,
      name: dto.name,
      type: dto.type,
      mapping: dto.mapping,
      isDefault: dto.isDefault ?? false,
    })
    .returning();

  return result;
}

export async function update(
  id: string,
  dto: { name?: string; mapping?: ColumnMapping; isDefault?: boolean },
) {
  const userId = await getUserId();

  if (dto.isDefault) {
    const existing = await db
      .select()
      .from(columnMappingTemplates)
      .where(and(eq(columnMappingTemplates.userId, userId), eq(columnMappingTemplates.id, id)));
    if (existing[0]) {
      await db
        .update(columnMappingTemplates)
        .set({ isDefault: false })
        .where(
          and(
            eq(columnMappingTemplates.userId, userId),
            eq(columnMappingTemplates.type, existing[0].type),
            eq(columnMappingTemplates.isDefault, true),
          ),
        );
    }
  }

  const [result] = await db
    .update(columnMappingTemplates)
    .set(dto)
    .where(and(eq(columnMappingTemplates.id, id), eq(columnMappingTemplates.userId, userId)))
    .returning();

  return result;
}

export async function remove(id: string) {
  const userId = await getUserId();
  await db
    .delete(columnMappingTemplates)
    .where(and(eq(columnMappingTemplates.id, id), eq(columnMappingTemplates.userId, userId)));
}
