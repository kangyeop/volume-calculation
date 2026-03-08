import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PackingResultEntity } from '../entities/packingResult.entity';
import { PackingResultDetailEntity } from '../entities/packingResultDetail.entity';

@Injectable()
export class PackingResultsRepository {
  constructor(
    @InjectRepository(PackingResultEntity)
    private readonly repository: Repository<PackingResultEntity>,
  ) {}

  async create(result: Partial<PackingResultEntity>): Promise<PackingResultEntity> {
    const entity = this.repository.create(result);
    return await this.repository.save(entity);
  }

  async findAll(projectId: string): Promise<PackingResultEntity[]> {
    return await this.repository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByOrderId(projectId: string, orderId: string): Promise<PackingResultEntity[]> {
    return await this.repository
      .createQueryBuilder('packingResult')
      .innerJoinAndSelect(
        PackingResultDetailEntity,
        'detail',
        'packingResult.projectId = detail.projectId AND detail.orderId = :orderId',
        { orderId },
      )
      .where('packingResult.projectId = :projectId', { projectId })
      .orderBy('packingResult.createdAt', 'DESC')
      .getMany();
  }

  async removeAll(projectId: string): Promise<void> {
    await this.repository.delete({ projectId });
  }

  async removeAllByProjectAndOrder(projectId: string, orderId: string): Promise<void> {
    const records = await this.repository
      .createQueryBuilder('pr')
      .select('pr.id')
      .innerJoin(
        PackingResultDetailEntity,
        'detail',
        'pr.projectId = detail.projectId AND detail.orderId = :orderId',
        { orderId },
      )
      .where('pr.projectId = :projectId', { projectId })
      .getMany();

    const ids = records.map((r) => r.id);
    if (ids.length > 0) {
      await this.repository
        .createQueryBuilder()
        .delete()
        .from(PackingResultEntity)
        .where('projectId = :projectId', { projectId })
        .andWhere('id IN (:...ids)', { ids })
        .execute();
    }
  }

  async createBulk(results: Partial<PackingResultEntity>[]): Promise<PackingResultEntity[]> {
    const entities = results.map((r) => this.repository.create(r));
    return await this.repository.save(entities);
  }
}
