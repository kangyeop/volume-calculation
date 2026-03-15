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
      .where('outbound.outboundBatchId = :outboundBatchId', { outboundBatchId })
      .orderBy('outbound.id', 'DESC')
      .getMany();
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
