import * as shipmentService from '@/lib/services/shipment';
import * as orderItemService from '@/lib/services/order-item';
import * as productsService from '@/lib/services/products';
import { parseExcelFile } from '@/lib/services/excel';
import { parseByFormat, type ShipmentFormat } from '@/lib/services/format-parser';
import type { ShipmentUploadResult, UnmatchedItem } from '@/types';

export async function uploadShipment(
  buffer: Buffer,
  originalName: string,
  format: ShipmentFormat,
): Promise<ShipmentUploadResult> {
  const parseResult = parseExcelFile(buffer, originalName);
  const fileName = Buffer.from(originalName, 'latin1').toString('utf8');

  const items = parseByFormat(format, parseResult.rows);

  const orderMap = new Map<string, { sku: string; quantity: number }[]>();
  for (const item of items) {
    if (!orderMap.has(item.orderId)) orderMap.set(item.orderId, []);
    orderMap.get(item.orderId)!.push({ sku: item.sku, quantity: item.quantity });
  }

  const shipmentName = await shipmentService.generateBatchName(fileName);
  const shipment = await shipmentService.create(shipmentName);

  const allProducts = await productsService.findAllForMatching();
  const productByName = new Map(allProducts.map((p) => [p.name, p]));
  const productBySku = new Map(allProducts.map((p) => [p.sku, p]));

  const unmatched: UnmatchedItem[] = [];
  const outbounds: { orderId: string; sku: string; quantity: number; productId?: string | null }[] = [];

  for (const [orderId, orderItems] of orderMap) {
    for (const item of orderItems) {
      const matched = productByName.get(item.sku) || productBySku.get(item.sku);
      if (matched) {
        outbounds.push({ orderId, sku: item.sku, quantity: item.quantity, productId: matched.id });
      } else {
        unmatched.push({ sku: item.sku, quantity: item.quantity, reason: 'Product not found' });
      }
    }
  }

  if (outbounds.length > 0) {
    await orderItemService.createOrderItemsWithOrder(shipment.id, outbounds);
  }

  return {
    imported: outbounds.length,
    unmatched,
    shipmentName: shipment.name,
    shipmentId: shipment.id,
    totalRows: parseResult.rowCount,
  };
}
