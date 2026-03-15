import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PackingResultEntity } from '../entities/packingResult.entity';
import { OutboundBatchEntity } from '../entities/outbound-batch.entity';
import type { DashboardStats, BatchStats } from '@wms/types';

@Controller('dashboard')
export class DashboardController {
  constructor(
    @InjectRepository(PackingResultEntity)
    private readonly packingResultRepository: Repository<PackingResultEntity>,
  ) {}

  @Get('stats')
  async getStats(): Promise<{ success: boolean; data: DashboardStats }> {
    const results = await this.packingResultRepository
      .createQueryBuilder('pr')
      .innerJoin(OutboundBatchEntity, 'b', 'b.id = pr.outboundBatchId')
      .select('pr.outboundBatchId', 'batchId')
      .addSelect('b.name', 'batchName')
      .addSelect('SUM(pr.packedCount)', 'boxCount')
      .addSelect('MAX(pr.createdAt)', 'lastCalculatedAt')
      .groupBy('pr.outboundBatchId')
      .addGroupBy('b.name')
      .getRawMany<{
        batchId: string;
        batchName: string;
        boxCount: string;
        lastCalculatedAt: string;
      }>();

    const batches: BatchStats[] = results.map((row) => ({
      batchId: row.batchId,
      batchName: row.batchName,
      boxCount: Number(row.boxCount),
      lastCalculatedAt: row.lastCalculatedAt,
    }));

    const totalBatches = batches.length;
    const totalBoxesUsed = batches.reduce((sum, b) => sum + b.boxCount, 0);

    return {
      success: true,
      data: {
        totalBatches,
        totalBoxesUsed,
        batches,
      },
    };
  }
}
