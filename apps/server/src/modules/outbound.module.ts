import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboundService } from '../services/outbound.service';
import { OutboundController } from '../controllers/outbound.controller';
import { OutboundItemEntity } from '../entities/outbound-item.entity';
import { OutboundRepository } from '../repositories/outbound.repository';
import { OrderEntity } from '../entities/order.entity';
import { OrdersRepository } from '../repositories/orders.repository';

@Module({
  imports: [TypeOrmModule.forFeature([OutboundItemEntity, OrderEntity])],
  controllers: [OutboundController],
  providers: [OutboundService, OutboundRepository, OrdersRepository],
  exports: [OutboundService, OutboundRepository, OrdersRepository],
})
export class OutboundModule {}
