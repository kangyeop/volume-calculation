import { Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { OutboundEntity } from '../entities/outbound.entity';
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
  async create(projectId: string, createOutboundDto: CreateOutboundDto): Promise<OutboundEntity> {
    let order = await this.ordersRepository.findOne(projectId, createOutboundDto.orderId);

    if (!order) {
      order = await this.ordersRepository.create({
        projectId,
        orderId: createOutboundDto.orderId,
        status: OrderStatus.PENDING,
      });
    }

    return await this.outboundRepository.create(projectId, {
      ...createOutboundDto,
      orderId: order.id,
      orderIdentifier: createOutboundDto.orderId,
    });
  }

  async findAll(projectId: string): Promise<OutboundEntity[]> {
    return await this.outboundRepository.findAll(projectId);
  }

  async remove(id: string): Promise<void> {
    const removed = await this.outboundRepository.remove(id);
    if (!removed) {
      throw new NotFoundException(`Outbound with ID "${id}" not found`);
    }
  }

  @Transactional()
  async createBulk(
    projectId: string,
    createOutboundDtos: CreateOutboundDto[],
  ): Promise<{ outbounds: OutboundEntity[] }> {
    const uniqueOrderIds = [...new Set(createOutboundDtos.map((dto) => dto.orderId))];
    const orderMap = new Map<string, OrderEntity>();

    for (const orderId of uniqueOrderIds) {
      let order = await this.ordersRepository.findOne(projectId, orderId);

      if (!order) {
        order = await this.ordersRepository.create({
          projectId,
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

    const savedOutbounds = await this.outboundRepository.createBulk(projectId, outbounds);
    return { outbounds: savedOutbounds };
  }

  async removeAll(projectId: string): Promise<void> {
    await this.outboundRepository.removeAll(projectId);
  }
}
