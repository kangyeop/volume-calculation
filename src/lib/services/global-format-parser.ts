import { cellToString } from '@/lib/services/excel';

export type GlobalShipmentFormat = 'globalStandard';

export interface GlobalParsedOrderItem {
  orderId: string;
  sku: string;
  quantity: number;
}

const DEFAULT_ORDER_ID = 'DEFAULT';

export function parseGlobalStandard(rows: Record<string, unknown>[]): GlobalParsedOrderItem[] {
  const result: GlobalParsedOrderItem[] = [];
  for (const row of rows) {
    const sku = cellToString(row['상품명']).trim();
    const rawQty = row['출고수량'];
    const qty =
      typeof rawQty === 'number' ? rawQty : parseInt(cellToString(rawQty).replace(/,/g, ''), 10);
    if (!sku || !Number.isFinite(qty) || qty <= 0) continue;
    result.push({ orderId: DEFAULT_ORDER_ID, sku, quantity: qty });
  }
  return result;
}

export function parseGlobalByFormat(
  format: GlobalShipmentFormat,
  rows: Record<string, unknown>[],
): GlobalParsedOrderItem[] {
  switch (format) {
    case 'globalStandard':
      return parseGlobalStandard(rows);
  }
}
