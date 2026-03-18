import { Injectable, Logger } from '@nestjs/common';
import { ExcelService } from './excel.service';
import { AIService } from './ai.service';
import { UploadRepository } from '../repositories/upload.repository';
import { DataTransformerService } from './dataTransformer.service';
import { ProductsService } from './products.service';
import { OutboundBatchService } from './outbound-batch.service';
import { ConfirmUploadDto, OutboundItemDto } from '../dto/confirmUpload.dto';
import type { ParseUploadDataLegacy, OutboundUploadResult, UnmatchedItem } from '@wms/types';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private readonly excelService: ExcelService,
    private readonly aiService: AIService,
    private readonly uploadRepository: UploadRepository,
    private readonly dataTransformerService: DataTransformerService,
    private readonly productsService: ProductsService,
    private readonly outboundBatchService: OutboundBatchService,
  ) {}

  async parseFile(
    file: Express.Multer.File,
    _outboundBatchId: string,
    _type: 'outbound' | 'product',
  ): Promise<ParseUploadDataLegacy> {
    const parseResult = this.excelService.parseExcelFile(file);

    const mapping = await this.aiService.mapOutboundColumns(parseResult.headers, parseResult.rows);

    return {
      sessionId: crypto.randomUUID(),
      headers: parseResult.headers,
      rowCount: parseResult.rowCount,
      rows: parseResult.rows,
      mapping,
      fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
    };
  }

  async confirmUpload(confirmUploadDto: ConfirmUploadDto): Promise<{ imported: number }> {
    const { outbounds } = await this.uploadRepository.createOutboundsWithOrder(
      confirmUploadDto.outboundBatchId,
      confirmUploadDto.outbounds,
    );

    return { imported: outbounds.length };
  }

  async uploadAndSaveDirect(file: Express.Multer.File): Promise<OutboundUploadResult> {
    const parseResult = this.excelService.parseExcelFile(file);

    const mappingResult = await this.aiService.mapOutboundColumns(
      parseResult.headers,
      parseResult.rows.slice(0, 30),
    );

    const columnMapping: Record<string, string> = {};
    for (const [field, value] of Object.entries(mappingResult.mapping)) {
      if (value?.columnName) {
        columnMapping[field] = value.columnName;
      }
    }

    this.logger.log(`AI column mapping result: ${JSON.stringify(columnMapping)}`);
    this.logger.log(`Unmapped columns: ${JSON.stringify(mappingResult.unmappedColumns)}`);

    const { parsedOrders } = await this.dataTransformerService.transformAndMapOutbound(
      columnMapping,
      parseResult.rows,
    );

    this.logger.log(`Parsed ${parsedOrders.length} orders with ${parsedOrders.reduce((sum, o) => sum + o.outboundItems.length, 0)} items`);

    const batchName = await this.outboundBatchService.generateBatchName(
      Buffer.from(file.originalname, 'latin1').toString('utf8'),
    );
    const batch = await this.outboundBatchService.create(batchName);

    const allProducts = await this.productsService.findAllForMatching();
    const productByName = new Map<string, typeof allProducts[0]>();
    const productBySku = new Map<string, typeof allProducts[0]>();
    for (const p of allProducts) {
      if (p.name && !productByName.has(p.name)) productByName.set(p.name, p);
      if (p.sku && !productBySku.has(p.sku)) productBySku.set(p.sku, p);
    }

    const unmatched: UnmatchedItem[] = [];
    const outbounds: OutboundItemDto[] = [];

    for (const order of parsedOrders) {
      for (const item of order.outboundItems) {
        const matched = productByName.get(item.sku) || productBySku.get(item.sku);

        if (matched) {
          outbounds.push({
            orderId: order.orderId,
            sku: item.sku,
            quantity: item.quantity,
            productId: matched.id,
          });
        } else {
          unmatched.push({ sku: item.sku, quantity: item.quantity, reason: 'Product not found' });
        }
      }
    }

    this.logger.log(`Matched: ${outbounds.length}, Unmatched: ${unmatched.length}`);
    if (unmatched.length > 0) {
      this.logger.warn(`Unmatched items: ${JSON.stringify(unmatched)}`);
    }

    if (outbounds.length > 0) {
      await this.uploadRepository.createOutboundsWithOrder(batch.id, outbounds);
    }

    return {
      imported: outbounds.length,
      unmatched,
      batchName: batch.name,
      batchId: batch.id,
      totalRows: parseResult.rowCount,
    };
  }
}
