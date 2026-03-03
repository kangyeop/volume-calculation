import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { PackingService } from '../services/packing.service';
import { ExcelService } from '../services/excel.service';
import { PackingRecommendation, PackingResult3D } from '@wms/types';
import { PackingResultEntity } from '../entities/packingResult.entity';
import { CalculatePackingDto } from '../dto/calculatePacking.dto';
import { CalculateOrderPackingDto } from '../dto/calculateOrderPacking.dto';

@Controller('projects/:projectId/packing')
export class PackingController {
  constructor(
    private readonly packingService: PackingService,
    private readonly excelService: ExcelService,
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
    return this.excelService.exportPackingResults(projectId, batchId);
  }

  @Post('calculate-order')
  async calculateOrder(
    @Param('projectId') projectId: string,
    @Body() dto: CalculateOrderPackingDto,
  ): Promise<PackingResult3D> {
    return this.packingService.calculateOrderPacking(projectId, dto.orderId, dto.groupLabel);
  }

  @Get('results/:orderId')
  async findByOrderId(
    @Param('projectId') projectId: string,
    @Param('orderId') orderId: string,
  ): Promise<PackingResultEntity[]> {
    return this.packingService.findByOrderId(projectId, orderId);
  }
}
