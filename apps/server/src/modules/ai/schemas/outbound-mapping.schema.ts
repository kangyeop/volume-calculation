import { z } from 'zod';

export const OutboundMappingSchema = z.object({
  confidence: z.number().min(0).max(1).describe('Overall mapping confidence (0~1)'),
  mapping: z.object({
    orderId: z
      .object({
        columnName: z.string(),
        confidence: z.number().min(0).max(1),
      })
      .nullable(),
    sku: z
      .object({
        columnName: z.string(),
        confidence: z.number().min(0).max(1),
      })
      .nullable(),
    quantity: z
      .object({
        columnName: z.string(),
        confidence: z.number().min(0).max(1),
      })
      .nullable(),
    recipientName: z
      .object({
        columnName: z.string(),
        confidence: z.number().min(0).max(1),
      })
      .nullable(),
  }),
  unmappedColumns: z.array(z.string()),
});

export type OutboundMappingResult = z.infer<typeof OutboundMappingSchema>;
