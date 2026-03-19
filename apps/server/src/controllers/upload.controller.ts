import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiResponse, ApiBody } from '@nestjs/swagger';
import { UploadService } from '../services/upload.service';
import { DataTransformerService } from '../services/dataTransformer.service';
import { ProductsService } from '../services/products.service';
import { ConfirmUploadDto } from '../dto/confirmUpload.dto';
import type {
  OutboundUploadResult,
  ProductMappingData,
  ProductMatchResult,
  ParseOutboundResponse,
  ProcessOutboundRequest,
} from '@wms/types';

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly dataTransformerService: DataTransformerService,
    private readonly productsService: ProductsService,
  ) {}

  @Post('outbound-direct')
  @ApiOperation({
    summary: 'Directly upload and save outbound data from Excel, creating a new batch',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiResponse({
    status: 200,
    description: 'File uploaded and saved successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async uploadOutboundDirect(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ success: boolean; data: OutboundUploadResult }> {
    if (!file) throw new BadRequestException('File is required');

    const result = await this.uploadService.uploadAndSaveDirect(file);
    return { success: true, data: result };
  }

  @Post('map-products')
  @ApiOperation({ summary: 'Map SKUs to ProductIds' })
  @ApiResponse({
    status: 200,
    description: 'Products mapped successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async mapProducts(
    @Body() body: MapProductsDto,
  ): Promise<{ success: boolean; data: ProductMappingData }> {
    const { parsedOrders } = await this.dataTransformerService.transformAndMapOutbound(
      body.columnMapping,
      body.rows,
    );

    const results: ProductMatchResult[] = [];
    let itemIndex = 0;

    for (const order of parsedOrders) {
      for (const item of order.outboundItems) {
        const products = await this.productsService.findByNameGlobal(item.sku);
        const productIds = products.length > 0 ? products.map((p) => p.id) : null;

        results.push({
          outboundItemIndex: itemIndex,
          orderId: order.orderId,
          productIds,
          sku: item.sku,
          rawValue: item.sku,
          quantity: item.quantity,
        });

        itemIndex++;
      }
    }

    return { success: true, data: { results } };
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Confirm and complete upload' })
  @ApiResponse({
    status: 200,
    description: 'Upload confirmed successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async confirm(
    @Body() confirmUploadDto: ConfirmUploadDto,
  ): Promise<{ success: boolean; data: { imported: number } }> {
    const result = await this.uploadService.confirmUpload(confirmUploadDto);
    return { success: true, data: result };
  }

  @Post('parse-outbound')
  @ApiOperation({ summary: 'Parse outbound Excel file for preview with template matching' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiResponse({ status: 200, description: 'File parsed successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async parseOutbound(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ success: boolean; data: ParseOutboundResponse }> {
    if (!file) throw new BadRequestException('File is required');

    const result = await this.uploadService.parseForPreview(file);
    return { success: true, data: result };
  }

  @Post('process-outbound')
  @ApiOperation({ summary: 'Process confirmed outbound upload with column mapping' })
  @ApiResponse({ status: 200, description: 'Outbound data processed successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async processOutbound(
    @Body() body: ProcessOutboundRequest,
  ): Promise<{ success: boolean; data: OutboundUploadResult }> {
    const result = await this.uploadService.processConfirmed(body);
    return { success: true, data: result };
  }
}

export interface MapProductsDto {
  columnMapping: Record<string, string>;
  rows: Record<string, unknown>[];
}
