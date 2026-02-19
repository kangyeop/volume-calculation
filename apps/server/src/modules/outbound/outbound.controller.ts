import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OutboundService } from './outbound.service';
import { CreateOutboundDto } from './dto/create-outbound.dto';

interface CreateBulkWithFileDto {
  createOutboundDtos: CreateOutboundDto[];
  originalFilename?: string;
}

@Controller()
export class OutboundController {
  constructor(private readonly outboundService: OutboundService) {}

  @Post('projects/:projectId/outbounds')
  create(@Param('projectId') projectId: string, @Body() createOutboundDto: CreateOutboundDto) {
    return this.outboundService.create(projectId, createOutboundDto);
  }

  @Get('projects/:projectId/outbounds')
  findAll(@Param('projectId') projectId: string) {
    return this.outboundService.findAll(projectId);
  }

  @Get('projects/:projectId/outbounds/batches')
  findBatches(@Param('projectId') projectId: string) {
    return this.outboundService.findBatches(projectId);
  }

  @Post('projects/:projectId/outbounds/bulk')
  createBulk(
    @Param('projectId') projectId: string,
    @Body() createOutboundDtos: CreateOutboundDto[],
  ) {
    return this.outboundService.createBulk(projectId, createOutboundDtos);
  }

  @Post('projects/:projectId/outbounds/bulk-with-file')
  @UseInterceptors(FileInterceptor('file'))
  async createBulkWithFile(
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateBulkWithFileDto,
  ) {
    let createOutboundDtos: CreateOutboundDto[] = [];

    if (typeof body.createOutboundDtos === 'string') {
      createOutboundDtos = JSON.parse(body.createOutboundDtos);
    } else {
      createOutboundDtos = body.createOutboundDtos || [];
    }

    return this.outboundService.createBulk({
      projectId,
      createOutboundDtos,
      fileBuffer: file?.buffer,
      originalFilename: body.originalFilename || file?.originalname,
    });
  }

  @Delete('outbounds/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.outboundService.remove(id);
  }

  @Delete('projects/:projectId/outbounds')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAll(@Param('projectId') projectId: string) {
    return this.outboundService.removeAll(projectId);
  }
}
