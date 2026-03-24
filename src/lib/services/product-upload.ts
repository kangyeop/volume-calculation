import { parseExcelFile } from '@/lib/services/excel';
import * as productsService from '@/lib/services/products';
import type { CreateProductDto } from '@/lib/services/products';
import type { AircapType } from '@/types';

const COLUMN_SKU = '상품명';
const COLUMN_DIMENSIONS = '체적정보';
const COLUMN_BARCODE = '바코드';
const COLUMN_AIRCAP = '에어캡';

const AIRCAP_MAP: Record<string, AircapType> = {
  '개별': 'INDIVIDUAL',
  '건당': 'PER_ORDER',
  '개별+건당': 'BOTH',
};

interface ParseProductResult {
  rowCount: number;
  products: CreateProductDto[];
  errors: string[];
  fileName: string;
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

export function parseFile(
  buffer: Buffer,
  originalName: string,
): ParseProductResult {
  const parseResult = parseExcelFile(buffer, originalName);
  const products: CreateProductDto[] = [];
  const errors: string[] = [];

  for (let i = 0; i < parseResult.rows.length; i++) {
    const row = parseResult.rows[i];
    const rowNum = i + 2;
    const sku = String(row[COLUMN_SKU] || '').trim();

    if (!sku) continue;

    const dimsRaw = String(row[COLUMN_DIMENSIONS] || '').trim();
    const dims = dimsRaw ? parseDimensions(dimsRaw) : null;

    if (!dims) {
      errors.push(`행 ${rowNum} (${sku}): 체적정보가 없거나 형식이 올바르지 않습니다.`);
      continue;
    }

    const barcodeRaw = String(row[COLUMN_BARCODE] || '').trim().toLowerCase();
    const barcode = barcodeRaw === 'true' || barcodeRaw === 'o' || barcodeRaw === 'yes' || barcodeRaw === '1';

    const aircapRaw = String(row[COLUMN_AIRCAP] || '').trim();
    const aircapType = AIRCAP_MAP[aircapRaw] ?? null;

    products.push({
      sku,
      name: sku,
      ...dims,
      barcode,
      aircapType,
    });
  }

  return {
    rowCount: parseResult.rowCount,
    products,
    errors,
    fileName: originalName,
  };
}

export async function confirmProductUpload(
  productGroupId: string,
  products: CreateProductDto[],
): Promise<{ imported: number }> {
  if (products.length === 0) {
    return { imported: 0 };
  }

  await productsService.createBulk(productGroupId, products);

  return { imported: products.length };
}
