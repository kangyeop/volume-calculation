import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OutboundBatchEntity } from '../entities/outbound-batch.entity';
import { format } from 'date-fns';

@Injectable()
export class OutboundBatchService {
  constructor(
    @InjectRepository(OutboundBatchEntity)
    private outboundBatchRepository: Repository<OutboundBatchEntity>,
  ) {}

  async findAll(): Promise<OutboundBatchEntity[]> {
    return this.outboundBatchRepository.find({
      order: { createdAt: 'DESC' },
    });
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

  async delete(id: string): Promise<void> {
    const batch = await this.findOne(id);
    await this.outboundBatchRepository.remove(batch);
  }
}
