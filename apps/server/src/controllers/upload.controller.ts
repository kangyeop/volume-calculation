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
import { UploadParseService } from '../services/uploadParse.service';
import { UploadConfirmService } from '../services/uploadConfirm.service';
import { DataTransformerService } from '../services/dataTransformer.service';
import { ProductsService } from '../services/products.service';
import { ParseUploadDto } from '../dto/parse-upload.dto';
import { ConfirmUploadDto } from '../dto/confirm-upload.dto';
import { ParseUploadResponseDto } from '../dto/parse-upload-response.dto';
import { ConfirmUploadResponseDto } from '../dto/confirm-upload-response.dto';

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadParseService: UploadParseService,
    private readonly uploadConfirmService: UploadConfirmService,
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

    const data = await this.uploadParseService.parseFile(file, query.projectId, query.type);
    return { success: true, data };
  }

  @Post('map-products')
  @ApiOperation({ summary: 'Map SKUs to ProductIds' })
  @ApiResponse({
    status: 200,
    description: 'Products mapped successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async mapProducts(@Body() body: MapProductsDto): Promise<{ success: boolean; data: MapProductsResponseDto }> {
    const { parsedOrders } = await this.dataTransformerService.transformAndMapOutbound(
      body.columnMapping,
      body.rows,
    );

    const mappedItems: Array<{ sku: string; productId: string }> = [];
    const unmappedItems: Array<{ sku: string; reason: string }> = [];

    for (const order of parsedOrders) {
      for (const item of order.outboundItems) {
        const products = await this.productsService.findBySku(body.projectId, item.sku);
        if (products.length > 0) {
          mappedItems.push({ sku: item.sku, productId: products[0].id });
        } else {
          unmappedItems.push({ sku: item.sku, reason: 'Product not found' });
        }
      }
    }

    return { success: true, data: { parsedOrders, mappedItems, unmappedItems } };
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
    const result = await this.uploadConfirmService.confirmUpload(confirmUploadDto);
    return { success: true, data: result };
  }
}

export interface MapProductsDto {
  projectId: string;
  columnMapping: Record<string, string>;
  rows: Record<string, unknown>[];
}

export interface MapProductsResponseDto {
  parsedOrders: Array<{
    orderId: string;
    recipientName: string;
    address: string;
    outboundItems: Array<{
      sku: string;
      quantity: number;
      productId?: string | null;
      productName?: string;
    }>;
  }>;
  mappedItems: Array<{ sku: string; productId: string }>;
  unmappedItems: Array<{ sku: string; reason: string }>;
}
