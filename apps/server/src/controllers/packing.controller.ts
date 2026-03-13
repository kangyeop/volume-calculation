import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { PackingService } from '../services/packing.service';
import { ExcelService } from '../services/excel.service';
import { PackingRecommendation, PackingResult3D } from '@wms/types';
import { PackingResultEntity } from '../entities/packingResult.entity';
import { PackingResultDetailEntity } from '../entities/packingResultDetail.entity';
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
    return this.packingService.calculate(projectId, calculatePackingDto.groupingOption);
  }

  @Get('results')
  findAll(@Param('projectId') projectId: string): Promise<PackingResultEntity[]> {
    return this.packingService.findAll(projectId);
  }

  @Get('details')
  findAllDetails(@Param('projectId') projectId: string): Promise<PackingResultDetailEntity[]> {
    return this.packingService.findAllDetails(projectId);
  }

  @Get('export')
  async export(@Param('projectId') projectId: string): Promise<Buffer> {
    return this.excelService.exportPackingResults(projectId);
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
