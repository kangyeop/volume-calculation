import { z } from 'zod';

export const ProductMappingSchema = z.object({
  confidence: z.number().min(0).max(1).describe('Overall mapping confidence (0~1)'),
  mapping: z.object({
    sku: z
      .object({
        columnName: z.string(),
        confidence: z.number().min(0).max(1),
      })
      .nullable(),
    name: z
      .object({
        columnName: z.string(),
        confidence: z.number().min(0).max(1),
      })
      .nullable(),
    dimensions: z
      .object({
        columnName: z.string(),
        confidence: z.number().min(0).max(1),
      })
      .nullable(),
  }),
  unmappedColumns: z.array(z.string()),
  notes: z.string().optional(),
});

export type ProductMappingResult = z.infer<typeof ProductMappingSchema>;
