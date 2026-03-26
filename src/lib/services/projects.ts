import { db } from '@/lib/db';
import { projects, packingResults, boxes } from '@/lib/db/schema';
import { eq, desc, sql, and } from 'drizzle-orm';
import type { ProjectStats } from '@/types';
import { getUserId } from '@/lib/auth';

type CreateProjectDto = { name: string };

export async function findAll() {
  const userId = await getUserId();
  return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.createdAt));
}

export async function findOne(id: string) {
  return db.query.projects.findFirst({ where: eq(projects.id, id) });
}

export async function create(dto: CreateProjectDto) {
  const userId = await getUserId();
  const [project] = await db.insert(projects).values({ ...dto, userId }).returning();
  return project;
}

export async function update(id: string, dto: Partial<CreateProjectDto>) {
  const userId = await getUserId();
  const [project] = await db.update(projects).set(dto).where(and(eq(projects.id, id), eq(projects.userId, userId))).returning();
  return project;
}

export async function remove(id: string) {
  const userId = await getUserId();
  const [row] = await db.delete(projects).where(and(eq(projects.id, id), eq(projects.userId, userId))).returning();
  return !!row;
}

export async function getStats(): Promise<ProjectStats[]> {
  const userId = await getUserId();
  const results = await db
    .select({
      projectId: packingResults.shipmentId,
      projectName: projects.name,
      createdAt: projects.createdAt,
      boxName: boxes.name,
      boxCount: sql<string>`COUNT(*)`,
    })
    .from(packingResults)
    .innerJoin(projects, eq(projects.id, packingResults.shipmentId))
    .innerJoin(boxes, eq(boxes.id, packingResults.boxId))
    .where(eq(projects.userId, userId))
    .groupBy(
      packingResults.shipmentId,
      projects.name,
      projects.createdAt,
      boxes.name,
    );

  const statsMap = new Map<string, ProjectStats>();

  for (const row of results) {
    if (!statsMap.has(row.projectId)) {
      statsMap.set(row.projectId, {
        projectId: row.projectId,
        projectName: row.projectName,
        createdAt: row.createdAt.toISOString(),
        boxes: [],
      });
    }
    statsMap.get(row.projectId)!.boxes.push({
      boxName: row.boxName ?? '',
      boxCount: Number(row.boxCount),
    });
  }

  return Array.from(statsMap.values());
}
