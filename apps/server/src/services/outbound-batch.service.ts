import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { OutboundBatchEntity } from '../entities/outbound-batch.entity';
import { OutboundItemEntity } from '../entities/outbound-item.entity';
import { OrderEntity } from '../entities/order.entity';
import { PackingResultEntity } from '../entities/packingResult.entity';
import { PackingResultDetailEntity } from '../entities/packingResultDetail.entity';
import { format } from 'date-fns';

@Injectable()
export class OutboundBatchService {
  constructor(
    @InjectRepository(OutboundBatchEntity)
    private outboundBatchRepository: Repository<OutboundBatchEntity>,
    @InjectRepository(OutboundItemEntity)
    private outboundItemRepository: Repository<OutboundItemEntity>,
    @InjectRepository(OrderEntity)
    private orderRepository: Repository<OrderEntity>,
    @InjectRepository(PackingResultEntity)
    private packingResultRepository: Repository<PackingResultEntity>,
    @InjectRepository(PackingResultDetailEntity)
    private packingResultDetailRepository: Repository<PackingResultDetailEntity>,
  ) {}

  async findAll(): Promise<OutboundBatchEntity[]> {
    return this.outboundBatchRepository
      .createQueryBuilder('batch')
      .select(['batch.id', 'batch.name', 'batch.createdAt', 'batch.updatedAt'])
      .orderBy('batch.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: string): Promise<OutboundBatchEntity> {
    const batch = await this.outboundBatchRepository.findOne({
      where: { id },
      relations: ['orders', 'outboundItems', 'packingResults'],
    });
    if (!batch) throw new NotFoundException(`OutboundBatch ${id} not found`);
    return batch;
  }

  async generateBatchName(filename: string): Promise<string> {
    const today = format(new Date(), 'yyyyMMdd');
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const count = await this.outboundBatchRepository
      .createQueryBuilder('batch')
      .where('batch.createdAt >= :start AND batch.createdAt <= :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .getCount();

    const cleanFilename = filename.replace(/\.[^/.]+$/, '');
    return `${today}-${count + 1}-${cleanFilename}`;
  }

  async create(name: string): Promise<OutboundBatchEntity> {
    const batch = this.outboundBatchRepository.create({ name });
    return this.outboundBatchRepository.save(batch);
  }

  @Transactional()
  async delete(id: string): Promise<void> {
    const batch = await this.outboundBatchRepository.findOne({ where: { id } });
    if (!batch) throw new NotFoundException(`OutboundBatch ${id} not found`);

    await this.packingResultDetailRepository.delete({ outboundBatchId: id });
    await this.packingResultRepository.delete({ outboundBatchId: id });
    await this.outboundItemRepository.delete({ outboundBatchId: id });
    await this.orderRepository.delete({ outboundBatchId: id });
    await this.outboundBatchRepository.delete(id);
  }
}
