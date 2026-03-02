import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { OrderEntity, OrderStatus } from '../entities/order.entity';
import { OutboundEntity } from '../entities/outbound.entity';
import { ProductEntity } from '../entities/product.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly ordersRepository: Repository<OrderEntity>,
  ) {}

  async findOrCreate(
    projectId: string,
    orderId: string,
    recipientName?: string,
    address?: string,
  ): Promise<OrderEntity> {
    let order = await this.ordersRepository.findOne({
      where: { projectId, orderId },
    });

    if (!order) {
      order = this.ordersRepository.create({
        projectId,
        orderId,
        recipientName,
        address,
        status: OrderStatus.PENDING,
      });
      order = await this.ordersRepository.save(order);
    }

    return order;
  }

  async findByProjectAndOrderId(projectId: string, orderId: string): Promise<OrderEntity> {
    const order = await this.ordersRepository.findOne({
      where: { projectId, orderId },
      relations: ['outbounds', 'outbounds.product'],
    });

    if (!order) {
      throw new NotFoundException(
        `Order with projectId "${projectId}" and orderId "${orderId}" not found`,
      );
    }

    return order;
  }

  @Transactional()
  async mapProducts(projectId: string, orderId: string): Promise<number> {
    const order = await this.ordersRepository.manager.findOne(OrderEntity, {
      where: { projectId, orderId },
    });

    if (!order) {
      throw new NotFoundException(
        `Order with projectId "${projectId}" and orderId "${orderId}" not found`,
      );
    }

    const outbounds = await this.ordersRepository.manager.find(OutboundEntity, {
      where: { projectId, orderId },
    });

    let mappedCount = 0;
    for (const outbound of outbounds) {
      const product = await this.ordersRepository.manager.findOne(ProductEntity, {
        where: { projectId, sku: outbound.sku },
      });

      if (product) {
        outbound.productId = product.id;
        await this.ordersRepository.manager.save(outbound);
        mappedCount++;
      }
    }

    return mappedCount;
  }

  async calculateVolume(projectId: string, orderId: string): Promise<number> {
    const order = await this.findByProjectAndOrderId(projectId, orderId);

    let totalCBM = 0;

    for (const outbound of order.outbounds) {
      if (outbound.product) {
        const { width, length, height } = outbound.product;
        const quantity = outbound.quantity;
        const cbm = (width * length * height * quantity) / 1000000;
        totalCBM += cbm;
      }
    }

    return totalCBM;
  }
}
