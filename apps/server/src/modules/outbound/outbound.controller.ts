import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OutboundService } from './outbound.service';
import { CreateOutboundDto } from './dto/create-outbound.dto';

@Controller()
export class OutboundController {
  constructor(private readonly outboundService: OutboundService) {}

  @Post('projects/:projectId/outbounds')
  create(
    @Param('projectId') projectId: string,
    @Body() createOutboundDto: CreateOutboundDto,
  ) {
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
