export type ShipmentFormat = 'adjustment' | 'beforeMapping' | 'afterMapping' | 'confirmed';

export interface ParsedOrderItem {
  orderId: string;
  sku: string;
  quantity: number;
}

export function parseAdjustment(rows: Record<string, unknown>[]): ParsedOrderItem[] {
  const result: ParsedOrderItem[] = [];
  for (const row of rows) {
    const orderId = String(row['출고주문번호'] ?? '').trim();
    const compound = String(row['상품명'] ?? '').trim();
    if (!orderId || !compound) continue;

    const parts = compound.split(' / ');
    for (const part of parts) {
      const match = /^(.+?)(?:\[\w+\])*\[(\d+)\]$/.exec(part.trim());
      if (match) {
        result.push({ orderId, sku: match[1].trim(), quantity: parseInt(match[2]) });
      } else {
        const sku = part.trim();
        if (sku) result.push({ orderId, sku, quantity: 1 });
      }
    }
  }
  return result;
}

export function parseBeforeMapping(rows: Record<string, unknown>[]): ParsedOrderItem[] {
  const result: ParsedOrderItem[] = [];
  for (const row of rows) {
    const orderId = String(row['쇼핑몰 주문번호'] ?? '').trim();
    const compound = String(row['상품명 / 매핑수량'] ?? '').trim();
    if (!orderId || !compound) continue;

    const rowQty = parseInt(String(row['총 주문수량'] ?? '1')) || 1;

    const lines = compound.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const match = /^\(?\s*(.+?)\s*\/\s*(\d+)\s*ea\s*\)?$/i.exec(trimmed);
      if (match) {
        const itemQty = parseInt(match[2]) || 1;
        result.push({ orderId, sku: match[1].trim(), quantity: itemQty * rowQty });
      } else {
        const sku = trimmed.replace(/^\(|\)$/g, '').trim();
        if (sku) result.push({ orderId, sku, quantity: 1 * rowQty });
      }
    }
  }
  return result;
}

export function parseAfterMapping(rows: Record<string, unknown>[]): ParsedOrderItem[] {
  const result: ParsedOrderItem[] = [];
  for (const row of rows) {
    const orderId = String(row['쇼핑몰 주문번호'] ?? '').trim();
    const sku = String(row['콜로 상품명'] ?? '').trim();
    if (!orderId || !sku) continue;
    result.push({ orderId, sku, quantity: 1 });
  }
  return result;
}

export function parseConfirmed(rows: Record<string, unknown>[]): ParsedOrderItem[] {
  const result: ParsedOrderItem[] = [];
  for (const row of rows) {
    const orderId = String(row['쇼핑몰주문번호'] ?? '').trim();
    const rawOption = String(row['옵션명'] ?? '').trim();
    if (!orderId || !rawOption) continue;
    const sku = rawOption.replace(/^-\s*/, '');
    if (!sku) continue;
    const quantity = parseInt(String(row['주문수량'] ?? '1')) || 1;
    result.push({ orderId, sku, quantity });
  }
  return result;
}

export function parseByFormat(format: ShipmentFormat, rows: Record<string, unknown>[]): ParsedOrderItem[] {
  switch (format) {
    case 'adjustment':
      return parseAdjustment(rows);
    case 'beforeMapping':
      return parseBeforeMapping(rows);
    case 'afterMapping':
      return parseAfterMapping(rows);
    case 'confirmed':
      return parseConfirmed(rows);
  }
}
