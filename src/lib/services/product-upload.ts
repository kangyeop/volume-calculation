import { parseExcelFile } from '@/lib/services/excel';
import * as productsService from '@/lib/services/products';

const COLUMN_SKU = '상품명';
const COLUMN_DIMENSIONS = '체적정보';

type CreateProductDto = {
  sku: string;
  name: string;
  width: number;
  length: number;
  height: number;
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
  if (parts.length < 3 || parts.some((v) => isNaN(v) || v <= 0)) return null;
  return { width: parts[0], length: parts[1], height: parts[2] };
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

    products.push({
      sku,
      name: sku,
      ...dims,
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
