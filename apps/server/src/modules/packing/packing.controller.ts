import { Controller, Get, Post, Param } from '@nestjs/common';
import { PackingService } from './packing.service';
import { PackingRecommendation } from '@wms/types';
import { PackingResultEntity } from './entities/packing-result.entity';

@Controller('projects/:projectId/packing')
export class PackingController {
  constructor(private readonly packingService: PackingService) {}

  @Post('calculate')
  async calculate(
    @Param('projectId') projectId: string,
  ): Promise<PackingRecommendation> {
    return this.packingService.calculate(projectId);
  }

  @Get('results')
  async findAll(
    @Param('projectId') projectId: string,
  ): Promise<PackingResultEntity[]> {
    return this.packingService.findAll(projectId);
  }
}
