import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Query,
  Body,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ProductUploadService } from '../services/productUpload.service';
import type { ParseProductUploadData, ParseProductUploadResponse } from '@wms/types';

@ApiTags('product-upload')
@Controller('product-upload')
export class ProductUploadController {
  private readonly logger = new Logger(ProductUploadController.name);

  constructor(private readonly productUploadService: ProductUploadService) {}

  @Post('parse')
  @ApiOperation({ summary: 'Parse an Excel file for product import' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiResponse({ status: 200, description: 'File parsed successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @UseInterceptors(FileInterceptor('file'))
  async parse(
    @UploadedFile() file: Express.Multer.File,
    @Query('projectId') projectId: string,
  ): Promise<ParseProductUploadResponse> {
    if (!file) throw new BadRequestException('File is required');
    if (!projectId) throw new BadRequestException('projectId is required');

    this.logger.log(`Parsing product file: ${file.originalname} for project ${projectId}`);

    const data = await this.productUploadService.parseFile(file);
    return { success: true, data };
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Confirm and save parsed products' })
  @ApiResponse({ status: 200, description: 'Products imported successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async confirm(
    @Body()
    body: {
      projectId: string;
      rows: Record<string, unknown>[];
      mapping: ParseProductUploadData['mapping'];
    },
  ): Promise<{ success: boolean; data: { imported: number } }> {
    if (!body.projectId) throw new BadRequestException('projectId is required');
    if (!body.rows || body.rows.length === 0) throw new BadRequestException('rows are required');
    if (!body.mapping) throw new BadRequestException('mapping is required');

    this.logger.log(
      `Confirming product upload for project ${body.projectId}: ${body.rows.length} rows`,
    );

    const result = await this.productUploadService.confirmProductUpload(
      body.projectId,
      body.rows,
      body.mapping,
    );

    return { success: true, data: result };
  }
}
