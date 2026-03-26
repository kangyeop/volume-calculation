import { db } from '@/lib/db';
import { boxes, boxGroups } from '@/lib/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { getUserId } from '@/lib/auth';

export async function findAll() {
  const userId = await getUserId();
  return db.query.boxGroups.findMany({ where: eq(boxGroups.userId, userId), with: { boxes: true } });
}

export async function findOne(id: string) {
  return db.query.boxGroups.findFirst({
    where: eq(boxGroups.id, id),
    with: { boxes: true },
  });
}

export async function create(name: string, boxIds?: string[]) {
  const userId = await getUserId();
  const [group] = await db.insert(boxGroups).values({ name, userId }).returning();
  if (boxIds && boxIds.length > 0) {
    await db.update(boxes).set({ boxGroupId: group.id }).where(inArray(boxes.id, boxIds));
  }
  return group;
}

export async function updateBoxAssignments(groupId: string, boxIds: string[]) {
  const userId = await getUserId();
  await db.transaction(async (tx) => {
    await tx.update(boxes).set({ boxGroupId: null }).where(and(eq(boxes.boxGroupId, groupId), eq(boxes.userId, userId)));
    if (boxIds.length > 0) {
      await tx.update(boxes).set({ boxGroupId: groupId }).where(and(inArray(boxes.id, boxIds), eq(boxes.userId, userId)));
    }
  });
}

export async function deleteBoxGroup(id: string) {
  const userId = await getUserId();
  await db.delete(boxGroups).where(and(eq(boxGroups.id, id), eq(boxGroups.userId, userId)));
}
