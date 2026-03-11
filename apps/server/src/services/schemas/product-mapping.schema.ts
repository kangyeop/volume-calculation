import { z } from 'zod';

export const ProductMappingSchema = z.object({
  mapping: z.object({
    sku: z
      .object({
        columnName: z.string(),
      })
      .nullable(),
    name: z
      .object({
        columnName: z.string(),
      })
      .nullable(),
    dimensions: z
      .object({
        columnName: z.string(),
      })
      .nullable()
      .describe('A single column containing combined dimensions like "10x20x30" or "10*20*30"'),
  }),
  unmappedColumns: z.array(z.string()),
  dimensionFormat: z
    .enum(['combined', 'separate'])
    .describe(
      'Whether dimensions are in a single combined column (e.g. "10x20x30") or separate columns (width, height, length)',
    ),
});

export type ProductMappingResult = z.infer<typeof ProductMappingSchema>;
