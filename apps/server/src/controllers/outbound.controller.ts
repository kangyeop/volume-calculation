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
  Query,
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

  @Post('outbound-batches/:batchId/outbounds')
  create(@Param('batchId') batchId: string, @Body() createOutboundDto: CreateOutboundDto) {
    return this.outboundService.create(batchId, createOutboundDto);
  }

  @Get('outbound-batches/:batchId/outbounds')
  findAll(
    @Param('batchId') batchId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (page !== undefined) {
      return this.outboundService.findPaginated(
        batchId,
        parseInt(page, 10) || 1,
        parseInt(limit ?? '50', 10),
      );
    }
    return this.outboundService.findAll(batchId);
  }

  @Post('outbound-batches/:batchId/outbounds/bulk')
  createBulk(@Param('batchId') batchId: string, @Body() createOutboundDtos: CreateOutboundDto[]) {
    return this.outboundService.createBulk(batchId, createOutboundDtos);
  }

  @Post('outbound-batches/:batchId/outbounds/bulk-with-file')
  @UseInterceptors(FileInterceptor('file'))
  async createBulkWithFile(
    @Param('batchId') batchId: string,
    @Body() body: CreateBulkWithFileBody,
  ) {
    const createOutboundDtos =
      typeof body.createOutboundDtos === 'string'
        ? JSON.parse(body.createOutboundDtos)
        : body.createOutboundDtos || [];

    return this.outboundService.createBulk(batchId, createOutboundDtos);
  }

  @Get('outbound-batches/:batchId/outbounds/configuration-summary')
  getConfigurationSummary(@Param('batchId') batchId: string) {
    return this.outboundService.getConfigurationSummary(batchId);
  }

  @Delete('outbounds/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.outboundService.remove(id);
  }

  @Delete('outbound-batches/:batchId/outbounds')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAll(@Param('batchId') batchId: string) {
    return this.outboundService.removeAll(batchId);
  }
}
