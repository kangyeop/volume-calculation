import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OutboundEntity } from './entities/outbound.entity';
import { CreateOutboundDto } from './dto/create-outbound.dto';

@Injectable()
export class OutboundService {
  constructor(
    @InjectRepository(OutboundEntity)
    private readonly outboundRepository: Repository<OutboundEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    projectId: string,
    createOutboundDto: CreateOutboundDto,
  ): Promise<OutboundEntity> {
    const outbound = this.outboundRepository.create({
      ...createOutboundDto,
      projectId,
    });
    return this.outboundRepository.save(outbound);
  }

  async findAll(projectId: string, batchId?: string): Promise<OutboundEntity[]> {
    const where: any = { projectId };
    if (batchId) {
      where.batchId = batchId;
    }
    return this.outboundRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findBatches(projectId: string): Promise<{ batchId: string; batchName: string; count: number; createdAt: Date }[]> {
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

    return results.map(r => ({
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

  async createBulk(
    projectId: string,
    createOutboundDtos: CreateOutboundDto[],
  ): Promise<OutboundEntity[]> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const batchId = crypto.randomUUID();
      const batchName = `Upload ${new Date().toLocaleString()}`;

      const outbounds = createOutboundDtos.map((dto) =>
        this.outboundRepository.create({
          ...dto,
          projectId,
          batchId,
          batchName,
        }),
      );

      const savedOutbounds = await queryRunner.manager.save(outbounds);
      await queryRunner.commitTransaction();
      return savedOutbounds;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async removeAll(projectId: string): Promise<void> {
    await this.outboundRepository.delete({ projectId });
  }
}
