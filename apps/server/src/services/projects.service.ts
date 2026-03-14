import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectStats } from '@wms/types';
import { ProjectEntity } from '../entities/project.entity';
import { PackingResultEntity } from '../entities/packingResult.entity';
import { CreateProjectDto } from '../dto/createProject.dto';
import { UpdateProjectDto } from '../dto/updateProject.dto';
import { ProjectsRepository } from '../repositories/projects.repository';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectsRepository: ProjectsRepository,
    @InjectRepository(PackingResultEntity)
    private readonly packingResultRepository: Repository<PackingResultEntity>,
  ) {}

  async create(createProjectDto: CreateProjectDto): Promise<ProjectEntity> {
    return await this.projectsRepository.create(createProjectDto);
  }

  async findAll(): Promise<ProjectEntity[]> {
    return await this.projectsRepository.findAll();
  }

  async findOne(id: string): Promise<ProjectEntity> {
    const project = await this.projectsRepository.findOne(id);
    if (!project) {
      throw new NotFoundException(`Project with ID "${id}" not found`);
    }
    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto): Promise<ProjectEntity> {
    return await this.projectsRepository.update(id, updateProjectDto);
  }

  async remove(id: string): Promise<void> {
    const removed = await this.projectsRepository.remove(id);
    if (!removed) {
      throw new NotFoundException(`Project with ID "${id}" not found`);
    }
  }

  async getStats(): Promise<ProjectStats[]> {
    const results = await this.packingResultRepository
      .createQueryBuilder('pr')
      .innerJoin(ProjectEntity, 'p', 'p.id = pr.projectId')
      .select('pr.projectId', 'projectId')
      .addSelect('p.name', 'projectName')
      .addSelect('p.createdAt', 'createdAt')
      .addSelect('pr.boxName', 'boxName')
      .addSelect('COUNT(*)', 'boxCount')
      .groupBy('pr.projectId')
      .addGroupBy('p.name')
      .addGroupBy('p.createdAt')
      .addGroupBy('pr.boxName')
      .getRawMany<{ projectId: string; projectName: string; createdAt: string; boxName: string; boxCount: string }>();

    const statsMap = new Map<string, ProjectStats>();

    for (const row of results) {
      if (!statsMap.has(row.projectId)) {
        statsMap.set(row.projectId, {
          projectId: row.projectId,
          projectName: row.projectName,
          createdAt: row.createdAt,
          boxes: [],
        });
      }
      statsMap.get(row.projectId)!.boxes.push({
        boxName: row.boxName,
        boxCount: Number(row.boxCount),
      });
    }

    return Array.from(statsMap.values());
  }
}
