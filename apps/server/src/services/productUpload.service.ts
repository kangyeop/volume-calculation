import { Injectable, Logger } from '@nestjs/common';
import { ExcelService } from './excel.service';
import { AIService } from './ai.service';
import { ProductsService } from './products.service';
import type { ParseProductUploadData } from '@wms/types';
import { CreateProductDto } from '../dto/createProduct.dto';

@Injectable()
export class ProductUploadService {
  private readonly logger = new Logger(ProductUploadService.name);

  constructor(
    private readonly excelService: ExcelService,
    private readonly aiService: AIService,
    private readonly productsService: ProductsService,
  ) {}

  async parseFile(file: Express.Multer.File): Promise<ParseProductUploadData> {
    const parseResult = this.excelService.parseExcelFile(file);

    const mapping = await this.aiService.mapProductColumns(parseResult.headers, parseResult.rows);

    this.logger.log(
      `Product mapping result: dimensionFormat=${mapping.dimensionFormat}, sku=${mapping.mapping.sku?.columnName}, name=${mapping.mapping.name?.columnName}, dimensions=${mapping.mapping.dimensions?.columnName}`,
    );

    return {
      sessionId: crypto.randomUUID(),
      headers: parseResult.headers,
      rowCount: parseResult.rowCount,
      rows: parseResult.rows,
      mapping,
      fileName: file.originalname,
    };
  }

  transformAndCreateProducts(
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

    this.logger.log(`Transformed ${products.length} products from ${rows.length} rows`);
    return products;
  }

  async confirmProductUpload(
    productGroupId: string,
    rows: Record<string, unknown>[],
    mapping: ParseProductUploadData['mapping'],
  ): Promise<{ imported: number }> {
    const products = this.transformAndCreateProducts(rows, mapping);

    if (products.length === 0) {
      this.logger.warn('No valid products found in uploaded data');
      return { imported: 0 };
    }

    await this.productsService.createBulk(productGroupId, products);
    this.logger.log(
      `Successfully imported ${products.length} products for group ${productGroupId}`,
    );

    return { imported: products.length };
  }
}
