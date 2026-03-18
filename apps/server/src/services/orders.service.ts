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
    outboundBatchId: string,
    orderId: string,
    recipientName?: string,
    address?: string,
  ): Promise<OrderEntity> {
    let order = await this.ordersRepository.findOne(outboundBatchId, orderId);

    if (!order) {
      order = await this.ordersRepository.create({
        outboundBatchId,
        orderId,
        recipientName,
        address,
        status: OrderStatus.PENDING,
      });
    }

    return order;
  }

  async findByBatchAndOrderId(outboundBatchId: string, orderId: string): Promise<OrderEntity> {
    const order = await this.ordersRepository.findOneWithRelations(outboundBatchId, orderId);

    if (!order) {
      throw new NotFoundException(
        `Order with batchId "${outboundBatchId}" and orderId "${orderId}" not found`,
      );
    }

    return order;
  }

  @Transactional()
  async mapProducts(outboundBatchId: string, orderId: string): Promise<number> {
    const order = await this.ordersRepository.findOne(outboundBatchId, orderId);

    if (!order) {
      throw new NotFoundException(
        `Order with batchId "${outboundBatchId}" and orderId "${orderId}" not found`,
      );
    }

    const outbounds = await this.outboundRepository.findAll(outboundBatchId);

    let mappedCount = 0;
    for (const outbound of outbounds) {
      if (outbound.orderId !== orderId) continue;

      const products = await this.productsRepository.findBySkuGlobal(outbound.sku);

      if (products.length > 0) {
        const product = products[0];
        await this.outboundRepository.create(outboundBatchId, {
          ...outbound,
          productId: product.id,
        });
        mappedCount++;
      }
    }

    return mappedCount;
  }

  async calculateVolume(outboundBatchId: string, orderId: string): Promise<number> {
    const order = await this.findByBatchAndOrderId(outboundBatchId, orderId);

    let totalCBM = 0;

    for (const outbound of order.outbounds) {
      if (outbound.product) {
        const { width, length, height } = outbound.product;
        const quantity = outbound.quantity;
        const cbm = (width * length * height * quantity) / 1_000_000;
        totalCBM += cbm;
      }
    }

    return totalCBM;
  }
}
