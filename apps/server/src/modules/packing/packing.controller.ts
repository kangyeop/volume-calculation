import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { PackingService } from './packing.service';
import { PackingRecommendation } from '@wms/types';
import { PackingResultEntity } from './entities/packing-result.entity';
import { CalculatePackingDto } from './dto/calculate-packing.dto';

@Controller('projects/:projectId/packing')
export class PackingController {
  constructor(private readonly packingService: PackingService) {}

  @Post('calculate')
  async calculate(
    @Param('projectId') projectId: string,
    @Body() calculatePackingDto: CalculatePackingDto,
  ): Promise<PackingRecommendation> {
    return this.packingService.calculate(
      projectId,
      calculatePackingDto.groupingOption,
      calculatePackingDto.batchId,
    );
  }

  @Get('results')
  async findAll(@Param('projectId') projectId: string): Promise<PackingResultEntity[]> {
    return this.packingService.findAll(projectId);
  }
}
