import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BoxGroupEntity } from '../entities/box-group.entity';

@Injectable()
export class BoxGroupsService {
  constructor(
    @InjectRepository(BoxGroupEntity)
    private boxGroupRepository: Repository<BoxGroupEntity>,
  ) {}

  async findAll(): Promise<BoxGroupEntity[]> {
    return this.boxGroupRepository.find({ relations: ['boxes'] });
  }

  async findOne(id: string): Promise<BoxGroupEntity> {
    const group = await this.boxGroupRepository.findOne({
      where: { id },
      relations: ['boxes'],
    });
    if (!group) throw new NotFoundException(`BoxGroup ${id} not found`);
    return group;
  }

  async create(name: string): Promise<BoxGroupEntity> {
    const group = this.boxGroupRepository.create({ name });
    return this.boxGroupRepository.save(group);
  }

  async delete(id: string): Promise<void> {
    const group = await this.findOne(id);
    await this.boxGroupRepository.remove(group);
  }
}
