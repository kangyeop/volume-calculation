import { db } from '@/lib/db';
import { globalProducts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getUserId } from '@/lib/auth';
import * as globalShipmentService from '@/lib/services/global-shipment';
import * as globalOrderItemService from '@/lib/services/global-order-item';
import { parseExcelFile } from '@/lib/services/excel';
import {
  parseGlobalByFormat,
  type GlobalShipmentFormat,
} from '@/lib/services/global-format-parser';
import type { ShipmentUploadResult, UnmatchedItem } from '@/types';

export async function uploadGlobalShipment(
  buffer: Buffer,
  originalName: string,
  format: GlobalShipmentFormat,
): Promise<ShipmentUploadResult> {
  const userId = await getUserId();
  const parseResult = await parseExcelFile(buffer, originalName);
  const items = parseGlobalByFormat(format, parseResult.rows);

  const aggregated = new Map<string, { orderNumber: string; sku: string; quantity: number }>();
  for (const item of items) {
    const orderNumber = item.orderId.trim();
    const sku = item.sku.trim();
    if (!orderNumber || !sku) continue;
    const key = `${orderNumber}::${sku}`;
    const existing = aggregated.get(key);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      aggregated.set(key, { orderNumber, sku, quantity: item.quantity });
    }
  }

  const shipmentName = await globalShipmentService.generateBatchName(originalName);
  const shipment = await globalShipmentService.create(shipmentName);

  const allProducts = await db
    .select()
    .from(globalProducts)
    .where(eq(globalProducts.userId, userId));
  const productBySku = new Map(allProducts.map((p) => [p.sku.trim(), p]));

  const unmatched: UnmatchedItem[] = [];
  const toInsert: {
    orderNumber: string;
    sku: string;
    quantity: number;
    globalProductId: string | null;
  }[] = [];

  for (const row of aggregated.values()) {
    const matched = productBySku.get(row.sku);
    toInsert.push({
      orderNumber: row.orderNumber,
      sku: row.sku,
      quantity: row.quantity,
      globalProductId: matched?.id ?? null,
    });
    if (!matched) {
      unmatched.push({ sku: row.sku, quantity: row.quantity, reason: 'Product not found' });
    }
  }

  if (toInsert.length > 0) {
    await globalOrderItemService.createOrderItemsWithOrder(shipment.id, toInsert);
  }

  return {
    imported: toInsert.length,
    unmatched,
    shipmentName: shipment.name,
    shipmentId: shipment.id,
    totalRows: parseResult.rowCount,
  };
}
