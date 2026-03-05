import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboundService } from '../services/outbound.service';
import { OutboundController } from '../controllers/outbound.controller';
import { OutboundEntity } from '../entities/outbound.entity';
import { OutboundRepository } from '../repositories/outbound.repository';
import { OrderEntity } from '../entities/order.entity';
import { OrdersRepository } from '../repositories/orders.repository';

@Module({
  imports: [TypeOrmModule.forFeature([OutboundEntity, OrderEntity])],
  controllers: [OutboundController],
  providers: [OutboundService, OutboundRepository, OrdersRepository],
  exports: [OutboundService, OutboundRepository],
})
export class OutboundModule {}
