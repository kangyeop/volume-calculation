import { db } from '@/lib/db';
import { boxes, boxGroups } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function findAll() {
  return db.query.boxGroups.findMany({ with: { boxes: true } });
}

export async function findOne(id: string) {
  return db.query.boxGroups.findFirst({
    where: eq(boxGroups.id, id),
    with: { boxes: true },
  });
}

export async function create(name: string, boxIds?: string[]) {
  const [group] = await db.insert(boxGroups).values({ name }).returning();
  if (boxIds && boxIds.length > 0) {
    await db.update(boxes).set({ boxGroupId: group.id }).where(inArray(boxes.id, boxIds));
  }
  return group;
}

export async function updateBoxAssignments(groupId: string, boxIds: string[]) {
  await db.transaction(async (tx) => {
    await tx.update(boxes).set({ boxGroupId: null }).where(eq(boxes.boxGroupId, groupId));
    if (boxIds.length > 0) {
      await tx.update(boxes).set({ boxGroupId: groupId }).where(inArray(boxes.id, boxIds));
    }
  });
}

export async function deleteBoxGroup(id: string) {
  await db.delete(boxGroups).where(eq(boxGroups.id, id));
}
