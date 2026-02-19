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
    width: z
      .object({
        columnName: z.string(),
        confidence: z.number().min(0).max(1),
      })
      .nullable(),
    length: z
      .object({
        columnName: z.string(),
        confidence: z.number().min(0).max(1),
      })
      .nullable(),
    height: z
      .object({
        columnName: z.string(),
        confidence: z.number().min(0).max(1),
      })
      .nullable(),
    weight: z
      .object({
        columnName: z.string(),
        confidence: z.number().min(0).max(1),
      })
      .nullable(),
    inboundDate: z
      .object({
        columnName: z.string(),
        confidence: z.number().min(0).max(1),
      })
      .nullable(),
    outboundDate: z
      .object({
        columnName: z.string(),
        confidence: z.number().min(0).max(1),
      })
      .nullable(),
    barcode: z
      .object({
        columnName: z.string(),
        confidence: z.number().min(0).max(1),
      })
      .nullable(),
    aircap: z
      .object({
        columnName: z.string(),
        confidence: z.number().min(0).max(1),
      })
      .nullable(),
    remarks: z
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
