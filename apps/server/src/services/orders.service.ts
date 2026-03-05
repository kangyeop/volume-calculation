import { Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { OrderEntity, OrderStatus } from '../entities/order.entity';
import { OrdersRepository } from '../repositories/orders.repository';
import { OutboundRepository } from '../repositories/outbound.repository';
import { ProductsRepository } from '../repositories/products.repository';

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly outboundRepository: OutboundRepository,
    private readonly productsRepository: ProductsRepository,
  ) {}

  async findOrCreate(
    projectId: string,
    orderId: string,
    quantity?: number,
    recipientName?: string,
    address?: string,
  ): Promise<OrderEntity> {
    let order = await this.ordersRepository.findOne(projectId, orderId);

    if (!order) {
      order = await this.ordersRepository.create({
        projectId,
        orderId,
        quantity: quantity || 1,
        recipientName,
        address,
        status: OrderStatus.PENDING,
      });
    }

    return order;
  }

  async findByProjectAndOrderId(projectId: string, orderId: string): Promise<OrderEntity> {
    const order = await this.ordersRepository.findOneWithRelations(projectId, orderId);

    if (!order) {
      throw new NotFoundException(
        `Order with projectId "${projectId}" and orderId "${orderId}" not found`,
      );
    }

    return order;
  }

  @Transactional()
  async mapProducts(projectId: string, orderId: string): Promise<number> {
    const order = await this.ordersRepository.findOne(projectId, orderId);

    if (!order) {
      throw new NotFoundException(
        `Order with projectId "${projectId}" and orderId "${orderId}" not found`,
      );
    }

    const outbounds = await this.outboundRepository.findAll(projectId);

    let mappedCount = 0;
    for (const outbound of outbounds) {
      if (outbound.orderId !== orderId) continue;

      const products = await this.productsRepository.findBySku(projectId, outbound.sku);

      if (products.length > 0) {
        const product = products[0];
        await this.outboundRepository.create(projectId, {
          ...outbound,
          productId: product.id,
        });
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
