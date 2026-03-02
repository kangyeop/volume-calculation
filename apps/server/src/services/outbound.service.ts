import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { OutboundEntity } from '../entities/outbound.entity';
import { CreateOutboundDto } from '../dto/create-outbound.dto';
import { OrderEntity, OrderStatus } from '../entities/order.entity';

@Injectable()
export class OutboundService {
  constructor(
    @InjectRepository(OutboundEntity)
    private readonly outboundRepository: Repository<OutboundEntity>,
  ) {}

  @Transactional()
  async create(projectId: string, createOutboundDto: CreateOutboundDto): Promise<OutboundEntity> {
    const existingOrder = await this.outboundRepository.manager.findOne(OrderEntity, {
      where: { projectId, orderId: createOutboundDto.orderId },
    });

    if (!existingOrder) {
      const order = this.outboundRepository.manager.create(OrderEntity, {
        projectId,
        orderId: createOutboundDto.orderId,
        recipientName: createOutboundDto.recipientName,
        address: createOutboundDto.address,
        status: OrderStatus.PENDING,
      });
      await this.outboundRepository.manager.save(order);
    }

    const outbound = this.outboundRepository.create({
      ...createOutboundDto,
      projectId,
    });
    return await this.outboundRepository.save(outbound);
  }

  async findAll(projectId: string, batchId?: string): Promise<OutboundEntity[]> {
    const query = this.outboundRepository
      .createQueryBuilder('outbound')
      .where('outbound.projectId = :projectId', { projectId });
    if (batchId) {
      query.andWhere('outbound.batchId = :batchId', { batchId });
    }
    return query.orderBy('outbound.id', 'DESC').getMany();
  }

  async findBatches(projectId: string): Promise<
    {
      batchId: string;
      batchName: string;
      count: number;
      createdAt: Date;
    }[]
  > {
    const results = await this.outboundRepository
      .createQueryBuilder('outbound')
      .select('outbound.batchId', 'batchId')
      .addSelect('outbound.batchName', 'batchName')
      .addSelect('MIN(outbound.createdAt)', 'createdAt')
      .addSelect('COUNT(*)', 'count')
      .where('outbound.projectId = :projectId', { projectId })
      .andWhere('outbound.batchId IS NOT NULL')
      .groupBy('outbound.batchId')
      .addGroupBy('outbound.batchName')
      .orderBy('createdAt', 'DESC')
      .getRawMany();

    return results.map((r) => ({
      batchId: r.batchId,
      batchName: r.batchName,
      count: parseInt(r.count, 10),
      createdAt: r.createdAt,
    }));
  }

  async remove(id: string): Promise<void> {
    const result = await this.outboundRepository.delete(id);
    if (result.affected === 0) {
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

    for (const orderId of uniqueOrderIds) {
      const existingOrder = await this.outboundRepository.manager.findOne(OrderEntity, {
        where: { projectId, orderId },
      });

      if (!existingOrder) {
        const firstOutboundForOrder = createOutboundDtos.find((dto) => dto.orderId === orderId);
        const order = this.outboundRepository.manager.create(OrderEntity, {
          projectId,
          orderId,
          recipientName: firstOutboundForOrder?.recipientName,
          address: firstOutboundForOrder?.address,
          status: OrderStatus.PENDING,
        });
        await this.outboundRepository.manager.save(order);
      }
    }

    const outbounds = createOutboundDtos.map((dto) =>
      this.outboundRepository.create({
        ...dto,
        projectId,
        batchId,
        batchName,
        productId: dto.productId ?? null,
      }),
    );

    const savedOutbounds = await this.outboundRepository.manager.save(outbounds);
    return { outbounds: savedOutbounds, batchId, batchName };
  }

  async removeAll(projectId: string): Promise<void> {
    await this.outboundRepository.delete({ projectId });
  }
}
