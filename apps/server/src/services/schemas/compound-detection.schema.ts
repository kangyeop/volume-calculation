import { z } from 'zod';

export const CompoundDetectionSchema = z.object({
  detected: z.boolean(),
  delimiter: z.string().nullable(),
  itemPattern: z.string().nullable(),
});

export type CompoundDetectionResult = z.infer<typeof CompoundDetectionSchema>;
