import { z } from 'zod';

export const AlternativeMatchSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  confidence: z.number().min(0).max(1),
});

export const ProductMatchResultSchema = z.object({
  outboundItemIndex: z.number(),
  outboundSku: z.string(),
  outboundName: z.string().optional(),
  matchedProduct: z
    .object({
      id: z.string(),
      sku: z.string(),
      name: z.string(),
    })
    .optional(),
  confidence: z.number().min(0).max(1),
  matchReason: z.string(),
  needsReview: z.boolean(),
  alternativeMatches: z.array(AlternativeMatchSchema).optional(),
});

export const ProductMappingSessionSchema = z.object({
  sessionId: z.string(),
  projectId: z.string(),
  totalItems: z.number(),
  matchedItems: z.number(),
  unmatchedItems: z.number(),
  needsReview: z.number(),
  results: z.array(ProductMatchResultSchema),
});

export const SingleProductMatchSchema = z.object({
  matchedIndex: z.number().describe('The index of best matching product (0-based), or -1 if no match'),
  confidence: z.number().min(0).max(1).describe('0.0 to 1.0 confidence score'),
  reason: z.string().describe('Brief explanation of the match decision'),
  needsReview: z.boolean().describe('true if confidence < 0.7'),
});

export type ProductMatchResult = z.infer<typeof ProductMatchResultSchema>;
export type ProductMappingSession = z.infer<typeof ProductMappingSessionSchema>;
export type SingleProductMatch = z.infer<typeof SingleProductMatchSchema>;
export type AlternativeMatch = z.infer<typeof AlternativeMatchSchema>;
