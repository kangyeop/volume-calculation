import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OutboundEntity } from './entities/outbound.entity';
import { CreateOutboundDto } from './dto/create-outbound.dto';
import { FileStorageService } from '../upload/services/file-storage.service';

interface CreateBulkOptions {
  projectId: string;
  createOutboundDtos: CreateOutboundDto[];
  fileBuffer?: Buffer;
  originalFilename?: string;
}

@Injectable()
export class OutboundService {
  constructor(
    @InjectRepository(OutboundEntity)
    private readonly outboundRepository: Repository<OutboundEntity>,
    private readonly dataSource: DataSource,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async create(projectId: string, createOutboundDto: CreateOutboundDto): Promise<OutboundEntity> {
    const outbound = this.outboundRepository.create({
      ...createOutboundDto,
      projectId,
    });
    return this.outboundRepository.save(outbound);
  }

  async findAll(projectId: string, batchId?: string): Promise<OutboundEntity[]> {
    const where: { projectId: string; batchId?: string } = { projectId };
    if (batchId) {
      where.batchId = batchId;
    }
    return this.outboundRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findBatches(projectId: string): Promise<
    {
      batchId: string;
      batchName: string;
      count: number;
      createdAt: Date;
      originalFilePath?: string;
    }[]
  > {
    const results = await this.outboundRepository
      .createQueryBuilder('outbound')
      .select('outbound.batchId', 'batchId')
      .addSelect('outbound.batchName', 'batchName')
      .addSelect('MIN(outbound.createdAt)', 'createdAt')
      .addSelect('COUNT(*)', 'count')
      .addSelect('outbound.originalFilePath', 'originalFilePath')
      .where('outbound.projectId = :projectId', { projectId })
      .andWhere('outbound.batchId IS NOT NULL')
      .groupBy('outbound.batchId')
      .addGroupBy('outbound.batchName')
      .addGroupBy('outbound.originalFilePath')
      .orderBy('createdAt', 'DESC')
      .getRawMany();

    return results.map((r) => ({
      batchId: r.batchId,
      batchName: r.batchName,
      count: parseInt(r.count, 10),
      createdAt: r.createdAt,
      originalFilePath: r.originalFilePath,
    }));
  }

  async getBatchFilePath(batchId: string): Promise<string | null> {
    const result = await this.outboundRepository
      .createQueryBuilder('outbound')
      .select('outbound.originalFilePath', 'originalFilePath')
      .where('outbound.batchId = :batchId', { batchId })
      .andWhere('outbound.originalFilePath IS NOT NULL')
      .limit(1)
      .getRawOne();

    return result?.originalFilePath || null;
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
  ): Promise<OutboundEntity[]>;
  async createBulk(options: CreateBulkOptions): Promise<OutboundEntity[]>;
  async createBulk(
    projectIdOrOptions: string | CreateBulkOptions,
    createOutboundDtos?: CreateOutboundDto[],
  ): Promise<OutboundEntity[]> {
    let projectId: string;
    let dtos: CreateOutboundDto[];
    let fileBuffer: Buffer | undefined;
    let originalFilename: string | undefined;

    if (typeof projectIdOrOptions === 'string') {
      projectId = projectIdOrOptions;
      dtos = createOutboundDtos || [];
    } else {
      const options = projectIdOrOptions;
      projectId = options.projectId;
      dtos = options.createOutboundDtos;
      fileBuffer = options.fileBuffer;
      originalFilename = options.originalFilename;
    }

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const batchId = crypto.randomUUID();
      const batchName = `Upload ${new Date().toLocaleString()}`;
      let originalFilePath: string | undefined;

      if (fileBuffer && originalFilename) {
        const ext = originalFilename.split('.').pop();
        const filename = `${batchId}.${ext || 'xlsx'}`;
        originalFilePath = await this.fileStorageService.saveFile(fileBuffer, filename);
      }

      const outbounds = dtos.map((dto) =>
        this.outboundRepository.create({
          ...dto,
          projectId,
          batchId,
          batchName,
          originalFilePath,
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
