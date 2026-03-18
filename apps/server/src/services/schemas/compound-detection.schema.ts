import { z } from 'zod';

export const ParsedItemSchema = z.object({
  raw: z.string(),
  productName: z.string(),
  quantity: z.number(),
});

export const CompoundDetectionSchema = z.object({
  detected: z.boolean(),
  delimiter: z.string().nullable(),
  itemPattern: z.string().nullable(),
  parsedSamples: z.array(ParsedItemSchema).nullable(),
});

export type ParsedItem = z.infer<typeof ParsedItemSchema>;
export type CompoundDetectionResult = z.infer<typeof CompoundDetectionSchema>;
