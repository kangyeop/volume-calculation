import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectEntity } from '../entities/project.entity';

@Injectable()
export class ProjectsRepository {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly repository: Repository<ProjectEntity>,
  ) {}

  async create(project: Partial<ProjectEntity>): Promise<ProjectEntity> {
    const entity = this.repository.create(project);
    return await this.repository.save(entity);
  }

  async findAll(): Promise<ProjectEntity[]> {
    return await this.repository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<ProjectEntity | null> {
    return await this.repository.findOne({ where: { id } });
  }

  async update(id: string, project: Partial<ProjectEntity>): Promise<ProjectEntity> {
    await this.repository.update(id, project);
    const entity = await this.findOne(id);
    if (!entity) {
      throw new Error(`Project with ID "${id}" not found`);
    }
    return entity;
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
