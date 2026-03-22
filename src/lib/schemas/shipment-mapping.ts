import { z } from 'zod';

export const ShipmentMappingSchema = z.object({
  mapping: z.object({
    orderId: z
      .object({
        columnName: z.string(),
      })
      .nullable(),
    sku: z
      .object({
        columnName: z.string(),
      })
      .nullable(),
    quantity: z
      .object({
        columnName: z.string(),
      })
      .nullable(),
  }),
  unmappedColumns: z.array(z.string()),
});

export type ShipmentMappingResult = z.infer<typeof ShipmentMappingSchema>;
