import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { PackingResultDetailEntity } from '../entities/packingResultDetail.entity';

@Injectable()
export class PackingResultDetailsRepository {
  constructor(
    @InjectRepository(PackingResultDetailEntity)
    private readonly repository: Repository<PackingResultDetailEntity>,
  ) {}

  create(detail: Partial<PackingResultDetailEntity>): PackingResultDetailEntity {
    return this.repository.create(detail);
  }

  async save(entity: PackingResultDetailEntity): Promise<PackingResultDetailEntity> {
    return await this.repository.save(entity);
  }

  async createBulk(
    details: Partial<PackingResultDetailEntity>[],
  ): Promise<PackingResultDetailEntity[]> {
    const entities = details.map((d) => this.repository.create(d));
    return await this.repository.save(entities);
  }

  async removeAll(outboundBatchId: string): Promise<void> {
    await this.repository.delete({ outboundBatchId });
  }

  createQueryBuilder(): SelectQueryBuilder<PackingResultDetailEntity> {
    return this.repository.createQueryBuilder('packingResultDetail');
  }

  async findAll(outboundBatchId: string): Promise<PackingResultDetailEntity[]> {
    return await this.repository.find({
      where: { outboundBatchId },
      order: { orderId: 'ASC', boxNumber: 'ASC' },
    });
  }

  createQueryBuilderWithWhere(
    alias: string,
    where: Record<string, any>,
  ): SelectQueryBuilder<PackingResultDetailEntity> {
    const qb = this.repository.createQueryBuilder(alias);
    qb.where(where);
    return qb;
  }

  createQueryBuilderAndOrderBy(
    alias: string,
    where: Record<string, any>,
    orderBy: Record<string, 'ASC' | 'DESC'>,
  ): SelectQueryBuilder<PackingResultDetailEntity> {
    const qb = this.createQueryBuilder();
    qb.where(where);
    qb.orderBy(`${alias}.${Object.keys(orderBy)[0]}`, Object.values(orderBy)[0]);
    return qb;
  }
}
