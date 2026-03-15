import { Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { OutboundItemEntity } from '../entities/outbound-item.entity';
import { CreateOutboundDto } from '../dto/createOutbound.dto';
import { OrderEntity, OrderStatus } from '../entities/order.entity';
import { OutboundRepository } from '../repositories/outbound.repository';
import { OrdersRepository } from '../repositories/orders.repository';

@Injectable()
export class OutboundService {
  constructor(
    private readonly outboundRepository: OutboundRepository,
    private readonly ordersRepository: OrdersRepository,
  ) {}

  @Transactional()
  async create(
    outboundBatchId: string,
    createOutboundDto: CreateOutboundDto,
  ): Promise<OutboundItemEntity> {
    let order = await this.ordersRepository.findOne(outboundBatchId, createOutboundDto.orderId);

    if (!order) {
      order = await this.ordersRepository.create({
        outboundBatchId,
        orderId: createOutboundDto.orderId,
        status: OrderStatus.PENDING,
      });
    }

    return await this.outboundRepository.create(outboundBatchId, {
      ...createOutboundDto,
      orderId: order.id,
      orderIdentifier: createOutboundDto.orderId,
    });
  }

  async findAll(outboundBatchId: string): Promise<OutboundItemEntity[]> {
    return await this.outboundRepository.findAll(outboundBatchId);
  }

  async remove(id: string): Promise<void> {
    const removed = await this.outboundRepository.remove(id);
    if (!removed) {
      throw new NotFoundException(`Outbound with ID "${id}" not found`);
    }
  }

  @Transactional()
  async createBulk(
    outboundBatchId: string,
    createOutboundDtos: CreateOutboundDto[],
  ): Promise<{ outbounds: OutboundItemEntity[] }> {
    const uniqueOrderIds = [...new Set(createOutboundDtos.map((dto) => dto.orderId))];
    const orderMap = new Map<string, OrderEntity>();

    for (const orderId of uniqueOrderIds) {
      let order = await this.ordersRepository.findOne(outboundBatchId, orderId);

      if (!order) {
        order = await this.ordersRepository.create({
          outboundBatchId,
          orderId,
          status: OrderStatus.PENDING,
        });
      }

      orderMap.set(orderId, order);
    }

    const outbounds = createOutboundDtos.map((dto) => {
      const order = orderMap.get(dto.orderId)!;
      return {
        ...dto,
        orderId: order.id,
        orderIdentifier: dto.orderId,
        productId: dto.productId ?? null,
      };
    });

    const savedOutbounds = await this.outboundRepository.createBulk(outboundBatchId, outbounds);
    return { outbounds: savedOutbounds };
  }

  async removeAll(outboundBatchId: string): Promise<void> {
    await this.outboundRepository.removeAll(outboundBatchId);
  }
}
