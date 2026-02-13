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

  async findAll(projectId: string): Promise<OutboundEntity[]> {
    return this.outboundRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
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
      const outbounds = createOutboundDtos.map((dto) =>
        this.outboundRepository.create({
          ...dto,
          projectId,
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
