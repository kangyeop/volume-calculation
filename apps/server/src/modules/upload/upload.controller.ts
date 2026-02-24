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
import { ApiTags, ApiOperation, ApiConsumes, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ExcelParserService } from './services/excel-parser.service';
import { UploadSessionService } from './services/upload-session.service';
import { AIColumnMapperService } from '../ai/services/ai-column-mapper.service';
import { AIProductMapperService } from '../ai/services/ai-product-mapper.service';
import { OutboundService } from '../outbound/outbound.service';
import { ProductsService } from '../products/products.service';
import { ParseUploadDto } from './dto/parse-upload.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { ConfirmMappingUploadDto } from './dto/confirm-mapping-upload.dto';
import type { OutboundItem } from './services/upload-session.service';
import { ParseUploadResponseDto } from './dto/parse-upload-response.dto';
import { ConfirmUploadResponseDto } from './dto/confirm-upload-response.dto';
import { ParseMappingUploadResponseDto } from './dto/parse-mapping-upload-response.dto';
import { ConfirmMappingUploadResponseDto } from './dto/confirm-mapping-upload-response.dto';
import { UpdateMappingResponseDto } from './dto/update-mapping-response.dto';
import { UpdateMappingDto } from './dto/update-mapping.dto';
import { MappingResult } from '@wms/types';

@ApiTags('upload')
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
  @ApiOperation({ summary: 'Parse and map an Excel file for upload' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'File parsed successfully',
    type: ParseUploadResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @UseInterceptors(FileInterceptor('file'))
  async parse(@UploadedFile() file: Express.Multer.File, @Query() query: ParseUploadDto): Promise<ParseUploadResponseDto> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!query.type || !query.projectId) {
      throw new BadRequestException('Type and projectId are required');
    }

    const parseResult = this.excelParserService.parseExcelFile(file);

    const mappingResult: MappingResult = query.type === 'outbound'
      ? await this.aiColumnMapperService.mapOutboundColumns(
          parseResult.headers,
          parseResult.rows,
        )
      : await this.aiColumnMapperService.mapProductColumns(
          parseResult.headers,
          parseResult.rows,
        );

    const sessionId = this.uploadSessionService.createSession({
      type: query.type,
      projectId: query.projectId,
      headers: parseResult.headers,
      mapping: mappingResult as unknown as Record<string, unknown>,
      rows: parseResult.rows,
      fileName: file.originalname,
    });

    return {
      success: true,
      data: {
        sessionId,
        headers: parseResult.headers,
        rowCount: parseResult.rowCount,
        mapping: mappingResult,
        fileName: file.originalname,
      },
    };
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Confirm and complete the upload' })
  @ApiResponse({
    status: 200,
    description: 'Upload confirmed successfully',
    type: ConfirmUploadResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async confirm(@Body() confirmUploadDto: ConfirmUploadDto): Promise<ConfirmUploadResponseDto> {
    const session = this.uploadSessionService.getSession(confirmUploadDto.sessionId);
    if (!session) {
      throw new BadRequestException('Session not found or expired');
    }

    this.uploadSessionService.updateMapping(confirmUploadDto.sessionId, confirmUploadDto.mapping);

    const mapping = confirmUploadDto.mapping;
    const mappedRows = session.rows.map((row) => {
      const result: Record<string, unknown> = {};
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
          quantity: parseInt(String(row.quantity || '1'), 10) || 1,
          recipientName: row.recipientName ? String(row.recipientName) : undefined,
          recipientPhone: row.recipientPhone ? String(row.recipientPhone) : undefined,
          zipCode: row.zipCode ? String(row.zipCode) : undefined,
          address: row.address ? String(row.address) : undefined,
          detailAddress: row.detailAddress ? String(row.detailAddress) : undefined,
          shippingMemo: row.shippingMemo ? String(row.shippingMemo) : undefined,
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
      const originalMapping = session.originalMapping as MappingResult | undefined;
      const dimensionMapping = originalMapping?.mapping?.dimensions as { separator?: string } | undefined;
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
  @ApiOperation({ summary: 'Parse Excel file for outbound mapping' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'File parsed successfully',
    type: ParseMappingUploadResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @UseInterceptors(FileInterceptor('file'))
  async parseMapping(@UploadedFile() file: Express.Multer.File, @Query() query: ParseUploadDto): Promise<ParseMappingUploadResponseDto> {
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
      parseResult.rows,
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
        columnMapping,
        fileName: file.originalname,
      },
    };
  }

  @Post('confirm-mapping')
  @ApiOperation({ summary: 'Confirm the outbound mapping and create outbounds' })
  @ApiResponse({
    status: 200,
    description: 'Mapping confirmed successfully',
    type: ConfirmMappingUploadResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async confirmMapping(@Body() confirmMappingUploadDto: ConfirmMappingUploadDto): Promise<ConfirmMappingUploadResponseDto> {
    const session = this.uploadSessionService.getSession(confirmMappingUploadDto.sessionId);
    if (!session) {
      throw new BadRequestException('Session not found or expired');
    }

    const transformedData = session.transformedData;
    if (!transformedData || transformedData.length === 0) {
      throw new BadRequestException('No transformed data found. Please call update-mapping first.');
    }

    const sessionProductMapping = session.productMapping || {};
    const requestProductMapping = confirmMappingUploadDto.productMapping || {};

    const finalProductMapping = { ...sessionProductMapping, ...requestProductMapping };

    const outbounds = transformedData.map((item, index) => {
      const productIds = finalProductMapping[index];
      return {
        orderId: item.orderId,
        sku: item.sku,
        quantity: item.quantity,
        recipientName: item.recipientName,
        address: item.address,
        productId: productIds?.[0] ?? null,
      };
    });

    const results = await this.outboundService.createBulk(session.projectId, outbounds);

    const mappedCount = results.filter((r) => r.productId !== null).length;
    const unmappedCount = results.length - mappedCount;
    const uniqueOrderIds = Array.from(new Set(results.map((r) => r.orderId).filter(Boolean)));

    this.uploadSessionService.deleteSession(confirmMappingUploadDto.sessionId);

    return {
      success: true,
      data: {
        imported: results.length,
        batchId: results[0]?.batchId,
        mappedCount,
        unmappedCount,
        orderIds: uniqueOrderIds,
      },
    };
  }

  @Post('update-mapping')
  @ApiOperation({ summary: 'Update column mapping and get product suggestions' })
  @ApiResponse({
    status: 200,
    description: 'Mapping updated successfully',
    type: UpdateMappingResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async updateMapping(@Body() updateMappingDto: UpdateMappingDto): Promise<UpdateMappingResponseDto> {
    const session = this.uploadSessionService.getSession(updateMappingDto.sessionId);
    if (!session) {
      throw new BadRequestException('Session not found or expired');
    }

    const cleanColumnMapping: Record<string, string> = {};
    for (const [field, columnName] of Object.entries(updateMappingDto.columnMapping)) {
      if (columnName) {
        cleanColumnMapping[field] = columnName;
      }
    }

    const transformedData = this.transformOutboundRows(session.rows, cleanColumnMapping);

    this.uploadSessionService.updateTransformedData(updateMappingDto.sessionId, transformedData);
    this.uploadSessionService.updateColumnMapping(updateMappingDto.sessionId, cleanColumnMapping);

    const outboundItems = transformedData.map((item) => ({
      availableFields: {
        orderId: item.orderId,
        sku: item.sku,
        quantity: String(item.quantity),
        ...(item.recipientName ? { recipientName: item.recipientName } : {}),
        ...(item.address ? { address: item.address } : {}),
      } as Record<string, string>,
    }));

    const productMapping = await this.aiProductMapperService.mapOutboundItemsToProducts(
      session.projectId,
      outboundItems,
    );

    const productMappingWithOrderId = productMapping.map((result) => ({
      ...result,
      orderId: transformedData[result.outboundItemIndex]?.orderId,
    }));

    const productMappingRecord: Record<number, string[]> = {};
    productMapping.forEach((result) => {
      if (result.productIds) {
        productMappingRecord[result.outboundItemIndex] = result.productIds;
      }
    });
    this.uploadSessionService.updateProductMapping(updateMappingDto.sessionId, productMappingRecord);

    return {
      success: true,
      data: {
        productMapping: { results: productMappingWithOrderId },
      },
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an upload session' })
  @ApiResponse({ status: 204, description: 'Session deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSession(@Param('id') id: string): Promise<void> {
    const session = this.uploadSessionService.getSession(id);
    if (!session) {
      throw new BadRequestException('Session not found');
    }
    this.uploadSessionService.deleteSession(id);
  }

  private transformOutboundRows(
    rows: Record<string, unknown>[],
    columnMapping: Record<string, string>,
  ): OutboundItem[] {
    return rows
      .filter((row) => {
        const mapped = this.mapRow(row, columnMapping);
        return mapped.orderId && mapped.sku;
      })
      .map((row) => {
        const mapped = this.mapRow(row, columnMapping);
        return {
          orderId: String(mapped.orderId || ''),
          sku: String(mapped.sku || ''),
          quantity: parseInt(String(mapped.quantity || '1'), 10) || 1,
          recipientName: mapped.recipientName ? String(mapped.recipientName) : undefined,
          address: mapped.address ? String(mapped.address) : undefined,
        };
      });
  }

  private mapRow(row: Record<string, unknown>, columnMapping: Record<string, string>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [field, columnName] of Object.entries(columnMapping)) {
      if (columnName) {
        result[field] = row[columnName] ?? '';
      }
    }
    return result;
  }
}
