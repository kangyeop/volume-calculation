import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { OutboundItemEntity } from '../entities/outbound-item.entity';

@Injectable()
export class OutboundRepository {
  constructor(
    @InjectRepository(OutboundItemEntity)
    private readonly repository: Repository<OutboundItemEntity>,
  ) {}

  async create(
    outboundBatchId: string,
    outbound: Partial<OutboundItemEntity>,
  ): Promise<OutboundItemEntity> {
    const entity = this.repository.create({ ...outbound, outboundBatchId });
    return await this.repository.save(entity);
  }

  async findAll(outboundBatchId: string): Promise<OutboundItemEntity[]> {
    return this.repository
      .createQueryBuilder('outbound')
      .leftJoinAndSelect('outbound.order', 'order')
      .leftJoinAndSelect('outbound.product', 'product')
      .where('outbound.outboundBatchId = :outboundBatchId', { outboundBatchId })
      .orderBy('outbound.id', 'DESC')
      .getMany();
  }

  async findPaginated(
    outboundBatchId: string,
    page: number,
    limit: number,
  ): Promise<{ items: OutboundItemEntity[]; totalOrders: number; page: number; limit: number }> {
    const totalOrders = await this.repository
      .createQueryBuilder('outbound')
      .select('outbound.orderIdentifier')
      .where('outbound.outboundBatchId = :outboundBatchId', { outboundBatchId })
      .groupBy('outbound.orderIdentifier')
      .getCount();

    const orderKeysResult = await this.repository
      .createQueryBuilder('outbound')
      .select('outbound.orderIdentifier', 'orderKey')
      .where('outbound.outboundBatchId = :outboundBatchId', { outboundBatchId })
      .groupBy('outbound.orderIdentifier')
      .orderBy('outbound.orderIdentifier', 'ASC')
      .limit(limit)
      .offset((page - 1) * limit)
      .getRawMany<{ orderKey: string }>();

    const orderKeys = orderKeysResult.map((r) => r.orderKey).filter(Boolean);

    if (orderKeys.length === 0) {
      return { items: [], totalOrders, page, limit };
    }

    const items = await this.repository
      .createQueryBuilder('outbound')
      .leftJoinAndSelect('outbound.order', 'order')
      .where('outbound.outboundBatchId = :outboundBatchId', { outboundBatchId })
      .andWhere('outbound.orderIdentifier IN (:...orderKeys)', { orderKeys })
      .orderBy('outbound.orderIdentifier', 'ASC')
      .getMany();

    return { items, totalOrders, page, limit };
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async removeAll(outboundBatchId: string): Promise<void> {
    await this.repository.delete({ outboundBatchId });
  }

  @Transactional()
  async createBulk(
    outboundBatchId: string,
    outbounds: Partial<OutboundItemEntity>[],
  ): Promise<OutboundItemEntity[]> {
    const entities = outbounds.map((dto) => this.repository.create({ ...dto, outboundBatchId }));

    const savedEntities = await this.repository.manager.save(entities);
    return savedEntities;
  }
}
