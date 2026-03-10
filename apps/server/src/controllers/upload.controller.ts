import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Body,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiResponse, ApiBody } from '@nestjs/swagger';
import { UploadService } from '../services/upload.service';
import { DataTransformerService } from '../services/dataTransformer.service';
import { ProductsService } from '../services/products.service';
import { ParseUploadDto } from '../dto/parseUpload.dto';
import { ConfirmUploadDto } from '../dto/confirmUpload.dto';
import { ParseUploadResponseDto } from '../dto/parseUploadResponse.dto';
import { ConfirmUploadResponseDto } from '../dto/confirmUploadResponse.dto';
import type { OutboundUploadResult, ProductMappingData, ProductMatchResult } from '@wms/types';

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly dataTransformerService: DataTransformerService,
    private readonly productsService: ProductsService,
  ) {}

  @Post('parse')
  @ApiOperation({ summary: 'Parse and map an Excel file for upload' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiResponse({
    status: 200,
    description: 'File parsed successfully',
    type: ParseUploadResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @UseInterceptors(FileInterceptor('file'))
  async parse(
    @UploadedFile() file: Express.Multer.File,
    @Query() query: ParseUploadDto,
  ): Promise<ParseUploadResponseDto> {
    if (!file) throw new BadRequestException('File is required');
    if (!query.type || !query.projectId)
      throw new BadRequestException('Type and projectId are required');

    const data = await this.uploadService.parseFile(file, query.projectId, query.type);
    return { success: true, data };
  }

  @Post('outbound-direct')
  @ApiOperation({ summary: 'Directly upload and save outbound data from Excel' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiResponse({
    status: 200,
    description: 'File uploaded and saved successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadOutboundDirect(
    @UploadedFile() file: Express.Multer.File,
    @Query('projectId') projectId: string,
  ): Promise<{ success: boolean; data: OutboundUploadResult }> {
    if (!file) throw new BadRequestException('File is required');
    if (!projectId) throw new BadRequestException('projectId is required');

    const result = await this.uploadService.uploadAndSaveDirect(file, projectId);
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
        const products = await this.productsService.findByName(body.projectId, item.sku);
        const productIds = products.length > 0 ? products.map((p) => p.id) : null;

        results.push({
          outboundItemIndex: itemIndex,
          orderId: order.orderId,
          productIds,
          sku: item.sku,
          rawValue: item.rawValue || item.sku,
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
    type: ConfirmUploadResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async confirm(@Body() confirmUploadDto: ConfirmUploadDto): Promise<ConfirmUploadResponseDto> {
    const result = await this.uploadService.confirmUpload(confirmUploadDto);
    return { success: true, data: result };
  }
}

export interface MapProductsDto {
  projectId: string;
  columnMapping: Record<string, string>;
  rows: Record<string, unknown>[];
}
