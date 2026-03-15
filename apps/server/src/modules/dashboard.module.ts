import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PackingResultEntity } from '../entities/packingResult.entity';
import { OutboundBatchEntity } from '../entities/outbound-batch.entity';
import { DashboardController } from '../controllers/dashboard.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PackingResultEntity, OutboundBatchEntity])],
  controllers: [DashboardController],
})
export class DashboardModule {}
