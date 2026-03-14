import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectEntity } from '../entities/project.entity';
import { PackingResultEntity } from '../entities/packingResult.entity';
import { ProjectsService } from '../services/projects.service';
import { ProjectsController } from '../controllers/projects.controller';
import { ProjectsRepository } from '../repositories/projects.repository';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectEntity, PackingResultEntity])],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsRepository],
  exports: [ProjectsService],
})
export class ProjectsModule {}
