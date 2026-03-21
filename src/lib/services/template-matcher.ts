import { db } from '@/lib/db';
import { uploadTemplates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const THRESHOLD = 0.7;

interface MatchResult {
  template: typeof uploadTemplates.$inferSelect;
  similarity: number;
}

function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a.map((s) => s.toLowerCase().trim()));
  const setB = new Set(b.map((s) => s.toLowerCase().trim()));
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

export async function findBestMatch(
  headers: string[],
  type: 'outbound' | 'product',
): Promise<MatchResult | null> {
  const templates = await db
    .select()
    .from(uploadTemplates)
    .where(eq(uploadTemplates.type, type));

  if (templates.length === 0) return null;

  let bestMatch: MatchResult | null = null;

  for (const template of templates) {
    const similarity = jaccardSimilarity(headers, template.headers);

    if (similarity < THRESHOLD) continue;

    if (
      !bestMatch ||
      similarity > bestMatch.similarity ||
      (similarity === bestMatch.similarity && template.usageCount > bestMatch.template.usageCount)
    ) {
      bestMatch = { template, similarity };
    }
  }

  return bestMatch;
}

export async function save(data: {
  name: string;
  type: 'outbound' | 'product';
  headers: string[];
  columnMapping: Record<string, string>;
  rowStructure: string;
  compoundPattern: string | null;
}): Promise<typeof uploadTemplates.$inferSelect> {
  const [row] = await db.insert(uploadTemplates).values(data).returning();
  return row;
}

export async function incrementUsage(id: string): Promise<void> {
  const template = await db.query.uploadTemplates.findFirst({
    where: eq(uploadTemplates.id, id),
  });
  if (!template) return;
  await db
    .update(uploadTemplates)
    .set({ usageCount: template.usageCount + 1, lastUsedAt: new Date() })
    .where(eq(uploadTemplates.id, id));
}
