import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { PackingService } from './packing.service';
import { ExcelExportService } from './services/excel-export.service';
import { PackingRecommendation } from '@wms/types';
import { PackingResultEntity } from './entities/packing-result.entity';
import { CalculatePackingDto } from './dto/calculate-packing.dto';

@Controller('projects/:projectId/packing')
export class PackingController {
  constructor(
    private readonly packingService: PackingService,
    private readonly excelExportService: ExcelExportService,
  ) {}

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
  findAll(@Param('projectId') projectId: string): Promise<PackingResultEntity[]> {
    return this.packingService.findAll(projectId);
  }

  @Get('export')
  async export(
    @Param('projectId') projectId: string,
    @Query('batchId') batchId: string,
  ): Promise<Buffer> {
    return this.excelExportService.exportPackingResults(projectId, batchId);
  }
}
