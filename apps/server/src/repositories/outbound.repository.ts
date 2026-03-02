import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { OutboundEntity } from '../entities/outbound.entity';

@Injectable()
export class OutboundRepository {
  constructor(
    @InjectRepository(OutboundEntity)
    private readonly repository: Repository<OutboundEntity>,
  ) {}

  async create(projectId: string, outbound: Partial<OutboundEntity>): Promise<OutboundEntity> {
    const entity = this.repository.create({ ...outbound, projectId });
    return await this.repository.save(entity);
  }

  async findAll(projectId: string, batchId?: string): Promise<OutboundEntity[]> {
    const query = this.repository
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
    const results = await this.repository
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

  async remove(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async removeAll(projectId: string): Promise<void> {
    await this.repository.delete({ projectId });
  }

  @Transactional()
  async createBulk(
    projectId: string,
    outbounds: Partial<OutboundEntity>[],
  ): Promise<OutboundEntity[]> {
    const entities = outbounds.map((dto) =>
      this.repository.create({ ...dto, projectId }),
    );

    const savedEntities = await this.repository.manager.save(entities);
    return savedEntities;
  }
}
