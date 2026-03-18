import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BoxEntity } from '../entities/box.entity';

@Injectable()
export class BoxesRepository {
  constructor(
    @InjectRepository(BoxEntity)
    private readonly repository: Repository<BoxEntity>,
  ) {}

  async create(box: Partial<BoxEntity>): Promise<BoxEntity> {
    const entity = this.repository.create(box);
    return await this.repository.save(entity);
  }

  async findAll(): Promise<BoxEntity[]> {
    return await this.repository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<BoxEntity | null> {
    return await this.repository.findOne({ where: { id } });
  }

  async update(id: string, box: Partial<BoxEntity>): Promise<BoxEntity> {
    await this.repository.update(id, box);
    const entity = await this.findOne(id);
    if (!entity) {
      throw new Error(`Box with ID "${id}" not found`);
    }
    return entity;
  }

  async findByGroupId(groupId: string): Promise<BoxEntity[]> {
    return await this.repository.find({
      where: { boxGroupId: groupId },
      order: { createdAt: 'DESC' },
    });
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
