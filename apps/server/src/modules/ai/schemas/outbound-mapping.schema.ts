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
    recipientPhone: z
      .object({
        columnName: z.string(),
        confidence: z.number().min(0).max(1),
      })
      .nullable(),
    zipCode: z
      .object({
        columnName: z.string(),
        confidence: z.number().min(0).max(1),
      })
      .nullable(),
    address: z
      .object({
        columnName: z.string(),
        confidence: z.number().min(0).max(1),
      })
      .nullable(),
    detailAddress: z
      .object({
        columnName: z.string(),
        confidence: z.number().min(0).max(1),
      })
      .nullable(),
    shippingMemo: z
      .object({
        columnName: z.string(),
        confidence: z.number().min(0).max(1),
      })
      .nullable(),
  }),
  unmappedColumns: z.array(z.string()),
  notes: z.string().optional(),
});

export type OutboundMappingResult = z.infer<typeof OutboundMappingSchema>;
