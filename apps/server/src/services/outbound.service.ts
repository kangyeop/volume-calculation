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
        recipientName: createOutboundDto.recipientName,
        address: createOutboundDto.address,
        status: OrderStatus.PENDING,
      });
    }

    return await this.outboundRepository.create(projectId, {
      ...createOutboundDto,
      orderId: order.id,
    });
  }

  async findAll(projectId: string, batchId?: string): Promise<OutboundEntity[]> {
    return await this.outboundRepository.findAll(projectId, batchId);
  }

  async findBatches(projectId: string): Promise<
    {
      batchId: string;
      batchName: string;
      count: number;
      createdAt: Date;
    }[]
  > {
    return await this.outboundRepository.findBatches(projectId);
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
  ): Promise<{ outbounds: OutboundEntity[]; batchId: string; batchName: string }> {
    const batchId = crypto.randomUUID();
    const batchName = `Upload ${new Date().toLocaleString()}`;

    const uniqueOrderIds = [...new Set(createOutboundDtos.map((dto) => dto.orderId))];
    const orderMap = new Map<string, OrderEntity>();

    for (const orderId of uniqueOrderIds) {
      let order = await this.ordersRepository.findOne(projectId, orderId);

      if (!order) {
        const firstOutboundForOrder = createOutboundDtos.find((dto) => dto.orderId === orderId);
        order = await this.ordersRepository.create({
          projectId,
          orderId,
          recipientName: firstOutboundForOrder?.recipientName,
          address: firstOutboundForOrder?.address,
          status: OrderStatus.PENDING,
        });
      }

      orderMap.set(orderId, order);
    }

    const outbounds = createOutboundDtos.map((dto) => ({
      ...dto,
      batchId,
      batchName,
      orderId: orderMap.get(dto.orderId)!.id,
      productId: dto.productId ?? null,
    }));

    const savedOutbounds = await this.outboundRepository.createBulk(projectId, outbounds);
    return { outbounds: savedOutbounds, batchId, batchName };
  }

  async removeAll(projectId: string): Promise<void> {
    await this.outboundRepository.removeAll(projectId);
  }
}
