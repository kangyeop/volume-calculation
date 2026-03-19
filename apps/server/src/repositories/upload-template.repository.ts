import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadTemplateEntity } from '../entities/upload-template.entity';

@Injectable()
export class UploadTemplateRepository {
  constructor(
    @InjectRepository(UploadTemplateEntity)
    private readonly repository: Repository<UploadTemplateEntity>,
  ) {}

  async findByType(type: 'outbound' | 'product'): Promise<UploadTemplateEntity[]> {
    return this.repository.find({ where: { type } });
  }

  async findAll(): Promise<UploadTemplateEntity[]> {
    return this.repository.find({ order: { usageCount: 'DESC' } });
  }

  async save(entity: Partial<UploadTemplateEntity>): Promise<UploadTemplateEntity> {
    return this.repository.save(entity);
  }

  async incrementUsage(id: string): Promise<void> {
    await this.repository.update(id, {
      usageCount: () => 'usageCount + 1',
      lastUsedAt: new Date(),
    });
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
