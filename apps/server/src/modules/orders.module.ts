import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from '../entities/order.entity';
import { OutboundEntity } from '../entities/outbound.entity';
import { ProductEntity } from '../entities/product.entity';
import { OrdersService } from '../services/orders.service';
import { OrdersController } from '../controllers/orders.controller';
import { ProductsModule } from './products.module';

@Module({
  imports: [TypeOrmModule.forFeature([OrderEntity, OutboundEntity, ProductEntity]), ProductsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
