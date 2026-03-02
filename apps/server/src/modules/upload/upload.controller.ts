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
import { UploadParseService } from './services/upload-parse.service';
import { UploadConfirmService } from './services/upload-confirm.service';
import { UploadMappingService } from './services/upload-mapping.service';
import { UploadSessionService } from './services/upload-session.service';
import { ParseUploadDto } from './dto/parse-upload.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { ConfirmMappingUploadDto } from './dto/confirm-mapping-upload.dto';
import { ParseUploadResponseDto } from './dto/parse-upload-response.dto';
import { ConfirmUploadResponseDto } from './dto/confirm-upload-response.dto';
import { ParseMappingUploadResponseDto } from './dto/parse-mapping-upload-response.dto';
import { ConfirmMappingUploadResponseDto } from './dto/confirm-mapping-upload-response.dto';
import { UpdateMappingResponseDto } from './dto/update-mapping-response.dto';
import { UpdateMappingDto } from './dto/update-mapping.dto';
import { ProductMappingDto } from './dto/product-mapping.dto';
import { ProductMappingResponseDto } from './dto/product-mapping-response.dto';

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadParseService: UploadParseService,
    private readonly uploadConfirmService: UploadConfirmService,
    private readonly uploadMappingService: UploadMappingService,
    private readonly uploadSessionService: UploadSessionService,
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
  ): Promise<ParseUploadResponseDto | ParseMappingUploadResponseDto> {
    if (!file) throw new BadRequestException('File is required');
    if (!query.type || !query.projectId)
      throw new BadRequestException('Type and projectId are required');

    if (query.type === 'outbound') {
      const data = await this.uploadParseService.parseAndMapOutbound(file, query.projectId);
      return { success: true, data } as ParseMappingUploadResponseDto;
    }

    const data = await this.uploadParseService.parseAndMapProduct(file, query.projectId);
    return { success: true, data } as ParseUploadResponseDto;
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
    if (!session) throw new BadRequestException('Session not found or expired');

    this.uploadSessionService.updateMapping(confirmUploadDto.sessionId, confirmUploadDto.mapping);

    const result =
      session.type === 'outbound'
        ? await this.uploadConfirmService.confirmOutboundUpload(
            confirmUploadDto.sessionId,
            confirmUploadDto.mapping,
          )
        : await this.uploadConfirmService.confirmProductUpload(
            confirmUploadDto.sessionId,
            confirmUploadDto.mapping,
          );

    return { success: true, data: result };
  }

  @Post('parse-mapping')
  @ApiOperation({ summary: 'Parse Excel file for outbound mapping' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiResponse({
    status: 200,
    description: 'File parsed successfully',
    type: ParseMappingUploadResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @UseInterceptors(FileInterceptor('file'))
  async parseMapping(
    @UploadedFile() file: Express.Multer.File,
    @Query() query: ParseUploadDto,
  ): Promise<ParseMappingUploadResponseDto> {
    if (!file) throw new BadRequestException('File is required');
    if (!query.type || !query.projectId)
      throw new BadRequestException('Type and projectId are required');
    if (query.type !== 'outbound')
      throw new BadRequestException('Product mapping is only available for outbound uploads');

    const data = await this.uploadParseService.parseAndMapOutbound(file, query.projectId);
    return { success: true, data };
  }

  @Post('confirm-mapping')
  @ApiOperation({ summary: 'Confirm the outbound mapping and create outbounds' })
  @ApiResponse({
    status: 200,
    description: 'Mapping confirmed successfully',
    type: ConfirmMappingUploadResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async confirmMapping(
    @Body() confirmMappingUploadDto: ConfirmMappingUploadDto,
  ): Promise<ConfirmMappingUploadResponseDto> {
    const data = await this.uploadMappingService.confirmMappingUpload(
      confirmMappingUploadDto.sessionId,
      confirmMappingUploadDto.columnMapping,
      confirmMappingUploadDto.productMapping,
    );
    return { success: true, data };
  }

  @Post('update-mapping')
  @ApiOperation({ summary: 'Update column mapping' })
  @ApiResponse({
    status: 200,
    description: 'Mapping updated successfully',
    type: UpdateMappingResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async updateMapping(
    @Body() updateMappingDto: UpdateMappingDto,
  ): Promise<UpdateMappingResponseDto> {
    await this.uploadMappingService.updateColumnMapping(
      updateMappingDto.sessionId,
      updateMappingDto.columnMapping,
    );
    return { success: true };
  }

  @Post('product-mapping')
  @ApiOperation({ summary: 'Update product mapping' })
  @ApiResponse({
    status: 200,
    description: 'Mapping updated successfully',
    type: ProductMappingResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async productMapping(@Body() body: ProductMappingDto): Promise<ProductMappingResponseDto> {
    const data = await this.uploadMappingService.updateProductMapping(
      body.sessionId,
      body.columnMapping,
    );
    return { success: true, data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an upload session' })
  @ApiResponse({ status: 204, description: 'Session deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSession(@Param('id') id: string): Promise<void> {
    const session = this.uploadSessionService.getSession(id);
    if (!session) throw new BadRequestException('Session not found');
    this.uploadSessionService.cleanup(id);
  }
}
