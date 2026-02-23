import {
  Controller,
  Post,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Body,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExcelParserService } from './services/excel-parser.service';
import { UploadSessionService } from './services/upload-session.service';
import { AIColumnMapperService } from '../ai/services/ai-column-mapper.service';
import { AIProductMapperService } from '../ai/services/ai-product-mapper.service';
import { OutboundService } from '../outbound/outbound.service';
import { ProductsService } from '../products/products.service';
import { ParseUploadDto } from './dto/parse-upload.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { ConfirmMappingUploadDto, ProductMappingItem } from './dto/confirm-mapping-upload.dto';

@Controller('upload')
export class UploadController {
  constructor(
    private readonly excelParserService: ExcelParserService,
    private readonly uploadSessionService: UploadSessionService,
    private readonly aiColumnMapperService: AIColumnMapperService,
    private readonly aiProductMapperService: AIProductMapperService,
    private readonly outboundService: OutboundService,
    private readonly productsService: ProductsService,
  ) {}

  @Post('parse')
  @UseInterceptors(FileInterceptor('file'))
  async parse(@UploadedFile() file: Express.Multer.File, @Query() query: ParseUploadDto) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!query.type || !query.projectId) {
      throw new BadRequestException('Type and projectId are required');
    }

    const parseResult = this.excelParserService.parseExcelFile(file);

    let mappingResult;
    if (query.type === 'outbound') {
      mappingResult = await this.aiColumnMapperService.mapOutboundColumns(
        parseResult.headers,
        parseResult.sampleRows,
      );
      console.log(mappingResult);
    } else {
      mappingResult = await this.aiColumnMapperService.mapProductColumns(
        parseResult.headers,
        parseResult.sampleRows,
      );
    }

    const sessionId = this.uploadSessionService.createSession({
      type: query.type,
      projectId: query.projectId,
      headers: parseResult.headers,
      mapping: mappingResult,
      rows: parseResult.rows,
      fileName: file.originalname,
    });

    return {
      success: true,
      data: {
        sessionId,
        headers: parseResult.headers,
        rowCount: parseResult.rowCount,
        sampleRows: parseResult.sampleRows,
        mapping: mappingResult,
        fileName: file.originalname,
      },
    };
  }

  @Post('confirm')
  async confirm(@Body() confirmUploadDto: ConfirmUploadDto) {
    const session = this.uploadSessionService.getSession(confirmUploadDto.sessionId);
    if (!session) {
      throw new BadRequestException('Session not found or expired');
    }

    this.uploadSessionService.updateMapping(confirmUploadDto.sessionId, confirmUploadDto.mapping);

    const mapping = confirmUploadDto.mapping;
    const mappedRows = session.rows.map((row) => {
      const result: any = {};
      for (const [field, columnName] of Object.entries(mapping)) {
        if (columnName) {
          result[field] = row[columnName] ?? '';
        }
      }
      return result;
    });

    if (session.type === 'outbound') {
      const outbounds = mappedRows
        .filter((row) => row.orderId && row.sku)
        .map((row) => ({
          orderId: String(row.orderId || ''),
          sku: String(row.sku || ''),
          quantity: parseInt(row.quantity || '1', 10) || 1,
          recipientName: row.recipientName || undefined,
          recipientPhone: row.recipientPhone || undefined,
          zipCode: row.zipCode || undefined,
          address: row.address || undefined,
          detailAddress: row.detailAddress || undefined,
          shippingMemo: row.shippingMemo || undefined,
        }));

      const results = await this.outboundService.createBulk(session.projectId, outbounds);

      this.uploadSessionService.deleteSession(confirmUploadDto.sessionId);

      return {
        success: true,
        data: {
          imported: results.length,
          batchId: results[0]?.batchId,
        },
      };
    } else {
      const originalMapping = session.originalMapping as any;
      const dimensionMapping = originalMapping?.mapping?.dimensions;
      const separator = dimensionMapping?.separator || '*';

      const products = mappedRows
        .filter((row) => row.sku && row.name)
        .map((row) => {
          let width = 0;
          let length = 0;
          let height = 0;

          if (row.dimensions) {
            const dims = String(row.dimensions).trim();
            const cleaned = dims.replace(/(cm|mm|m|in|inch)$/i, '').trim();
            const parts = cleaned.split(separator).map((p) => parseFloat(p.trim()));

            if (parts.length >= 2) {
              width = parts[0] || 0;
              length = parts[1] || 0;
              height = parts[2] ?? 1;
            }
          }

          return {
            sku: String(row.sku || ''),
            name: String(row.name || ''),
            width,
            length,
            height,
          };
        });

      const results = await this.productsService.createBulk(session.projectId, products);

      this.uploadSessionService.deleteSession(confirmUploadDto.sessionId);

      return {
        success: true,
        data: {
          imported: results.length,
        },
      };
    }
  }

  @Post('parse-mapping')
  @UseInterceptors(FileInterceptor('file'))
  async parseMapping(@UploadedFile() file: Express.Multer.File, @Query() query: ParseUploadDto) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!query.type || !query.projectId) {
      throw new BadRequestException('Type and projectId are required');
    }

    if (query.type !== 'outbound') {
      throw new BadRequestException('Product mapping is only available for outbound uploads');
    }

    const parseResult = this.excelParserService.parseExcelFile(file);

    const columnMapping = await this.aiColumnMapperService.mapOutboundColumns(
      parseResult.headers,
      parseResult.sampleRows,
    );

    const mappedRows = parseResult.rows.map((row) => {
      const result: any = {};
      for (const [field, columnMappingInfo] of Object.entries(columnMapping.mapping)) {
        const columnName = columnMappingInfo?.columnName;
        if (columnName) {
          result[field] = row[columnName] ?? '';
        }
      }
      return result;
    });

    const outboundItems = mappedRows
      .filter((row) => row.orderId)
      .map((row) => ({
        availableFields: row,
      }));

    const productMapping = await this.aiProductMapperService.mapOutboundItemsToProducts(
      query.projectId,
      outboundItems,
    );

    const sessionId = this.uploadSessionService.createSession({
      type: query.type,
      projectId: query.projectId,
      headers: parseResult.headers,
      mapping: columnMapping,
      rows: parseResult.rows,
      fileName: file.originalname,
    });

    return {
      success: true,
      data: {
        sessionId,
        headers: parseResult.headers,
        rowCount: parseResult.rowCount,
        sampleRows: parseResult.sampleRows,
        columnMapping,
        productMapping: {
          totalItems: productMapping.totalItems,
          matchedItems: productMapping.matchedItems,
          needsReview: productMapping.needsReview,
          results: productMapping.results,
        },
        fileName: file.originalname,
      },
    };
  }

  @Post('confirm-mapping')
  async confirmMapping(@Body() confirmMappingUploadDto: ConfirmMappingUploadDto) {
    const session = this.uploadSessionService.getSession(confirmMappingUploadDto.sessionId);
    if (!session) {
      throw new BadRequestException('Session not found or expired');
    }

    this.uploadSessionService.updateMapping(confirmMappingUploadDto.sessionId, confirmMappingUploadDto.columnMapping);

    const mapping = confirmMappingUploadDto.columnMapping;
    const mappedRows = session.rows.map((row) => {
      const result: any = {};
      for (const [field, columnName] of Object.entries(mapping)) {
        if (columnName) {
          result[field] = row[columnName] ?? '';
        }
      }
      return result;
    });

    const productMapping = confirmMappingUploadDto.productMapping || {};

    const outbounds = mappedRows
      .filter((row) => row.orderId && row.sku)
      .map((row, index) => {
        const mappingItem: ProductMappingItem | undefined = productMapping[index];
        return {
          orderId: String(row.orderId || ''),
          sku: String(row.sku || ''),
          quantity: parseInt(row.quantity || '1', 10) || 1,
          recipientName: row.recipientName || undefined,
          recipientPhone: row.recipientPhone || undefined,
          zipCode: row.zipCode || undefined,
          address: row.address || undefined,
          detailAddress: row.detailAddress || undefined,
          shippingMemo: row.shippingMemo || undefined,
          productId: mappingItem?.productId ?? null,
          mappingConfidence: mappingItem?.confidence ?? (mappingItem?.productId ? 1.0 : null),
        };
      });

    const results = await this.outboundService.createBulk(session.projectId, outbounds);

    const mappedCount = results.filter((r) => r.productId !== null).length;
    const unmappedCount = results.length - mappedCount;

    this.uploadSessionService.deleteSession(confirmMappingUploadDto.sessionId);

    return {
      success: true,
      data: {
        imported: results.length,
        batchId: results[0]?.batchId,
        mappedCount,
        unmappedCount,
      },
    };
  }

  @Post('update-mapping')
  async updateMapping(@Body() body: { sessionId: string; columnMapping: Record<string, string | null> }) {
    const session = this.uploadSessionService.getSession(body.sessionId);
    if (!session) {
      throw new BadRequestException('Session not found or expired');
    }

    const sessionMapping = session.mapping as { mapping?: Record<string, { columnName: string; confidence: number }> } | undefined;
    const originalMapping = sessionMapping?.mapping ?? {};

    const updatedMapping: { mapping: Record<string, { columnName: string; confidence: number }> } = { mapping: {} };
    for (const [field, columnName] of Object.entries(body.columnMapping)) {
      if (columnName) {
        const originalFieldMapping = originalMapping[field];
        updatedMapping.mapping[field] = {
          columnName,
          confidence: originalFieldMapping?.confidence ?? 0.5,
        };
      }
    }

    session.mapping = updatedMapping;

    const mappedRows = session.rows.map((row) => {
      const result: any = {};
      for (const [field, columnMappingInfo] of Object.entries(updatedMapping.mapping)) {
        const columnName = columnMappingInfo?.columnName;
        if (columnName) {
          result[field] = row[columnName] ?? '';
        }
      }
      return result;
    });

    const outboundItems = mappedRows
      .filter((row) => row.orderId)
      .map((row) => ({
        availableFields: row,
      }));

    const productMapping = await this.aiProductMapperService.mapOutboundItemsToProducts(
      session.projectId,
      outboundItems,
    );

    return {
      success: true,
      data: {
        productMapping: {
          totalItems: productMapping.totalItems,
          matchedItems: productMapping.matchedItems,
          needsReview: productMapping.needsReview,
          results: productMapping.results,
        },
      },
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSession(@Param('id') id: string) {
    const session = this.uploadSessionService.getSession(id);
    if (!session) {
      throw new BadRequestException('Session not found');
    }
    this.uploadSessionService.deleteSession(id);
  }
}
