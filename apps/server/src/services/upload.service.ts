import { Injectable } from '@nestjs/common';
import { ExcelService } from './excel.service';
import { AIService } from './ai.service';
import { UploadRepository } from '../repositories/upload.repository';
import { OutboundRepository } from '../repositories/outbound.repository';
import { DataTransformerService } from './dataTransformer.service';
import { ProductsService } from './products.service';
import { ConfirmUploadDto, OutboundItemDto } from '../dto/confirmUpload.dto';
import type { ParseUploadData, OutboundUploadResult } from '@wms/types';

@Injectable()
export class UploadService {
  constructor(
    private readonly excelService: ExcelService,
    private readonly aiService: AIService,
    private readonly uploadRepository: UploadRepository,
    private readonly outboundRepository: OutboundRepository,
    private readonly dataTransformerService: DataTransformerService,
    private readonly productsService: ProductsService,
  ) {}

  async parseFile(
    file: Express.Multer.File,
    _projectId: string,
    _type: 'outbound' | 'product',
  ): Promise<ParseUploadData> {
    const parseResult = this.excelService.parseExcelFile(file);

    const mapping = await this.aiService.mapOutboundColumns(parseResult.headers, parseResult.rows);

    return {
      sessionId: crypto.randomUUID(),
      headers: parseResult.headers,
      rowCount: parseResult.rowCount,
      rows: parseResult.rows,
      mapping,
      fileName: file.originalname,
    };
  }

  async confirmUpload(confirmUploadDto: ConfirmUploadDto): Promise<{ imported: number }> {
    const { outbounds } = await this.uploadRepository.createOutboundsWithOrder(
      confirmUploadDto.projectId,
      confirmUploadDto.outbounds,
    );

    return { imported: outbounds.length };
  }

  async uploadAndSaveDirect(
    file: Express.Multer.File,
    projectId: string,
  ): Promise<OutboundUploadResult> {
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

    const { parsedOrders } = await this.dataTransformerService.transformAndMapOutbound(
      columnMapping,
      parseResult.rows,
    );

    const unmatched: OutboundUploadResult['unmatched'] = [];
    const outbounds: OutboundItemDto[] = [];
    const orderQuantities = new Map<string, number>();

    for (const order of parsedOrders) {
      orderQuantities.set(order.orderId, order.quantity);

      for (const item of order.outboundItems) {
        const matchingProducts = await this.productsService.findByName(projectId, item.sku);

        if (matchingProducts.length > 0) {
          outbounds.push({
            orderId: order.orderId,
            sku: item.sku,
            quantity: item.quantity,
            productId: matchingProducts[0].id,
          });
        } else {
          unmatched.push({
            sku: item.sku,
            rawValue: item.rawValue,
            quantity: item.quantity,
            reason: 'Product not found',
          });
        }
      }
    }

    await this.outboundRepository.removeAll(projectId);

    if (outbounds.length > 0) {
      await this.uploadRepository.createOutboundsWithOrder(projectId, outbounds, orderQuantities);
    }

    return {
      imported: outbounds.length,
      unmatched,
      totalRows: parseResult.rowCount,
    };
  }
}
