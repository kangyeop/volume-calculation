import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectEntity } from '../entities/project.entity';
import { CreateProjectDto } from '../dto/createProject.dto';
import { UpdateProjectDto } from '../dto/updateProject.dto';
import { ProjectsRepository } from '../repositories/projects.repository';

@Injectable()
export class ProjectsService {
  constructor(private readonly projectsRepository: ProjectsRepository) {}

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
}
