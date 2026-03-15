import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from '../entities/order.entity';
import { OutboundItemEntity } from '../entities/outbound-item.entity';
import { ProductEntity } from '../entities/product.entity';
import { OrdersService } from '../services/orders.service';
import { OrdersController } from '../controllers/orders.controller';
import { ProductsModule } from './products.module';
import { OutboundModule } from './outbound.module';
import { OrdersRepository } from '../repositories/orders.repository';
import { OutboundRepository } from '../repositories/outbound.repository';
import { ProductsRepository } from '../repositories/products.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity, OutboundItemEntity, ProductEntity]),
    ProductsModule,
    OutboundModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository, OutboundRepository, ProductsRepository],
  exports: [OrdersService],
})
export class OrdersModule {}
