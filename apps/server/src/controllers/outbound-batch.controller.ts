import { Controller, Get, Post, Delete, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { OutboundBatchService } from '../services/outbound-batch.service';

@Controller('outbound-batches')
export class OutboundBatchController {
  constructor(
    private readonly outboundBatchService: OutboundBatchService,
  ) {}

  @Get()
  findAll() {
    return this.outboundBatchService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.outboundBatchService.findOne(id);
  }

  @Post()
  create(@Body('name') name: string) {
    return this.outboundBatchService.create(name);
  }

  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.outboundBatchService.delete(id);
  }
}
