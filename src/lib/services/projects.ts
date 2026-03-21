import { db } from '@/lib/db';
import { projects, packingResults } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import type { ProjectStats } from '@/types';

type CreateProjectDto = { name: string };

export async function findAll() {
  return db.select().from(projects).orderBy(desc(projects.createdAt));
}

export async function findOne(id: string) {
  return db.query.projects.findFirst({ where: eq(projects.id, id) });
}

export async function create(dto: CreateProjectDto) {
  const [project] = await db.insert(projects).values(dto).returning();
  return project;
}

export async function update(id: string, dto: Partial<CreateProjectDto>) {
  const [project] = await db.update(projects).set(dto).where(eq(projects.id, id)).returning();
  return project;
}

export async function remove(id: string) {
  const [row] = await db.delete(projects).where(eq(projects.id, id)).returning();
  return !!row;
}

export async function getStats(): Promise<ProjectStats[]> {
  const results = await db
    .select({
      projectId: packingResults.outboundBatchId,
      projectName: projects.name,
      createdAt: projects.createdAt,
      boxName: packingResults.boxName,
      boxCount: sql<string>`COUNT(*)`,
    })
    .from(packingResults)
    .innerJoin(projects, eq(projects.id, packingResults.outboundBatchId))
    .groupBy(
      packingResults.outboundBatchId,
      projects.name,
      projects.createdAt,
      packingResults.boxName,
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
