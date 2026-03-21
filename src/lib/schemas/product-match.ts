import { z } from 'zod';

export const SingleProductMatchSchema = z.object({
  matchedIndexes: z
    .array(z.number())
    .describe('The index of best matching product (0-based), or -1 if no match)'),
});

export type SingleProductMatch = z.infer<typeof SingleProductMatchSchema>;
