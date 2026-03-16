import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PackingResultEntity } from '../entities/packingResult.entity';

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

  async findAll(outboundBatchId: string): Promise<PackingResultEntity[]> {
    return await this.repository.find({
      where: { outboundBatchId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByOrderId(outboundBatchId: string, orderId: string): Promise<PackingResultEntity[]> {
    return await this.repository.find({
      where: { outboundBatchId, orderId },
      order: { createdAt: 'DESC' },
    });
  }

  async removeAll(outboundBatchId: string): Promise<void> {
    await this.repository.delete({ outboundBatchId });
  }

  async removeAllByBatchAndOrder(outboundBatchId: string, orderId: string): Promise<void> {
    await this.repository.delete({ outboundBatchId, orderId });
  }

  async createBulk(results: Partial<PackingResultEntity>[]): Promise<PackingResultEntity[]> {
    const CHUNK = 500;
    const saved: PackingResultEntity[] = [];
    for (let i = 0; i < results.length; i += CHUNK) {
      const entities = results.slice(i, i + CHUNK).map((r) => this.repository.create(r));
      const result = await this.repository.save(entities);
      saved.push(...result);
    }
    return saved;
  }
}
