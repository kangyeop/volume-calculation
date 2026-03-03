import { Injectable, NotFoundException } from '@nestjs/common';
import { BoxEntity } from '../entities/box.entity';
import { CreateBoxDto } from '../dto/createBox.dto';
import { UpdateBoxDto } from '../dto/updateBox.dto';
import { BoxesRepository } from '../repositories/boxes.repository';

@Injectable()
export class BoxesService {
  constructor(private readonly boxesRepository: BoxesRepository) {}

  async create(createBoxDto: CreateBoxDto): Promise<BoxEntity> {
    return await this.boxesRepository.create(createBoxDto);
  }

  async findAll(): Promise<BoxEntity[]> {
    return await this.boxesRepository.findAll();
  }

  async findOne(id: string): Promise<BoxEntity> {
    const box = await this.boxesRepository.findOne(id);
    if (!box) {
      throw new NotFoundException(`Box with ID "${id}" not found`);
    }
    return box;
  }

  async update(id: string, updateBoxDto: UpdateBoxDto): Promise<BoxEntity> {
    return await this.boxesRepository.update(id, updateBoxDto);
  }

  async remove(id: string): Promise<void> {
    const removed = await this.boxesRepository.remove(id);
    if (!removed) {
      throw new NotFoundException(`Box with ID "${id}" not found`);
    }
  }
}
