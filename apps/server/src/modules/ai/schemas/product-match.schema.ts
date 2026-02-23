import { z } from 'zod';

export const ProductMatchResultSchema = z.object({
  outboundItemIndex: z.number(),
  productIds: z.array(z.string()),
});

export const SingleProductMatchSchema = z.object({
  matchedIndexes: z
    .array(z.number())
    .describe('The index of best matching product (0-based), or -1 if no match)'),
});

export type ProductMatchResult = z.infer<typeof ProductMatchResultSchema>;
export type SingleProductMatch = z.infer<typeof SingleProductMatchSchema>;
