import type { ColumnMapping } from '@/types';
import type { CreateProductDto } from '@/lib/services/products';

export interface ParsedOrderItem {
  orderId: string;
  sku: string;
  quantity: number;
}

function parseBracketQuantity(part: string): { sku: string; quantity: number } {
  const match = /^(.+?)(?:\[\w+\])*\[(\d+)\]$/.exec(part.trim());
  if (match) {
    return { sku: match[1].trim(), quantity: parseInt(match[2]) };
  }
  return { sku: part.trim(), quantity: 1 };
}

function parseSlashEaQuantity(part: string): { sku: string; quantity: number } {
  const match = /^\(?\s*(.+?)\s*\/\s*(\d+)\s*ea\s*\)?$/i.exec(part.trim());
  if (match) {
    return { sku: match[1].trim(), quantity: parseInt(match[2]) || 1 };
  }
  const sku = part.trim().replace(/^\(|\)$/g, '').trim();
  return { sku, quantity: 1 };
}

function splitCompound(raw: string, mode: ColumnMapping['compoundMode']): string[] {
  if (mode === 'slash_separated') return raw.split(' / ');
  if (mode === 'newline_separated') return raw.split(/\r?\n/);
  return [raw];
}

function parsePartQuantity(
  part: string,
  pattern: ColumnMapping['compoundQuantityPattern'],
): { sku: string; quantity: number } {
  if (pattern === 'bracket') return parseBracketQuantity(part);
  if (pattern === 'slash_ea') return parseSlashEaQuantity(part);
  return { sku: part.trim(), quantity: 1 };
}

export function applyColumnMapping(
  rows: Record<string, unknown>[],
  mapping: ColumnMapping,
): ParsedOrderItem[] {
  const result: ParsedOrderItem[] = [];
  const orderIdCol = mapping.orderIdColumn!;
  const skuCol = mapping.skuColumn!;
  const qtyCol = mapping.quantityColumn;
  const compoundMode = mapping.compoundMode ?? 'none';
  const compoundPattern = mapping.compoundQuantityPattern ?? 'none';

  for (const row of rows) {
    const orderId = String(row[orderIdCol] ?? '').trim();
    const rawSku = String(row[skuCol] ?? '').trim();
    if (!orderId || !rawSku) continue;

    const rowQty = qtyCol ? (parseInt(String(row[qtyCol] ?? '1')) || 1) : 1;

    const parts = splitCompound(rawSku, compoundMode);
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const { sku, quantity } = parsePartQuantity(trimmed, compoundPattern);
      if (sku) {
        result.push({ orderId, sku, quantity: quantity * rowQty });
      }
    }
  }

  return result;
}

function parseDimensions(raw: string): { width: number; length: number; height: number } | null {
  const cleaned = raw.replace(/(cm|mm|m|in|inch)$/i, '').trim();
  const parts = cleaned.split(/[*xX×]/).map((p) => parseFloat(p.trim()));
  if (parts.length === 0 || parts.some((v) => isNaN(v) || v <= 0)) return null;
  const width = parts[0];
  const length = parts[1] ?? 1;
  const height = parts[2] ?? 1;
  return { width, length, height };
}

export function applyProductMapping(
  rows: Record<string, unknown>[],
  mapping: ColumnMapping,
): { products: CreateProductDto[]; errors: string[] } {
  const products: CreateProductDto[] = [];
  const errors: string[] = [];
  const skuCol = mapping.skuNameColumn!;
  const dimsCol = mapping.dimensionsColumn!;
  const barcodeCol = mapping.barcodeColumn;
  const aircapCol = mapping.aircapColumn;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    const sku = String(row[skuCol] || '').trim();
    if (!sku) continue;

    const dimsRaw = String(row[dimsCol] || '').trim();
    const dims = dimsRaw ? parseDimensions(dimsRaw) : null;

    if (!dims) {
      errors.push(`행 ${rowNum} (${sku}): 체적정보가 없거나 형식이 올바르지 않습니다.`);
      continue;
    }

    const barcodeRaw = barcodeCol ? String(row[barcodeCol] || '').trim().toLowerCase() : '';
    const barcode = ['true', 'o', 'yes', '1', 'ㅇ', '○'].includes(barcodeRaw);

    const aircapRaw = aircapCol ? String(row[aircapCol] || '').trim().toLowerCase() : '';
    const aircap = ['true', 'o', 'yes', '1', 'ㅇ', '○'].includes(aircapRaw);

    products.push({ sku, name: sku, ...dims, barcode, aircap });
  }

  return { products, errors };
}
