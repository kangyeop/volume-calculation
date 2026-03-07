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

  async findAll(projectId: string): Promise<OutboundEntity[]> {
    return this.repository
      .createQueryBuilder('outbound')
      .leftJoinAndSelect('outbound.order', 'order')
      .where('outbound.projectId = :projectId', { projectId })
      .orderBy('outbound.id', 'DESC')
      .getMany();
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
    const entities = outbounds.map((dto) => this.repository.create({ ...dto, projectId }));

    const savedEntities = await this.repository.manager.save(entities);
    return savedEntities;
  }
}
