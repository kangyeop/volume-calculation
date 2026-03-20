import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { PackingService } from '../services/packing.service';
import { ExcelService } from '../services/excel.service';
import { PackingRecommendation, PackingResult3DLegacy } from '@wms/types';
import { PackingResultEntity } from '../entities/packingResult.entity';
import { PackingResultDetailEntity } from '../entities/packingResultDetail.entity';
import { CalculatePackingDto } from '../dto/calculatePacking.dto';
import { CalculateOrderPackingDto } from '../dto/calculateOrderPacking.dto';
import { UpdateBoxAssignmentDto } from '../dto/updateBoxAssignment.dto';

@Controller('outbound-batches/:batchId/packing')
export class PackingController {
  constructor(
    private readonly packingService: PackingService,
    private readonly excelService: ExcelService,
  ) {}

  @Post('calculate')
  async calculate(
    @Param('batchId') batchId: string,
    @Body() calculatePackingDto: CalculatePackingDto,
  ): Promise<PackingRecommendation> {
    return this.packingService.calculate(batchId, calculatePackingDto.groupingOption, calculatePackingDto.boxGroupId);
  }

  @Patch('recommendation')
  async updateBoxAssignment(
    @Param('batchId') batchId: string,
    @Body() dto: UpdateBoxAssignmentDto,
  ): Promise<PackingRecommendation> {
    return this.packingService.updateBoxAssignment(
      batchId,
      dto.groupIndex,
      dto.boxIndex,
      dto.newBoxId,
    );
  }

  @Get('recommendation')
  async getRecommendation(
    @Param('batchId') batchId: string,
  ): Promise<PackingRecommendation | null> {
    return this.packingService.getRecommendation(batchId);
  }

  @Get('results')
  findAll(@Param('batchId') batchId: string): Promise<PackingResultEntity[]> {
    return this.packingService.findAll(batchId);
  }

  @Get('details')
  findAllDetails(@Param('batchId') batchId: string): Promise<PackingResultDetailEntity[]> {
    return this.packingService.findAllDetails(batchId);
  }

  @Get('export')
  async export(@Param('batchId') batchId: string): Promise<Buffer> {
    return this.excelService.exportPackingResults(batchId);
  }

  @Post('calculate-order')
  async calculateOrder(
    @Param('batchId') batchId: string,
    @Body() dto: CalculateOrderPackingDto,
  ): Promise<PackingResult3DLegacy> {
    return this.packingService.calculateOrderPacking(batchId, dto.orderId, dto.groupLabel);
  }

  @Get('results/:orderId')
  async findByOrderId(
    @Param('batchId') batchId: string,
    @Param('orderId') orderId: string,
  ): Promise<PackingResultEntity[]> {
    return this.packingService.findByOrderId(batchId, orderId);
  }
}
