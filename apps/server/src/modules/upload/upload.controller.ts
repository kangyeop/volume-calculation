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
import { OutboundService } from '../outbound/outbound.service';
import { ProductsService } from '../products/products.service';
import { ParseUploadDto } from './dto/parse-upload.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';

@Controller('upload')
export class UploadController {
  constructor(
    private readonly excelParserService: ExcelParserService,
    private readonly uploadSessionService: UploadSessionService,
    private readonly aiColumnMapperService: AIColumnMapperService,
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
      const products = mappedRows
        .filter((row) => row.sku && row.name)
        .map((row) => ({
          sku: String(row.sku || ''),
          name: String(row.name || ''),
          width: parseFloat(row.width || '0') || 0,
          length: parseFloat(row.length || '0') || 0,
          height: parseFloat(row.height || '0') || 0,
        }));

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
