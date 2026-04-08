import { parseExcelFile } from '@/lib/services/excel';
import { applyProductMapping } from '@/lib/services/column-mapper';
import * as productsService from '@/lib/services/products';
import type { CreateProductDto } from '@/lib/services/products';
import type { ColumnMapping } from '@/types';

interface ParseProductResult {
  rowCount: number;
  products: CreateProductDto[];
  errors: string[];
  fileName: string;
}

export async function parseFile(
  buffer: Buffer,
  originalName: string,
  mapping: ColumnMapping,
): Promise<ParseProductResult> {
  const parseResult = await parseExcelFile(buffer, originalName);
  const { products, errors } = applyProductMapping(parseResult.rows, mapping);

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
