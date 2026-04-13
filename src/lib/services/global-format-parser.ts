import { cellToString } from '@/lib/services/excel';

export type GlobalShipmentFormat = 'globalStandard';

export interface GlobalParsedOrderItem {
  orderId: string;
  sku: string;
  quantity: number;
  lotNumber: string | null;
  expirationDate: string | null;
}

const DEFAULT_ORDER_ID = 'DEFAULT';

function normalizeExpirationDate(raw: unknown): string | null {
  const str = cellToString(raw).trim();
  if (!str) return null;
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const dotMatch = str.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})/);
  if (dotMatch) {
    const mm = dotMatch[2].padStart(2, '0');
    const dd = dotMatch[3].padStart(2, '0');
    return `${dotMatch[1]}-${mm}-${dd}`;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

export function parseGlobalStandard(rows: Record<string, unknown>[]): GlobalParsedOrderItem[] {
  const result: GlobalParsedOrderItem[] = [];
  for (const row of rows) {
    const sku = cellToString(row['상품명']).trim();
    const rawQty = row['출고수량'];
    const qty =
      typeof rawQty === 'number' ? rawQty : parseInt(cellToString(rawQty).replace(/,/g, ''), 10);
    if (!sku || !Number.isFinite(qty) || qty <= 0) continue;
    const lotNumber = cellToString(row['로트번호']).trim() || null;
    const expirationDate = normalizeExpirationDate(row['유통기한']);
    result.push({ orderId: DEFAULT_ORDER_ID, sku, quantity: qty, lotNumber, expirationDate });
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
