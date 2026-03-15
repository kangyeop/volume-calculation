import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboundBatchEntity } from '../entities/outbound-batch.entity';
import { PackingResultEntity } from '../entities/packingResult.entity';
import { OutboundBatchService } from '../services/outbound-batch.service';
import { OutboundBatchController } from '../controllers/outbound-batch.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OutboundBatchEntity, PackingResultEntity])],
  providers: [OutboundBatchService],
  controllers: [OutboundBatchController],
  exports: [OutboundBatchService],
})
export class OutboundBatchModule {}
