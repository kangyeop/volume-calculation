import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboundBatchEntity } from '../entities/outbound-batch.entity';
import { OutboundItemEntity } from '../entities/outbound-item.entity';
import { OrderEntity } from '../entities/order.entity';
import { PackingResultEntity } from '../entities/packingResult.entity';
import { PackingResultDetailEntity } from '../entities/packingResultDetail.entity';
import { OutboundBatchService } from '../services/outbound-batch.service';
import { OutboundBatchController } from '../controllers/outbound-batch.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OutboundBatchEntity,
      OutboundItemEntity,
      OrderEntity,
      PackingResultEntity,
      PackingResultDetailEntity,
    ]),
  ],
  providers: [OutboundBatchService],
  controllers: [OutboundBatchController],
  exports: [OutboundBatchService],
})
export class OutboundBatchModule {}
