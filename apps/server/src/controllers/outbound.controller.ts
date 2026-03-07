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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OutboundService } from '../services/outbound.service';
import { CreateOutboundDto } from '../dto/createOutbound.dto';

interface CreateBulkWithFileBody {
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
    @Body() body: CreateBulkWithFileBody,
  ) {
    const createOutboundDtos =
      typeof body.createOutboundDtos === 'string'
        ? JSON.parse(body.createOutboundDtos)
        : body.createOutboundDtos || [];

    return this.outboundService.createBulk(projectId, createOutboundDtos);
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
