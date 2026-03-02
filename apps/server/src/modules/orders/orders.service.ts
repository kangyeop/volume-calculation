import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OrderEntity, OrderStatus } from './entities/order.entity';
import { OutboundEntity } from '../outbound/entities/outbound.entity';
import { ProductEntity } from '../products/entities/product.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly ordersRepository: Repository<OrderEntity>,
    private readonly dataSource: DataSource,
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

  async mapProducts(projectId: string, orderId: string): Promise<number> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(OrderEntity, {
        where: { projectId, orderId },
      });

      if (!order) {
        throw new NotFoundException(
          `Order with projectId "${projectId}" and orderId "${orderId}" not found`,
        );
      }

      const outbounds = await queryRunner.manager.find(OutboundEntity, {
        where: { projectId, orderId },
      });

      let mappedCount = 0;
      for (const outbound of outbounds) {
        const product = await queryRunner.manager.findOne(ProductEntity, {
          where: { projectId, sku: outbound.sku },
        });

        if (product) {
          outbound.productId = product.id;
          await queryRunner.manager.save(outbound);
          mappedCount++;
        }
      }

      await queryRunner.commitTransaction();
      return mappedCount;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
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
