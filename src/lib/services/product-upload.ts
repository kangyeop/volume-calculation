import { parseExcelFile } from '@/lib/services/excel';
import * as aiService from '@/lib/services/ai';
import * as productsService from '@/lib/services/products';
import type { ParseProductUploadData } from '@/types';

type CreateProductDto = {
  sku: string;
  name: string;
  width: number;
  length: number;
  height: number;
};

export async function parseFile(
  buffer: Buffer,
  originalName: string,
): Promise<ParseProductUploadData> {
  const parseResult = parseExcelFile(buffer, originalName);
  const mapping = await aiService.mapProductColumns(parseResult.headers, parseResult.rows);

  return {
    sessionId: crypto.randomUUID(),
    headers: parseResult.headers,
    rowCount: parseResult.rowCount,
    rows: parseResult.rows,
    mapping,
    fileName: originalName,
  };
}

export function transformAndCreateProducts(
  rows: Record<string, unknown>[],
  mapping: ParseProductUploadData['mapping'],
): CreateProductDto[] {
  const products: CreateProductDto[] = [];

  for (const row of rows) {
    const sku = mapping.mapping.sku
      ? String(row[mapping.mapping.sku.columnName] || '').trim()
      : '';
    const name = mapping.mapping.name
      ? String(row[mapping.mapping.name.columnName] || '').trim()
      : '';

    if (!sku && !name) continue;

    let width = 0,
      length = 0,
      height = 0;

    if (mapping.dimensionFormat === 'combined' && mapping.mapping.dimensions) {
      const dims = String(row[mapping.mapping.dimensions.columnName] || '').trim();
      const cleaned = dims.replace(/(cm|mm|m|in|inch)$/i, '').trim();
      const parts = cleaned.split(/[*xX×]/).map((p) => parseFloat(p.trim()));
      width = parts[0] || 1;
      length = parts[1] || 1;
      height = parts[2] ?? 1;
    }

    products.push({
      sku: sku || name,
      name: name || sku,
      width,
      length,
      height,
    });
  }

  return products;
}

export async function confirmProductUpload(
  productGroupId: string,
  rows: Record<string, unknown>[],
  mapping: ParseProductUploadData['mapping'],
): Promise<{ imported: number }> {
  const productDtos = transformAndCreateProducts(rows, mapping);

  if (productDtos.length === 0) {
    return { imported: 0 };
  }

  await productsService.createBulk(productGroupId, productDtos);

  return { imported: productDtos.length };
}
