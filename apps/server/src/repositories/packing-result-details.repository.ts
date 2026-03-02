import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PackingResultDetailEntity } from '../entities/packing-result-detail.entity';

@Injectable()
export class PackingResultDetailsRepository {
  constructor(
    @InjectRepository(PackingResultDetailEntity)
    private readonly repository: Repository<PackingResultDetailEntity>,
  ) {}

  async create(detail: Partial<PackingResultDetailEntity>): Promise<PackingResultDetailEntity> {
    const entity = this.repository.create(detail);
    return await this.repository.save(entity);
  }

  async createBulk(details: Partial<PackingResultDetailEntity>[]): Promise<PackingResultDetailEntity[]> {
    const entities = details.map((d) => this.repository.create(d));
    return await this.repository.save(entities);
  }

  async removeAll(projectId: string): Promise<void> {
    await this.repository.delete({ projectId });
  }
}
